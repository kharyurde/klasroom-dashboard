import { useAdminData } from "../../lib/useAdminData";
import { Badge, EmptyState } from "../../components/ui";
import { prettyType } from "../../lib/receipt";
import { formatMoney, formatDateTime } from "../../lib/format";
import { CreditCard, Download } from "lucide-react";
import { useState } from "react";

export function AdminPaymentsPage() {
  const data = useAdminData();
  const [filter, setFilter] = useState<string>("all");
  if (data.loading) return null;

  const paid = data.payments.filter((p) => p.status === "paid");
  const total = paid.reduce((s, p) => s + p.amount, 0);
  const filtered = filter === "all" ? paid : paid.filter((p) => p.type === filter);

  const types = ["all", "application_fee", "assessment_fee", "acceptance_fee", "school_fees", "other_fees"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Payments</h1>
        <p className="text-sm text-ink-500 mt-0.5">All fee payments received by {data.school?.name}.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Total received</p>
          <p className="text-2xl font-extrabold text-brand-700 mt-1">{formatMoney(total, data.school?.currency ?? "NGN")}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Transactions</p>
          <p className="text-2xl font-extrabold text-ink-950 mt-1">{paid.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Pending</p>
          <p className="text-2xl font-extrabold text-gold-600 mt-1">{data.payments.filter(p => p.status === "pending").length}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
        {types.map((t) => (
          <button key={t} onClick={() => setFilter(t)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition ${filter === t ? "bg-brand-600 text-white" : "bg-white ring-1 ring-ink-200 text-ink-600 hover:bg-ink-50"}`}>
            {t === "all" ? "All" : prettyType(t)}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-7 w-7" />} title="No payments" description="Payments will appear here as parents pay fees." />
      ) : (
        <div className="card">
          <div className="divide-y divide-ink-100">
            {filtered.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-700 shrink-0">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">{prettyType(p.type)}</p>
                  <p className="text-xs text-ink-500">{formatDateTime(p.paid_at ?? p.created_at)} · {p.reference}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-ink-950">{formatMoney(p.amount, p.currency)}</p>
                  <Badge tone={p.status === "paid" ? "brand" : "gold"}>{p.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}