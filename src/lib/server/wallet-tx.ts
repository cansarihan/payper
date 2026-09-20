import { Asset, BASE_FEE, Horizon, Networks, Operation, TransactionBuilder } from "@stellar/stellar-sdk";

import { addr, bytes32, i128, prepareForSigner, sym, u32, u64 } from "@/lib/soroban/client";

import { getInvoice, isWhitelisted, setWhitelist } from "./invoices";

export type WalletAction = "trustline" | "acknowledge" | "accept_quote" | "fund";

const horizon = () =>
  new Horizon.Server(process.env.PUBLIC_HORIZON_URL ?? "https://horizon-testnet.stellar.org");

const usdc = () =>
  new Asset(
    process.env.PUBLIC_ANCHOR_ASSET_CODE ?? "USDC",
    process.env.PUBLIC_USDC_ISSUER ?? "",
  );

/** What the wallet holds of the asset, and whether it can hold it at all. */
async function usdcPosition(address: string): Promise<{ trustline: boolean; balance: number }> {
  const asset = usdc();
  const account = await horizon().loadAccount(address);
  const line = account.balances.find(
    (b) => "asset_code" in b && b.asset_code === asset.code && b.asset_issuer === asset.issuer,
  );
  return { trustline: Boolean(line), balance: line ? Number((line as { balance: string }).balance) : 0 };
}

/**
 * A trustline for the wallet to sign itself.
 *
 * A fresh account cannot hold USDC until it says it will, and that statement is
 * the account holder's to make — so it is prepared here and signed there, like
 * every other call on this path.
 */
async function prepareTrustline(address: string) {
  const { trustline } = await usdcPosition(address);
  if (trustline) throw new Error("This wallet already holds a USDC trustline.");
  const account = await horizon().loadAccount(address);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: process.env.PUBLIC_NETWORK_PASSPHRASE ?? Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdc() }))
    .setTimeout(180)
    .build();
  return {
    xdr: tx.toXDR(),
    method: "change_trust",
    summary: `Open a ${usdc().code} trustline on this wallet`,
  };
}

const CONTRACT = () => {
  const id = process.env.PUBLIC_INVOICE_CONTRACT_ID;
  if (!id) throw new Error("PUBLIC_INVOICE_CONTRACT_ID is not set");
  return id;
};

/**
 * Prepare a contract call for a wallet to sign, and say what it will do.
 *
 * The checks here are the ones worth catching before a wallet prompt: a call
 * that the contract would refuse is a confusing dialog followed by a failure,
 * so it is refused with a sentence instead.
 */
/**
 * Registration for the supplier to sign themselves.
 *
 * The document is parsed and checked on the server, so none of these values are
 * taken from the caller — only the signature is theirs. Naming the wallet as the
 * seller is what later lets that same wallet lock the price, because the
 * contract asks the seller on the invoice to authorise it.
 */
export async function prepareRegister(opts: {
  signer: string;
  buyerAddress?: string;
  ettnHashHex: string;
  docHashHex: string;
  sellerTaxId: string;
  buyerTaxId: string;
  amountFiatMinor: bigint;
  faceUsdc: bigint;
  dueDate: number;
  demoBuyer: string;
}): Promise<{ xdr: string; method: string; summary: string }> {
  return {
    xdr: await prepareForSigner(
      CONTRACT(),
      "register",
      [
        addr(opts.signer),
        addr(opts.buyerAddress ?? opts.demoBuyer),
        bytes32(Buffer.from(opts.ettnHashHex, "hex")),
        bytes32(Buffer.from(opts.docHashHex, "hex")),
        sym(opts.sellerTaxId),
        sym(opts.buyerTaxId),
        i128(opts.amountFiatMinor),
        i128(opts.faceUsdc),
        u64(opts.dueDate),
      ],
      opts.signer,
    ),
    method: "register",
    summary: "Register this invoice on chain, as its supplier",
  };
}

export async function prepareInvoiceCall(opts: {
  action: WalletAction;
  invoiceId?: number;
  signer: string;
  amountUsdc?: number;
}): Promise<{ xdr: string; method: string; summary: string }> {
  if (opts.action === "trustline") return prepareTrustline(opts.signer);

  if (!opts.invoiceId) throw new Error("invoiceId is required for this action");
  const invoiceId = opts.invoiceId;
  const invoice = await getInvoice(invoiceId);

  if (opts.action === "acknowledge") {
    if (invoice.buyer !== opts.signer) {
      throw new Error(
        "Only the address written on the invoice can acknowledge it. This wallet is not that address.",
      );
    }
    if (invoice.status !== "registered") {
      throw new Error(`This invoice is ${invoice.status}; acknowledgement is only open while registered.`);
    }
    return {
      xdr: await prepareForSigner(CONTRACT(), "acknowledge", [u32(invoiceId)], opts.signer),
      method: "acknowledge",
      summary: `Acknowledge invoice #${invoiceId} on chain`,
    };
  }

  if (opts.action === "accept_quote") {
    if (invoice.seller !== opts.signer) {
      throw new Error("Only the supplier named on the invoice can accept a quote for it.");
    }
    return {
      xdr: await prepareForSigner(CONTRACT(), "accept_quote", [u32(invoiceId)], opts.signer),
      method: "accept_quote",
      summary: `Lock the discount on invoice #${invoiceId}`,
    };
  }

  const usdcAmount = opts.amountUsdc ?? 0;
  if (!Number.isFinite(usdcAmount) || usdcAmount <= 0) {
    throw new Error("A positive USDC amount is required");
  }
  const amount = BigInt(Math.round(usdcAmount * 1e7));

  if (invoice.status !== "acknowledged") {
    throw new Error(`This invoice is ${invoice.status}; funding is only open once the buyer has acknowledged it.`);
  }
  const remaining = BigInt(invoice.lockedPayoutUsdc) - BigInt(invoice.fundedAmount);
  if (amount > remaining) {
    throw new Error(
      `That is more than the invoice still needs — ${(Number(remaining) / 1e7).toFixed(7)} USDC remains.`,
    );
  }

  // Check what the wallet can actually do before a prompt appears. The contract
  // would refuse both of these, but as a token error inside a dialog the person
  // has already approved — which explains nothing.
  const pos = await usdcPosition(opts.signer);
  if (!pos.trustline) {
    throw new Error(
      `This wallet has no ${usdc().code} trustline yet, so it cannot hold the asset. ` +
        "Open one first — the button below prepares it for you to sign.",
    );
  }
  if (pos.balance < usdcAmount) {
    throw new Error(
      `This wallet holds ${pos.balance.toFixed(7)} ${usdc().code} and the tranche needs ` +
        `${usdcAmount.toFixed(7)}. Fund the wallet, or choose a smaller amount.`,
    );
  }

  // A tranche over the threshold needs a licensed funder. The whitelist is the
  // platform's call, not the funder's, so it stays a server-signed action.
  if (!(await isWhitelisted(opts.signer))) await setWhitelist(opts.signer, true);

  return {
    xdr: await prepareForSigner(
      CONTRACT(),
      "fund",
      [u32(invoiceId), addr(opts.signer), i128(amount)],
      opts.signer,
    ),
    method: "fund",
    summary: `Fund invoice #${invoiceId} with ${usdcAmount.toFixed(7)} USDC`,
  };
}
