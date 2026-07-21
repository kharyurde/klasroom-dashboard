import { useState } from "react";
import { usePlatformData } from "../../lib/usePlatformData";
import { Badge, EmptyState, Spinner } from "../../components/ui";
import { formatMoney, formatDate } from "../../lib/format";
import { supabase } from "../../lib/supabase";
import { CreditCard, Search, Download } from "lucide-react";

export function PlatformPaymentsPage() {
  const data = usePlatformData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  if (data.loading) return <div className="grid place-items-center py-20"><Spinner className="text-brand-600" size={28} /></div>;

  const schoolMap = new Map(data.schools.map((s) => [s.id, s]));
  const filtered = data.payments.filter((p) => {
    const school = schoolMap.get(p.school_id);
    const matchesQuery = !query ||
      p.description?.toLowerCase().includes(query.toLowerCase()) ||
      p.type.toLowerCase().includes(query.toLowerCase()) ||
      school?.name.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalPaid = data.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const totalPending = data.payments.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount, 0);

  const exportCsv = () => {
    const rows = [["Date", "School", "Type", "Description", "Amount", "Currency", "Status", "Reference"]];
    filtered.forEach((p) => {
      rows.push([
        formatDate(p.created_at),
        schoolMap.get(p.school_id)?.name ?? "—",
        p.type,
        p.description ?? "",
        p.amount.toString(),
        p.currency,
        p.status,
        p.reference ?? "",
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "klasroom-payments.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Payments</h1>
          <p className="text-sm text-ink-500 mt-0.5">{data.payments.length} transactions across all schools.</p>
        </div>
        <button onClick={exportCsv} className="btn-secondary text-xs"><Download className="h-4 w-4" /> Export CSV</button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-ink-500">Collected (paid)</p>
          <p className="text-2xl font-extrabold text-brand-700 mt-1">{formatMoney(totalPaid)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500">Pending</p>
          <p className="text-2xl font-extrabold text-gold-600 mt-1">{formatMoney(totalPending)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500">Total transactions</p>
          <p className="text-2xl font-extrabold text-ink-950 mt-1">{data.payments.length}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
          <input className="input pl-10" placeholder="Search payments…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<CreditCard className="h-7 w-7" />} title="No payments" description="No transactions match your filters." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3 font-medium text-ink-900 truncate max-w-40">{schoolMap.get(p.school_id)?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600 capitalize">{p.type.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-right font-bold text-ink-950 whitespace-nowrap">{formatMoney(p.amount, p.currency)}</td>
                  <td className="px-4 py-3"><Badge tone={p.status === "paid" ? "brand" : p.status === "pending" ? "gold" : "rose"}>{p.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-ink-500 font-mono">{p.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
