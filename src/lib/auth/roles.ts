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
  /** Display name. Optional, so older sessions stay valid. */
  name?: string;
  role: SessionRole;
  method: AuthMethod;
  /** Present when a passkey opened the session. */
  credentialId?: string;
  /** A browser wallet proved alongside the session; a passkey user may link
   *  one later. */
  wallet?: LinkedWallet;
  issuedAt: number;
}

export const ROLE_LABEL: Record<SessionRole, string> = {
  seller: "KOBİ",
  buyer: "Alıcı",
  funder: "Fonlayıcı",
};

/** Landing screen per role. */
export const ROLE_HOME: Record<SessionRole, string> = {
  seller: "upload",
  buyer: "buyer",
  funder: "board",
};
