import { apiGet, apiPost, ApiError } from "./apiClient";

export type PaymentType = "application_fee" | "assessment_fee" | "acceptance_fee" | "school_fees" | "other_fees";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type ApiPayment = {
  id: string;
  school_id: string;
  payer_id: string | null;
  type: PaymentType;
  purpose_type: string | null;
  purpose_id: string | null;
  description: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider: "paystack" | "flutterwave" | null;
  reference: string;
  provider_reference: string | null;
  checkout_url: string | null;
  paid_at: string | null;
  created_at: string;
};

export type InitializePaymentInput = {
  schoolId: string;
  type: PaymentType;
  amount: number;
  currency?: string;
  description?: string;
  purposeType?: string; // e.g. "application", "enrollment" — opaque to the API, ours to interpret
  purposeId?: string;
  payerEmail: string;
  payerName?: string;
  /** Stable across retries of the *same* logical payment so the API can dedupe. */
  idempotencyKey: string;
};

export async function initializePayment(input: InitializePaymentInput): Promise<{ payment: ApiPayment; checkoutUrl: string | null }> {
  const { idempotencyKey, ...body } = input;
  return apiPost("/api/payments/initialize", body, { headers: { "Idempotency-Key": idempotencyKey } });
}

export async function verifyPayment(reference: string): Promise<{ payment: ApiPayment }> {
  return apiGet(`/api/payments/verify/${encodeURIComponent(reference)}`);
}

export async function getPayment(id: string): Promise<{ payment: ApiPayment }> {
  return apiGet(`/api/payments/${id}`);
}

export async function listPayments(params?: { schoolId?: string; status?: PaymentStatus; limit?: number }): Promise<{ payments: ApiPayment[] }> {
  const qs = new URLSearchParams();
  if (params?.schoolId) qs.set("schoolId", params.schoolId);
  if (params?.status) qs.set("status", params.status);
  if (params?.limit) qs.set("limit", String(params.limit));
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return apiGet(`/api/payments${suffix}`);
}

export function isNoGatewayConfigured(e: unknown): boolean {
  return e instanceof ApiError && e.status === 422 && /gateway/i.test(e.message);
}

/** A stable idempotency key per logical payment attempt, reused across retries within the same browser session. */
export function idempotencyKeyFor(scope: string): string {
  const storageKey = `kr_idem_${scope}`;
  let key = sessionStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
  }
  return key;
}

export function clearIdempotencyKey(scope: string): void {
  sessionStorage.removeItem(`kr_idem_${scope}`);
}
