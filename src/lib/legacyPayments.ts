/**
 * @deprecated This is the pre-migration, Supabase-direct payment simulator.
 *
 * ApplyToSchoolPage.tsx and ApplicationDetailPage.tsx still manage applications via
 * direct Supabase queries (no `applications` endpoint exists on the Express API yet),
 * so they can't use the real gateway-redirect flow in src/lib/payments.ts — that flow
 * navigates the browser away, which would abandon their in-page "mark submitted"
 * Supabase calls with nowhere to resume.
 *
 * DO NOT use this for anything new. Once the Express API has an applications module,
 * migrate those two pages to src/lib/payments.ts (startPayment) + the applications
 * API, and delete this file. Every payment made through here bypasses the real
 * Paystack/Flutterwave integration entirely.
 */
import { supabase } from "./supabase";
import { genReference } from "./format";
import type { Payment, PaymentType, Ward, School } from "./types";

export type LegacyPayInput = {
  school: Pick<School, "id" | "currency" | "name" | "application_fee" | "assessment_fee" | "acceptance_fee">;
  ward: Pick<Ward, "id" | "first_name" | "last_name">;
  type: PaymentType;
  amount: number;
  applicationId?: string;
  enrollmentId?: string;
  description?: string;
};

export async function processLegacyPayment(input: LegacyPayInput): Promise<Payment> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("Not signed in");

  const reference = genReference(input.type.slice(0, 3).toUpperCase());

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      application_id: input.applicationId ?? null,
      enrollment_id: input.enrollmentId ?? null,
      ward_id: input.ward.id,
      school_id: input.school.id,
      parent_id: userId,
      type: input.type,
      amount: input.amount,
      currency: input.school.currency,
      description: input.description ?? defaultDescription(input.type, input.ward),
      status: "pending",
      reference,
      method: "card",
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  try {
    await simulateCardCharge();
  } catch (e) {
    await supabase.from("payments").update({ status: "failed" }).eq("id", payment.id);
    throw e;
  }

  const { data: paid, error: updErr } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", payment.id)
    .select()
    .single();
  if (updErr) throw new Error(updErr.message);
  return paid as Payment;
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

function simulateCardCharge(): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.98) resolve();
      else reject(new Error("Your card was declined. Please try again or use another card."));
    }, 1700);
  });
}
