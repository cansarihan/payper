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

/** Read-only call via simulation. Nothing is signed and no fee is paid. */
export async function read<T>(
  contractId: string,
  method: string,
  args: xdr.ScVal[] = [],
  env = sorobanEnv(),
): Promise<T> {
  const srv = server(env);
  // Constant simulation source, so reads do not depend on deployment keys.
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
    throw new SorobanCallError(`${method} simulation failed: ${sim.error}`, method);
  }
  const retval = (sim as rpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return (retval ? scValToNative(retval) : undefined) as T;
}

/** Prepare, sign, submit, await inclusion. */
/**
 * Build and simulate a call the caller will sign themselves.
 *
 * `invoke` signs with a key this process holds. This does not: it returns the
 * prepared envelope so the address that has to authorise the call can sign it
 * in their own wallet. Because the authorising address is also the transaction
 * source, the envelope signature satisfies `require_auth` on it and no separate
 * auth entry has to be signed.
 */
export async function prepareForSigner(
  contractId: string,
  method: string,
  args: xdr.ScVal[],
  sourcePublicKey: string,
  env = sorobanEnv(),
): Promise<string> {
  const srv = server(env);
  const account = await srv.getAccount(sourcePublicKey);
  const built = new TransactionBuilder(account, {
    fee: (Number(BASE_FEE) * 10_000).toString(),
    networkPassphrase: env.networkPassphrase,
  })
    .addOperation(new Contract(contractId).call(method, ...args))
    .setTimeout(180)
    .build();
  return (await srv.prepareTransaction(built)).toXDR();
}

/** Submit an envelope somebody else signed, and wait for the ledger. */
export async function submitSigned<T = unknown>(
  signedXdr: string,
  method: string,
  env = sorobanEnv(),
): Promise<{ value: T; hash: string }> {
  const srv = server(env);
  const tx = TransactionBuilder.fromXDR(signedXdr, env.networkPassphrase);
  const sent = await srv.sendTransaction(tx);
  if (sent.status === "ERROR") {
    throw new SorobanCallError(
      `${method} was rejected: ${sent.errorResult?.toXDR("base64") ?? "unknown error"}`,
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
      throw new SorobanCallError(`${method} failed: ${JSON.stringify(got.resultXdr)}`, method);
    }
    if (Date.now() > deadline) {
      throw new SorobanCallError(`${method} did not confirm in time`, method);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
}

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
    // Resource cost dominates; a high ceiling avoids retries.
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
      throw new SorobanCallError(`${method} failed: ${JSON.stringify(got.resultXdr)}`, method);
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
 * Name the error behind a host failure.
 *
 * Sub-contract errors escalate with their own code, which collides with ours —
 * the token's #10 is a balance problem, ours is treasury liquidity — so match
 * the diagnostic text before falling back to the number.
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
  15: "NoClaimToTransfer",
  16: "ClaimNotTransferable",
};

export const ERROR_MESSAGES: Record<string, string> = {
  EttnAlreadyUsed: "This ETTN has already been financed. The same receivable cannot be sold twice.",
  InvalidStatus: "The invoice is not in a state that allows this.",
  Unauthorized: "You are not allowed to perform this operation.",
  InvoiceNotFound: "No such invoice.",
  InvalidAmount: "The amount is invalid.",
  InvalidDueDate: "The due date is invalid.",
  Oversubscribed: "That amount exceeds what the invoice still needs.",
  InsufficientLiquidity: "The treasury cannot release this payout.",
  NotWhitelisted: "A tranche this size requires a licensed funder.",
  NotYetDue: "The invoice is not past its due date and grace period yet.",
  NoQuoteAccepted: "The supplier has not accepted a discount quote yet.",
  QuoteExpired:
    "The accepted quote has expired. Its discount was computed from the rate at the time; the supplier has to accept a new quote at the current price.",
  NoClaimToTransfer: "This address holds no claim on the invoice, or not enough of one.",
  ClaimNotTransferable: "A claim can only move while the invoice is still outstanding.",
  TokenBalanceTooLow: "The sending account does not hold enough USDC for this amount.",
  TokenTrustlineMissing: "The account has no USDC trustline.",
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

/** Enum variant with a payload. `nativeToScVal` renders these as a map, which
 *  the contract rejects; the wire form is a vector. */
export const enumVariant = (variant: string, value: xdr.ScVal) =>
  xdr.ScVal.scvVec([xdr.ScVal.scvSymbol(variant), value]);

export const otherAsset = (code: string) => enumVariant("Other", xdr.ScVal.scvSymbol(code));

export const option = (v: xdr.ScVal | null) => (v === null ? xdr.ScVal.scvVoid() : v);

export { nativeToScVal, scValToNative, xdr };
