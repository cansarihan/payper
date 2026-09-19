import { NextRequest } from "next/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";

import { activatePasskeyAccount } from "@/lib/auth/activate";
import { consumeChallenge, issueChallenge } from "@/lib/auth/challenge";
import {
  allPasskeys,
  findPasskey,
  keypairForCredential,
  publicHost,
  relyingParty,
  rememberPasskey,
} from "@/lib/auth/passkey";
import type { SessionRole } from "@/lib/auth/roles";
import { writeSession } from "@/lib/auth/session";
import { clientKey, rateLimit } from "@/lib/server/guard";
import { fail, ok } from "@/lib/server/respond";

export const dynamic = "force-dynamic";

const ROLES: SessionRole[] = ["seller", "buyer", "funder"];
const asRole = (r: unknown): SessionRole =>
  ROLES.includes(r as SessionRole) ? (r as SessionRole) : "funder";

/**
 * Passkey registration and login.
 *
 * `step` selects which half of the WebAuthn ceremony to run. The challenge
 * comes from the same single-use store the wallet flow uses, so a passkey
 * assertion cannot be replayed either.
 */
export async function POST(req: NextRequest) {
  try {
    rateLimit(clientKey(req, "passkey"), 20, 60_000);
    const body = (await req.json()) as {
      name?: string;
      step: "register-options" | "register" | "login-options" | "login";
      /** Allow the cross-device QR flow. Off by default; see below. */
      anyDevice?: boolean;
      label?: string;
      role?: SessionRole;
      nonce?: string;
      response?: RegistrationResponseJSON | AuthenticationResponseJSON;
    };
    const { rpID, rpName, origin } = relyingParty(publicHost(req.headers, req.nextUrl.host));

    if (body.step === "register-options") {
      // The challenge doubles as the ceremony nonce. The address field is
      // unused here because the credential is what identifies the user.
      const challenge = issueChallenge("passkey");
      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: body.label?.trim() || "payper user",
        userDisplayName: body.label?.trim() || "payper user",
        challenge: Buffer.from(challenge.nonce, "utf8"),
        attestationType: "none",
        // Two minutes rather than the default one. The cross-device flow needs
        // Bluetooth to pair and a phone to be unlocked, and a minute is not
        // always enough for someone doing it for the first time.
        timeout: 120_000,
        authenticatorSelection: {
          // This device's own biometric, unless the caller asks otherwise.
          // The product's promise is "like unlocking your phone", and the
          // cross-device QR is a different, flakier thing wearing the same
          // name — it needs Bluetooth on both ends and hangs when either is
          // unavailable, which is a poor first impression to hand someone.
          authenticatorAttachment: body.anyDevice ? undefined : "platform",
          residentKey: "preferred",
          userVerification: "preferred",
        },
        excludeCredentials: allPasskeys().map((p) => ({ id: p.credentialId })),
      });
      return ok({ nonce: challenge.nonce, options });
    }

    if (body.step === "register") {
      const challenge = consumeChallenge(body.nonce ?? "");
      if (!challenge) return fail(new Error("The challenge is invalid or has expired"), 401);

      const verification = await verifyRegistrationResponse({
        response: body.response as RegistrationResponseJSON,
        expectedChallenge: Buffer.from(challenge.nonce, "utf8").toString("base64url"),
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
      });
      if (!verification.verified || !verification.registrationInfo) {
        return fail(new Error("The passkey registration did not verify"), 401);
      }

      const { credential } = verification.registrationInfo;
      const keypair = keypairForCredential(credential.id);
      rememberPasskey({
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64url"),
        counter: credential.counter,
        address: keypair.publicKey(),
        label: body.label?.trim() || "payper passkey",
        createdAt: Date.now(),
      });

      const session = {
        address: keypair.publicKey(),
        name: displayName(body.name) ?? displayName(body.label),
        role: asRole(body.role),
        method: "passkey" as const,
        credentialId: credential.id,
        issuedAt: Date.now(),
      };
      await writeSession(session);
      // Signing in is the moment the account should start existing. It is not
      // awaited: the person is already signed in, and a friendbot round trip
      // has no business standing between them and the panel.
      void activateInBackground(credential.id);
      return ok({ session, address: keypair.publicKey() });
    }

    if (body.step === "login-options") {
      if (allPasskeys().length === 0) {
        return fail(new Error("No passkey is registered on this server yet"), 404);
      }
      const challenge = issueChallenge("passkey");
      const options = await generateAuthenticationOptions({
        rpID,
        challenge: Buffer.from(challenge.nonce, "utf8"),
        timeout: 120_000,
        userVerification: "preferred",
        allowCredentials: allPasskeys().map((p) => ({ id: p.credentialId })),
      });
      return ok({ nonce: challenge.nonce, options });
    }

    if (body.step === "login") {
      const challenge = consumeChallenge(body.nonce ?? "");
      if (!challenge) return fail(new Error("The challenge is invalid or has expired"), 401);

      const assertion = body.response as AuthenticationResponseJSON;
      const record = findPasskey(assertion.id);
      if (!record) return fail(new Error("That passkey is not recognised"), 404);

      const verification = await verifyAuthenticationResponse({
        response: assertion,
        expectedChallenge: Buffer.from(challenge.nonce, "utf8").toString("base64url"),
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: record.credentialId,
          publicKey: Buffer.from(record.publicKey, "base64url"),
          counter: record.counter,
        },
        requireUserVerification: false,
      });
      if (!verification.verified) return fail(new Error("The passkey did not verify"), 401);

      // A rising counter is how a cloned authenticator is caught.
      rememberPasskey({ ...record, counter: verification.authenticationInfo.newCounter });

      const session = {
        address: record.address,
        // Returning users keep the name they registered with unless they sent
        // a new one.
        name: displayName(body.name) ?? displayName(record.label),
        role: asRole(body.role),
        method: "passkey" as const,
        credentialId: record.credentialId,
        issuedAt: Date.now(),
      };
      await writeSession(session);
      void activateInBackground(record.credentialId);
      return ok({ session, address: record.address });
    }

    return fail(new Error(`Unknown step: ${String(body.step)}`), 422);
  } catch (e) {
    return fail(e);
  }
}

/** Credentials registered on this server, for the connect screen. */
export async function GET() {
  return ok({
    passkeys: allPasskeys().map((p) => ({
      credentialId: p.credentialId,
      address: p.address,
      label: p.label,
      createdAt: p.createdAt,
    })),
  });
}

/**
 * Create the account without making anyone wait for it.
 *
 * This runs in a persistent Node process, so a floating promise finishes. A
 * failure is logged rather than swallowed, and the wallet screen still offers
 * the manual path when it finds the account missing.
 */
function activateInBackground(credentialId: string) {
  return activatePasskeyAccount(credentialId).catch((e: unknown) => {
    console.warn("passkey account activation failed:", (e as Error).message);
  });
}

/** A display name, trimmed and bounded. Empty means fall back to the role. */
function displayName(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const name = raw.trim().replace(/\s+/g, " ").slice(0, 48);
  return name.length >= 2 ? name : undefined;
}
