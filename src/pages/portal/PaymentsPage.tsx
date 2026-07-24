import { useEffect, useState } from "react";
import { Link } from "../../lib/router";
import { useParentData } from "../../lib/useParentData";
import { EmptyState, Badge, Spinner } from "../../components/ui";
import { downloadApiReceipt } from "../../lib/receipt";
import { listPayments, type ApiPayment } from "../../lib/paymentsApi";
import { formatMoney, formatDateTime } from "../../lib/format";
import { CreditCard, Download, FileText, Plus } from "lucide-react";

function prettyType(type: string): string {
  return type.split("_").map((p) => p[0].toUpperCase() + p.slice(1)).join(" ");
}

export function PaymentsPage() {
  const data = useParentData();
  const [payments, setPayments] = useState<ApiPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listPayments()
      .then(({ payments: p }) => setPayments(p))
      .finally(() => setLoading(false));
  }, []);

  if (data.loading) return null;
  if (data.wards.length === 0) {
    return (
      <EmptyState
        icon={<CreditCard className="h-7 w-7" />}
        title="No payments yet"
        description="Add a ward to get started."
        action={<Link to="/portal/wards/new" className="btn-primary"><Plus className="h-4 w-4" /> Add ward</Link>}
      />
    );
  }

  const schoolMap = new Map(data.allSchools.map((s) => [s.id, s]));
  const totalPaid = payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const currency = payments[0]?.currency ?? data.allSchools[0]?.currency ?? "NGN";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Payment history</h1>
        <p className="text-sm text-ink-500 mt-0.5">All payments across your children.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Total paid</p>
          <p className="text-2xl font-extrabold text-brand-700 mt-1">{formatMoney(totalPaid, currency)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Payments</p>
          <p className="text-2xl font-extrabold text-ink-950 mt-1">{payments.filter((p) => p.status === "paid").length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Schools</p>
          <p className="text-2xl font-extrabold text-ink-950 mt-1">{new Set(payments.map((p) => p.school_id)).size}</p>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="text-brand-600" size={26} /></div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-7 w-7" />}
          title="No payments yet"
          description="Payments will appear here once you start an application."
          action={<Link to="/apply" className="btn-primary"><FileText className="h-4 w-4" /> Apply to a school</Link>}
        />
      ) : (
        <div className="card">
          <div className="divide-y divide-ink-100">
            {payments.map((p) => {
              const school = schoolMap.get(p.school_id);
              return (
                <div key={p.id} className="flex items-center gap-4 p-4">
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-50 text-brand-700 shrink-0">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{prettyType(p.type)}</p>
                    <p className="text-xs text-ink-500">{school?.name ?? "—"} · {formatDateTime(p.paid_at ?? p.created_at)}</p>
                    <p className="text-[10px] text-ink-400 mt-0.5">Ref: {p.reference}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-ink-950">{formatMoney(p.amount, p.currency)}</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                      <Badge tone={p.status === "paid" ? "brand" : p.status === "failed" ? "rose" : "gold"}>{p.status}</Badge>
                      {p.status === "paid" && (
                        <button
                          onClick={() => downloadApiReceipt(p, school?.name ?? "Klasroom School", { address: school?.address, email: school?.email, phone: school?.phone })}
                          className="text-xs text-brand-700 hover:underline inline-flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" /> PDF
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
