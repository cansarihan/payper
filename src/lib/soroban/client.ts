import {
  Account,
  Address,
  BASE_FEE,
  Contract,
  Keypair,
  Networks,
  TransactionBuilder,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
} from "@stellar/stellar-sdk";

export interface SorobanEnv {
  rpcUrl: string;
  networkPassphrase: string;
}

export const sorobanEnv = (): SorobanEnv => ({
  rpcUrl: process.env.PUBLIC_RPC_URL ?? "https://soroban-testnet.stellar.org",
  networkPassphrase: process.env.PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET,
});

const server = (env: SorobanEnv) => new rpc.Server(env.rpcUrl, { allowHttp: true });

/**
 * A read that costs nothing.
 *
 * Simulation runs the contract without submitting, so every view in the product
 * is a simulate against a throwaway source account. Nothing is signed and no
 * fee is paid, which is what lets the interface poll prices.
 */
export async function read<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
  env = sorobanEnv(),
): Promise<T> {
  const srv = server(env);
  // Any account works as a simulation source; this one is a constant so a read
  // never depends on which keys the deployment happens to hold.
  const account = new Account(
    "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    "0",
  );

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: env.networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(30)
    .build();

  const sim = await srv.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new SorobanCallError(`${method} simülasyonu başarısız: ${sim.error}`, method);
  }
  const retval = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return (retval ? scValToNative(retval) : undefined) as T;
}

/** A write: prepare, sign, submit, wait for the ledger to close on it. */
export async function invoke<T = unknown>(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  signer: Keypair,
  env = sorobanEnv(),
): Promise<{ value: T; hash: string }> {
  const srv = server(env);
  const account = await srv.getAccount(signer.publicKey());
  const built = new TransactionBuilder(account, {
    // Soroban fees are dominated by resource cost, not the base fee; a generous
    // ceiling avoids a retry loop on a busy ledger.
    fee: (Number(BASE_FEE) * 10_000).toString(),
    networkPassphrase: env.networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(60)
    .build();

  const prepared = await srv.prepareTransaction(built);
  prepared.sign(signer);
  const sent = await srv.sendTransaction(prepared);
  if (sent.status === "ERROR") {
    throw new SorobanCallError(
      `${method} reddedildi: ${sent.errorResult?.toXDR("base64") ?? "bilinmeyen hata"}`,
      method,
    );
  }

  const deadline = Date.now() + 90_000;
  for (;;) {
    const got = await srv.getTransaction(sent.hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        value: (got.returnValue ? scValToNative(got.returnValue) : undefined) as T,
        hash: sent.hash,
      };
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new SorobanCallError(`${method} başarısız: ${JSON.stringify(got.resultXdr)}`, method);
    }
    if (Date.now() > deadline) {
      throw new SorobanCallError(`${method} zaman aşımına uğradı (hash ${sent.hash})`, method);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

export class SorobanCallError extends Error {
  constructor(
    message: string,
    readonly method: string,
  ) {
    super(message);
    this.name = "SorobanCallError";
  }
}

// ── error attribution ───────────────────────────────────────────────────────

/**
 * Name the error a host failure carries.
 *
 * A failure inside a contract we call — the token, say — is escalated with
 * *its* code, which collides with our own enum: the token's #10 is a balance
 * problem, ours is treasury liquidity. So attribute by the diagnostic text
 * first and only fall back to the number.
 */
export function contractErrorName(message: string): string | undefined {
  for (const [needle, name] of TOKEN_ERRORS) {
    if (message.includes(needle)) return name;
  }
  const code = /Error\(Contract, #(\d+)\)/.exec(message)?.[1];
  return code ? INVOICE_ERRORS[Number(code)] : undefined;
}

const TOKEN_ERRORS: [string, string][] = [
  ["resulting balance is not within the allowed range", "TokenBalanceTooLow"],
  ["trustline entry is missing for account", "TokenTrustlineMissing"],
  ["trustline doesn't have sufficient limit", "TokenTrustlineLimit"],
  ["trustline is not authorized", "TokenTrustlineUnauthorized"],
];

/** Mirrors `Error` in contracts/invoice/src/types.rs. */
export const INVOICE_ERRORS: Record<number, string> = {
  1: "AlreadyInitialized",
  2: "NotInitialized",
  3: "Unauthorized",
  4: "EttnAlreadyUsed",
  5: "InvoiceNotFound",
  6: "InvalidStatus",
  7: "InvalidAmount",
  8: "InvalidDueDate",
  9: "Oversubscribed",
  10: "InsufficientLiquidity",
  11: "NotWhitelisted",
  12: "NotYetDue",
  13: "NoQuoteAccepted",
  14: "QuoteExpired",
};

export const ERROR_MESSAGES: Record<string, string> = {
  EttnAlreadyUsed: "Bu ETTN daha önce finanse edilmiş. Aynı alacak ikinci kez satılamaz.",
  InvalidStatus: "Fatura bu işlem için uygun durumda değil.",
  Unauthorized: "Bu işlemi yapma yetkiniz yok.",
  InvoiceNotFound: "Fatura bulunamadı.",
  InvalidAmount: "Tutar geçersiz.",
  InvalidDueDate: "Vade tarihi geçersiz.",
  Oversubscribed: "Bu tutar faturanın kalan ihtiyacını aşıyor.",
  InsufficientLiquidity: "Hazinede bu ödemeyi karşılayacak likidite yok.",
  NotWhitelisted: "Bu büyüklükte bir dilim için lisanslı fonlayıcı olmanız gerekir.",
  NotYetDue: "Faturanın vadesi ve ek süresi henüz geçmedi.",
  NoQuoteAccepted: "Satıcı henüz bir iskonto teklifini kabul etmedi.",
  QuoteExpired:
    "Kabul edilen teklifin süresi doldu. İskonto o anki kurdan hesaplanmıştı; satıcının güncel fiyattan yeni bir teklif kabul etmesi gerekiyor.",
  TokenBalanceTooLow: "Gönderen hesabın USDC bakiyesi bu tutar için yetersiz.",
  TokenTrustlineMissing: "Hesapta USDC trustline'ı yok.",
};

// ── argument helpers ────────────────────────────────────────────────────────

export const u32 = (n: number) => xdr.ScVal.scvU32(n);
export const u64 = (n: bigint | number) => xdr.ScVal.scvU64(xdr.Uint64.fromString(String(n)));
export const bool = (b: boolean) => xdr.ScVal.scvBool(b);
export const sym = (s: string) => xdr.ScVal.scvSymbol(s);
export const str = (s: string) => xdr.ScVal.scvString(s);
export const addr = (a: string) => new Address(a).toScVal();
export const bytes32 = (b: Buffer) => xdr.ScVal.scvBytes(b);

export const i128 = (n: bigint | number) => {
  const v = BigInt(n);
  return xdr.ScVal.scvI128(
    new xdr.Int128Parts({
      // `new xdr.Int64(...)` is not constructible in this SDK; the string form is.
      hi: xdr.Int64.fromString(String(v >> 64n)),
      lo: xdr.Uint64.fromString(String(v & 0xffffffffffffffffn)),
    }),
  );
};

/**
 * A Rust enum variant carrying one value.
 *
 * `nativeToScVal` renders these as a map, which the contract rejects; the wire
 * form is a vector whose first element is the variant name.
 */
export const enumVariant = (variant: string, value: xdr.ScVal) =>
  xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant), value]);

export const otherAsset = (code: string) => enumVariant("Other", xdr.ScVal.scvSymbol(code));

export const option = (v: xdr.ScVal | null) => (v === null ? xdr.ScVal.scvVoid() : v);

export { nativeToScVal, scValToNative, xdr };
