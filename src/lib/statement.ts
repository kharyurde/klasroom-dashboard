import { supabase } from "./supabase";
import type { WardLedgerEntry, StatementEntry, BankSettlement, PaymentReconciliation, Payment } from "./types";

/**
 * Statement of account for a ward: fee charges (debits) and paid payments (credits),
 * combined via the `ward_ledger` view and given a running balance client-side.
 * The view is `security_invoker = true` so RLS still applies per the caller
 * (parent sees only their own ward, school admin sees their school's wards).
 */
export async function fetchWardStatement(wardId: string, schoolId?: string): Promise<StatementEntry[]> {
  let query = supabase.from("ward_ledger").select("*").eq("ward_id", wardId);
  if (schoolId) query = query.eq("school_id", schoolId);
  const { data, error } = await query.order("entry_date", { ascending: true });
  if (error) throw new Error(error.message);

  const rows = (data as WardLedgerEntry[]) ?? [];
  let running = 0;
  return rows.map((row) => {
    running += (row.debit ?? 0) - (row.credit ?? 0);
    return { ...row, balance: running };
  });
}

export function statementTotals(entries: StatementEntry[]) {
  const totalCharged = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalPaid = entries.reduce((sum, e) => sum + e.credit, 0);
  const balance = entries.length ? entries[entries.length - 1].balance : 0;
  return { totalCharged, totalPaid, balance };
}

/** Bank settlement batches reported by the payment processor for a school. */
export async function fetchSettlements(schoolId: string): Promise<BankSettlement[]> {
  const { data, error } = await supabase
    .from("bank_settlements")
    .select("*")
    .eq("school_id", schoolId)
    .order("settled_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as BankSettlement[]) ?? [];
}

export type ReconciliationRow = PaymentReconciliation & { payment?: Payment; settlement?: BankSettlement };

/** Payment ↔ settlement match records for a school, most recent first. */
export async function fetchReconciliation(schoolId: string): Promise<ReconciliationRow[]> {
  const { data, error } = await supabase
    .from("payment_reconciliations")
    .select("*, payment:payments(*), settlement:bank_settlements(*)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as ReconciliationRow[]) ?? [];
}

/**
 * Every "paid" payment on file that has no matching settlement/reconciliation row
 * yet — the day-to-day reconciliation queue.
 */
export async function fetchUnreconciledPayments(schoolId: string): Promise<Payment[]> {
  const [{ data: paid, error: payErr }, { data: recon, error: reconErr }] = await Promise.all([
    supabase.from("payments").select("*").eq("school_id", schoolId).eq("status", "paid"),
    supabase.from("payment_reconciliations").select("payment_id").eq("school_id", schoolId),
  ]);
  if (payErr) throw new Error(payErr.message);
  if (reconErr) throw new Error(reconErr.message);

  const reconciledIds = new Set((recon ?? []).map((r) => r.payment_id as string));
  return ((paid as Payment[]) ?? []).filter((p) => !reconciledIds.has(p.id));
}

/** Marks a payment as matched against a settlement batch. */
export async function matchPaymentToSettlement(input: {
  paymentId: string;
  settlementId: string;
  schoolId: string;
  variance?: number;
  matchedBy: string;
  notes?: string;
}): Promise<void> {
  const { error } = await supabase.from("payment_reconciliations").upsert(
    {
      payment_id: input.paymentId,
      settlement_id: input.settlementId,
      school_id: input.schoolId,
      status: "matched",
      variance: input.variance ?? 0,
      matched_at: new Date().toISOString(),
      matched_by: input.matchedBy,
      notes: input.notes ?? null,
    },
    { onConflict: "payment_id" },
  );
  if (error) throw new Error(error.message);
}
