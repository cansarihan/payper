/** Client-safe: no node imports, so components can use these too. */

export type SessionRole = "seller" | "buyer" | "funder";
export type AuthMethod = "wallet" | "passkey" | "demo";

export interface LinkedWallet {
  address: string;
  walletId: string;
  walletName: string;
  linkedAt: number;
}

export interface Session {
  /** The address that will appear in `require_auth`. */
  address: string;
  /**
   * What to call this person on screen.
   *
   * A role is not a name: showing "KOBİ" where a product shows who you are
   * reads like a placeholder. Optional, so an older session stays valid.
   */
  name?: string;
  role: SessionRole;
  method: AuthMethod;
  /** Present when a passkey opened the session. */
  credentialId?: string;
  /**
   * A browser wallet proved alongside this session.
   *
   * Signing in with a wallet fills this immediately; signing in with a passkey
   * does not — so a passkey user can link one later, and until they do the
   * wallet screen says so rather than showing someone else's address.
   */
  wallet?: LinkedWallet;
  issuedAt: number;
}

export const ROLE_LABEL: Record<SessionRole, string> = {
  seller: "KOBİ",
  buyer: "Alıcı",
  funder: "Fonlayıcı",
};

/** Which screens each role starts on; the rest stay reachable. */
export const ROLE_HOME: Record<SessionRole, string> = {
  seller: "upload",
  buyer: "buyer",
  funder: "board",
};
