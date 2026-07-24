// Shared between payment-webhook and verify-payment edge functions.
// Keeping this in one place means the "only trust the gateway, check amount and
// currency before marking paid" rule is enforced identically regardless of which
// path (webhook delivery vs. client-triggered verification) discovers the result.

import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export type Provider = "paystack" | "flutterwave";

export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  });
}

/** Looks up the secret key for a school's active (or explicitly requested) gateway. */
export async function getSecretKey(
  admin: SupabaseClient,
  schoolId: string,
  provider: Provider,
): Promise<string> {
  const { data, error } = await admin
    .from("payment_gateway_configs")
    .select("secret_key")
    .eq("school_id", schoolId)
    .eq("provider", provider)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(`No ${provider} configuration found for this school`);
  return data.secret_key as string;
}

export type GatewayTransaction = {
  status: string;
  amount: number; // in the currency's major unit (naira, not kobo)
  currency: string;
  providerReference: string;
  raw: unknown;
};

/** Calls the gateway's own "verify transaction" endpoint — never trust client-reported status. */
export async function verifyWithGateway(
  provider: Provider,
  secretKey: string,
  reference: string,
): Promise<GatewayTransaction> {
  if (provider === "paystack") {
    const res = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    });
    const body = await res.json();
    if (!res.ok || !body.status) throw new Error(body.message ?? "Paystack verification failed");
    const data = body.data ?? {};
    return {
      status: String(data.status ?? ""),
      amount: Number(data.amount ?? 0) / 100,
      currency: String(data.currency ?? "NGN"),
      providerReference: String(data.id ?? reference),
      raw: body,
    };
  }

  const res = await fetch(
    `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } },
  );
  const body = await res.json();
  if (!res.ok || body.status !== "success") throw new Error(body.message ?? "Flutterwave verification failed");
  const data = body.data ?? {};
  return {
    status: String(data.status ?? ""),
    amount: Number(data.amount ?? 0),
    currency: String(data.currency ?? "NGN"),
    providerReference: String(data.id ?? reference),
    raw: body,
  };
}

export type ApplyResult = { paymentId: string | null; status: string };

/**
 * Idempotently flips a `payments` row to paid/failed based on a verified gateway
 * transaction. Safe to call more than once for the same transaction (webhook +
 * client verify racing each other) — the final `.eq("status", "pending")` guard
 * means only the first caller to reach it actually changes the row.
 */
export async function applyVerifiedResult(
  admin: SupabaseClient,
  provider: Provider,
  reference: string,
  txn: GatewayTransaction,
  successValues: string[],
): Promise<ApplyResult> {
  const { data: payment, error } = await admin.from("payments").select("*").eq("reference", reference).maybeSingle();
  if (error) throw new Error(error.message);
  if (!payment) throw new Error(`Payment for reference ${reference} not found`);

  if (payment.status !== "pending") {
    return { paymentId: payment.id, status: payment.status };
  }

  const isSuccess = successValues.includes(txn.status.toLowerCase());
  const amountMatches = Math.abs(Number(payment.amount) - txn.amount) < 0.01;
  const currencyMatches = payment.currency === txn.currency;
  const nextStatus = isSuccess && amountMatches && currencyMatches ? "paid" : "failed";

  const { error: updateErr } = await admin
    .from("payments")
    .update({
      status: nextStatus,
      provider,
      provider_reference: txn.providerReference,
      gateway_response: txn.raw,
      webhook_processed_at: new Date().toISOString(),
      paid_at: nextStatus === "paid" ? new Date().toISOString() : payment.paid_at,
    })
    .eq("id", payment.id)
    .eq("status", "pending");

  if (updateErr) throw new Error(updateErr.message);

  return { paymentId: payment.id, status: nextStatus };
}

export const SUCCESS_VALUES: Record<Provider, string[]> = {
  paystack: ["success"],
  flutterwave: ["successful"],
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
