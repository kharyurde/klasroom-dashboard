import { initializePayment, idempotencyKeyFor, isNoGatewayConfigured, type PaymentType } from "./paymentsApi";
import type { School, Ward } from "./types";

export type PayInput = {
  school: Pick<School, "id" | "currency" | "name" | "application_fee" | "assessment_fee" | "acceptance_fee">;
  ward: Pick<Ward, "id" | "first_name" | "last_name">;
  type: PaymentType;
  amount: number;
  payerEmail: string;
  payerName?: string;
  /** Opaque reference to whatever this payment settles (an application, an enrollment, ...). */
  purposeType?: string;
  purposeId?: string;
  description?: string;
};

export class NoGatewayConfiguredError extends Error {
  constructor(schoolName: string) {
    super(`${schoolName} hasn't connected a payment processor yet. Please contact the school.`);
  }
}

/**
 * Starts a real payment: calls the Express API to create a pending payment and get
 * a hosted checkout URL (Paystack/Flutterwave), then redirects the browser there.
 * This call does not resolve on success — the page navigates away. When the parent
 * returns (the gateway redirects to PAYMENT_CALLBACK_URL), PaymentCallbackPage calls
 * the API's verify endpoint to confirm the outcome.
 *
 * Idempotency: the same (school, ward, type, purpose) reuses one idempotency key for
 * the duration of the browser session, so retrying after a network hiccup resumes the
 * same payment instead of creating a duplicate. The key is only ever known to the
 * frontend and the API — nothing here talks to a database directly.
 */
export async function startPayment(input: PayInput): Promise<void> {
  const scope = `${input.school.id}_${input.ward.id}_${input.type}_${input.purposeType ?? ""}_${input.purposeId ?? ""}`;
  const idempotencyKey = idempotencyKeyFor(scope);

  try {
    const { payment, checkoutUrl } = await initializePayment({
      schoolId: input.school.id,
      type: input.type,
      amount: input.amount,
      currency: input.school.currency,
      description: input.description ?? defaultDescription(input.type, input.ward),
      purposeType: input.purposeType,
      purposeId: input.purposeId,
      payerEmail: input.payerEmail,
      payerName: input.payerName,
      idempotencyKey,
    });

    if (!checkoutUrl) throw new Error("The payment provider did not return a checkout link.");

    // Stash the reference so the callback page (which only gets ?reference= back
    // from the gateway) can show useful context immediately, before verifying.
    sessionStorage.setItem("kr_pending_payment_reference", payment.reference);
    window.location.href = checkoutUrl;
  } catch (e) {
    if (isNoGatewayConfigured(e)) throw new NoGatewayConfiguredError(input.school.name);
    throw e;
  }
}

function defaultDescription(type: PaymentType, ward: Pick<Ward, "first_name" | "last_name">): string {
  const name = `${ward.first_name} ${ward.last_name}`;
  const map: Record<PaymentType, string> = {
    application_fee: `Application fee for ${name}`,
    assessment_fee: `Assessment / entrance exam fee for ${name}`,
    acceptance_fee: `Acceptance fee for ${name}`,
    school_fees: `School fees for ${name}`,
    other_fees: `Fee payment for ${name}`,
  };
  return map[type];
}
