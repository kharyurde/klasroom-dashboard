import { supabase } from "./supabase";

/**
 * Two-factor auth on top of Supabase Auth's built-in MFA (TOTP). No custom schema
 * needed — Supabase tracks enrolled factors and assurance level itself; this module
 * just wraps the calls with app-friendly types and error handling.
 */

export type MfaFactor = {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: "verified" | "unverified";
  created_at: string;
};

export async function listMfaFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return (data?.totp as MfaFactor[]) ?? [];
}

export type TotpEnrollment = {
  factorId: string;
  qrCode: string; // data:image/svg+xml;... — render directly in an <img>
  secret: string; // manual-entry fallback for authenticator apps
};

export async function enrollTotp(friendlyName?: string): Promise<TotpEnrollment> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: friendlyName ?? "Authenticator app",
  });
  if (error) throw new Error(error.message);
  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifyTotpEnrollment(factorId: string, code: string): Promise<void> {
  const { data: challenge, error: challengeErr } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeErr) throw new Error(challengeErr.message);

  const { error: verifyErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyErr) throw new Error(verifyErr.message);
}

export async function unenrollFactor(factorId: string): Promise<void> {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw new Error(error.message);
}

export type AssuranceLevel = { current: string | null; next: string | null };

export async function getAssuranceLevel(): Promise<AssuranceLevel> {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw new Error(error.message);
  return { current: data?.currentLevel ?? null, next: data?.nextLevel ?? null };
}

/** True once the user has completed a step-up TOTP challenge for this session. */
export async function isMfaSatisfied(): Promise<boolean> {
  const level = await getAssuranceLevel();
  if (level.next === "aal1") return true; // no factors enrolled — nothing to satisfy
  return level.current === level.next;
}
