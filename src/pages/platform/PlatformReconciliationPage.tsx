import { useEffect, useState } from "react";
import { usePlatformData } from "../../lib/usePlatformData";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { fetchSettlements, fetchUnreconciledPayments, matchPaymentToSettlement } from "../../lib/statement";
import { EmptyState, Spinner, Badge, Button } from "../../components/ui";
import { formatMoney, formatDateTime } from "../../lib/format";
import type { BankSettlement, Payment } from "../../lib/types";
import { Landmark, CheckCircle2 } from "lucide-react";

export function PlatformReconciliationPage() {
  const data = usePlatformData();
  const { user } = useAuth();
  const toast = useToast();
  const [schoolId, setSchoolId] = useState<string>("");
  const [settlements, setSettlements] = useState<BankSettlement[]>([]);
  const [unreconciled, setUnreconciled] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [matching, setMatching] = useState<string | null>(null);
  const [selectedSettlement, setSelectedSettlement] = useState<Record<string, string>>({});

  useEffect(() => {
    if (data.schools.length && !schoolId) setSchoolId(data.schools[0].id);
  }, [data.schools, schoolId]);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    Promise.all([fetchSettlements(schoolId), fetchUnreconciledPayments(schoolId)])
      .then(([s, p]) => { setSettlements(s); setUnreconciled(p); })
      .finally(() => setLoading(false));
  }, [schoolId]);

  const reload = async () => {
    if (!schoolId) return;
    const [s, p] = await Promise.all([fetchSettlements(schoolId), fetchUnreconciledPayments(schoolId)]);
    setSettlements(s); setUnreconciled(p);
  };

  const match = async (payment: Payment) => {
    const settlementId = selectedSettlement[payment.id];
    if (!settlementId || !user) return;
    setMatching(payment.id);
    try {
      const settlement = settlements.find((s) => s.id === settlementId);
      const variance = settlement ? Number((settlement.amount - payment.amount).toFixed(2)) : 0;
      await matchPaymentToSettlement({ paymentId: payment.id, settlementId, schoolId, matchedBy: user.id, variance });
      toast({ kind: "success", title: "Matched", message: `Payment reconciled against settlement.` });
      await reload();
    } catch (e) {
      toast({ kind: "error", title: "Could not match", message: (e as Error).message });
    } finally {
      setMatching(null);
    }
  };

  if (data.loading) return <div className="grid place-items-center py-20"><Spinner className="text-brand-600" size={28} /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Reconciliation</h1>
          <p className="text-sm text-ink-500 mt-0.5">Match collected payments against processor settlement batches.</p>
        </div>
        <select className="input sm:w-64" value={schoolId} onChange={(e) => setSchoolId(e.target.value)}>
          {data.schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="text-brand-600" size={26} /></div>
      ) : (
        <>
          <div>
            <h2 className="text-sm font-semibold text-ink-900 mb-3">Unreconciled payments ({unreconciled.length})</h2>
            {unreconciled.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-7 w-7" />} title="All caught up" description="Every collected payment has been matched to a settlement." />
            ) : (
              <div className="card divide-y divide-ink-100">
                {unreconciled.map((p) => (
                  <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900">{formatMoney(p.amount, p.currency)} · {p.type.replace(/_/g, " ")}</p>
                      <p className="text-xs text-ink-500 font-mono">{p.reference} · {formatDateTime(p.paid_at ?? p.created_at)}</p>
                    </div>
                    <select
                      className="input sm:w-56"
                      value={selectedSettlement[p.id] ?? ""}
                      onChange={(e) => setSelectedSettlement({ ...selectedSettlement, [p.id]: e.target.value })}
                    >
                      <option value="">Select settlement…</option>
                      {settlements.map((s) => (
                        <option key={s.id} value={s.id}>{s.settlement_reference} · {formatMoney(s.amount, s.currency)}</option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      loading={matching === p.id}
                      disabled={!selectedSettlement[p.id]}
                      onClick={() => match(p)}
                    >
                      Match
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold text-ink-900 mb-3">Settlement batches ({settlements.length})</h2>
            {settlements.length === 0 ? (
              <EmptyState icon={<Landmark className="h-7 w-7" />} title="No settlements recorded" description="Settlement batches from Flutterwave/Paystack land here once imported." />
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                      <th className="px-4 py-3 font-medium">Settled</th>
                      <th className="px-4 py-3 font-medium">Provider</th>
                      <th className="px-4 py-3 font-medium">Reference</th>
                      <th className="px-4 py-3 font-medium text-right">Amount</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-ink-50">
                        <td className="px-4 py-3 text-ink-600 whitespace-nowrap">{formatDateTime(s.settled_at)}</td>
                        <td className="px-4 py-3 capitalize">{s.provider}</td>
                        <td className="px-4 py-3 font-mono text-xs">{s.settlement_reference}</td>
                        <td className="px-4 py-3 text-right font-bold text-ink-950">{formatMoney(s.amount, s.currency)}</td>
                        <td className="px-4 py-3"><Badge tone={s.status === "matched" ? "brand" : s.status === "disputed" ? "rose" : "gold"}>{s.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
