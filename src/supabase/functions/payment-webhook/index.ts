// Klasroom payment webhook handler (Supabase Edge Function, Deno runtime).
//
// Deploy: supabase functions deploy payment-webhook --no-verify-jwt
// Configure two separate endpoint URLs with your providers, each hitting this
// same function with a `provider` query param:
//   Flutterwave: https://<project>.functions.supabase.co/payment-webhook?provider=flutterwave
//   Paystack:    https://<project>.functions.supabase.co/payment-webhook?provider=paystack
//
// This is the backstop of record: even if a client never calls verify-payment
// (tab closed mid-checkout, popup blocked, etc.) the gateway's webhook eventually
// arrives and settles the payment. It never trusts the webhook body's status by
// itself — it re-verifies against the gateway's REST API with the school's secret
// key, then applies the same idempotent update used by verify-payment.
//
// Required per-project secrets (supabase secrets set ...):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (auto-injected)
//   FLUTTERWAVE_SECRET_HASH — the "secret hash" configured in the Flutterwave dashboard
//   PAYSTACK_WEBHOOK_SECRET — Paystack's secret key, used to HMAC-verify x-paystack-signature
//     (Paystack signs webhooks with the account's own secret key, not a separate one)

import { adminClient, getSecretKey, verifyWithGateway, applyVerifiedResult, SUCCESS_VALUES, json, type Provider } from "../_shared/gateway.ts";

const FLUTTERWAVE_SECRET_HASH = Deno.env.get("FLUTTERWAVE_SECRET_HASH") ?? "";

const admin = adminClient();

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const provider = url.searchParams.get("provider") as Provider | null;
  if (provider !== "flutterwave" && provider !== "paystack") {
    return json({ error: "Unknown or missing ?provider=" }, 400);
  }

  const rawBody = await req.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const data = (payload.data ?? {}) as Record<string, unknown>;
  const reference = provider === "flutterwave" ? String(data.tx_ref ?? "") : String(data.reference ?? "");
  const eventId = String(data.id ?? payload.id ?? crypto.randomUUID());
  const eventType = String(payload.event ?? "unknown");

  // Idempotency: unique (provider, event_id) means a redelivered webhook is a no-op.
  const { data: eventRow, error: insertErr } = await admin
    .from("payment_webhook_events")
    .insert({ provider, event_id: eventId, event_type: eventType, payload, signature_valid: false })
    .select()
    .single();

  if (insertErr) {
    if (insertErr.code === "23505") return json({ ok: true, deduplicated: true });
    console.error("Failed to log webhook event", insertErr);
    return json({ error: "Could not log event" }, 500);
  }

  try {
    if (!reference) throw new Error("Webhook payload missing reference");

    // Find the payment first (we need its school_id to look up the right secret key),
    // then verify signature, then re-verify with the gateway before applying anything.
    const { data: payment, error: payErr } = await admin
      .from("payments")
      .select("id, school_id, status")
      .eq("reference", reference)
      .maybeSingle();
    if (payErr) throw new Error(payErr.message);
    if (!payment) throw new Error(`Payment for reference ${reference} not found`);

    const secretKey = await getSecretKey(admin, payment.school_id, provider);
    const signatureValid = provider === "flutterwave"
      ? verifyFlutterwaveSignature(req)
      : await verifyPaystackSignature(req, rawBody, secretKey);

    await admin.from("payment_webhook_events").update({ signature_valid: signatureValid }).eq("id", eventRow.id);
    if (!signatureValid) throw new Error("Invalid webhook signature");

    if (payment.status !== "pending") {
      await admin.from("payment_webhook_events").update({ processed: true, processed_at: new Date().toISOString(), payment_id: payment.id }).eq("id", eventRow.id);
      return json({ ok: true, status: payment.status, alreadySettled: true });
    }

    const txn = await verifyWithGateway(provider, secretKey, reference);
    const result = await applyVerifiedResult(admin, provider, reference, txn, SUCCESS_VALUES[provider]);

    await admin
      .from("payment_webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString(), payment_id: result.paymentId })
      .eq("id", eventRow.id);

    return json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown processing error";
    await admin.from("payment_webhook_events").update({ error: message }).eq("id", eventRow.id);
    const notFound = message.includes("not found");
    // 200 for events we understand but can't act on (stops pointless retries); 500 for the rest.
    return json({ ok: notFound, error: message }, notFound ? 200 : 500);
  }
});

function verifyFlutterwaveSignature(req: Request): boolean {
  if (!FLUTTERWAVE_SECRET_HASH) return false;
  return req.headers.get("verif-hash") === FLUTTERWAVE_SECRET_HASH;
}

async function verifyPaystackSignature(req: Request, rawBody: string, secretKey: string): Promise<boolean> {
  const signature = req.headers.get("x-paystack-signature");
  if (!signature) return false;
  const computed = await hmacSha512Hex(secretKey, rawBody);
  return timingSafeEqual(computed, signature);
}

async function hmacSha512Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
