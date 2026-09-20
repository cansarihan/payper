/**
 * Stellar Wallets Kit, loaded on demand.
 *
 * Every import is dynamic: the kit writes theme variables onto documentElement
 * at import time, which desynchronises server and client markup if it loads on
 * a page that does not need it.
 *
 * The kit's surface is static, and wallet modules are imported individually.
 */
export interface Connected {
  address: string;
}

let ready = false;

async function ensureInit() {
  const { StellarWalletsKit } = await import("@creit.tech/stellar-wallets-kit");
  if (ready) return StellarWalletsKit;

  const { Networks } = await import("@creit.tech/stellar-wallets-kit/types");
  const { FreighterModule } = await import("@creit.tech/stellar-wallets-kit/modules/freighter");
  const { xBullModule } = await import("@creit.tech/stellar-wallets-kit/modules/xbull");
  const { AlbedoModule } = await import("@creit.tech/stellar-wallets-kit/modules/albedo");

  StellarWalletsKit.init({
    modules: [new FreighterModule(), new xBullModule(), new AlbedoModule()],
    network:
      (process.env.PUBLIC_STELLAR_NETWORK ?? "testnet") === "mainnet"
        ? Networks.PUBLIC
        : Networks.TESTNET,
  });
  ready = true;
  return StellarWalletsKit;
}

export async function connectWallet(): Promise<Connected> {
  const kit = await ensureInit();
  const { address } = await kit.authModal();
  return { address };
}

/**
 * Sign the login challenge.
 *
 * Returns what the wallet says it signed alongside the signature, so the server
 * can check the payload against the challenge it issued rather than trusting
 * the wallet's framing.
 */
export async function signLoginMessage(
  message: string,
  address: string,
): Promise<{ signature: string; payload: string }> {
  const kit = await ensureInit();
  const { signedMessage } = await kit.signMessage(message, { address });
  return { signature: signedMessage, payload: message };
}

/**
 * Sign a prepared transaction in the user's own wallet.
 *
 * This is the half that was missing: the wallet proved who was asking at login,
 * but the transaction was signed by a key this server holds. Now the envelope
 * goes to the wallet, the extension shows what it authorises, and nothing is
 * submitted unless the person approves it there.
 */
export async function signPreparedTransaction(
  xdr: string,
  address: string,
  networkPassphrase: string,
): Promise<string> {
  const kit = await ensureInit();
  const { signedTxXdr } = await kit.signTransaction(xdr, { address, networkPassphrase });
  return signedTxXdr;
}

export async function disconnectWallet(): Promise<void> {
  const kit = await ensureInit();
  await kit.disconnect();
}
