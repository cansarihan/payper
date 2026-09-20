import { addr, i128, prepareForSigner, u32 } from "@/lib/soroban/client";

import { getInvoice, isWhitelisted, setWhitelist } from "./invoices";

export type WalletAction = "acknowledge" | "accept_quote" | "fund";

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
export async function prepareInvoiceCall(opts: {
  action: WalletAction;
  invoiceId: number;
  signer: string;
  amountUsdc?: number;
}): Promise<{ xdr: string; method: string; summary: string }> {
  const invoice = await getInvoice(opts.invoiceId);

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
      xdr: await prepareForSigner(CONTRACT(), "acknowledge", [u32(opts.invoiceId)], opts.signer),
      method: "acknowledge",
      summary: `Acknowledge invoice #${opts.invoiceId} on chain`,
    };
  }

  if (opts.action === "accept_quote") {
    if (invoice.seller !== opts.signer) {
      throw new Error("Only the supplier named on the invoice can accept a quote for it.");
    }
    return {
      xdr: await prepareForSigner(CONTRACT(), "accept_quote", [u32(opts.invoiceId)], opts.signer),
      method: "accept_quote",
      summary: `Lock the discount on invoice #${opts.invoiceId}`,
    };
  }

  const usdc = opts.amountUsdc ?? 0;
  if (!Number.isFinite(usdc) || usdc <= 0) throw new Error("A positive USDC amount is required");
  const amount = BigInt(Math.round(usdc * 1e7));

  if (invoice.status !== "acknowledged") {
    throw new Error(`This invoice is ${invoice.status}; funding is only open once the buyer has acknowledged it.`);
  }
  const remaining = BigInt(invoice.lockedPayoutUsdc) - BigInt(invoice.fundedAmount);
  if (amount > remaining) {
    throw new Error(
      `That is more than the invoice still needs — ${(Number(remaining) / 1e7).toFixed(7)} USDC remains.`,
    );
  }

  // A tranche over the threshold needs a licensed funder. The whitelist is the
  // platform's call, not the funder's, so it stays a server-signed action.
  if (!(await isWhitelisted(opts.signer))) await setWhitelist(opts.signer, true);

  return {
    xdr: await prepareForSigner(
      CONTRACT(),
      "fund",
      [u32(opts.invoiceId), addr(opts.signer), i128(amount)],
      opts.signer,
    ),
    method: "fund",
    summary: `Fund invoice #${opts.invoiceId} with ${usdc.toFixed(7)} USDC`,
  };
}
