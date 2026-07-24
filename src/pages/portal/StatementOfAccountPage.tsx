import { useEffect, useState } from "react";
import { Link } from "../../lib/router";
import { useParentData } from "../../lib/useParentData";
import { fetchWardStatement, statementTotals } from "../../lib/statement";
import { EmptyState, Spinner, Badge } from "../../components/ui";
import { formatMoney, formatDate } from "../../lib/format";
import type { StatementEntry } from "../../lib/types";
import { Receipt, Download, Plus } from "lucide-react";

export function StatementOfAccountPage() {
  const data = useParentData();
  const [entries, setEntries] = useState<StatementEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!data.activeWardId) return;
    setLoading(true);
    fetchWardStatement(data.activeWardId)
      .then(setEntries)
      .finally(() => setLoading(false));
  }, [data.activeWardId]);

  if (data.loading) return null;
  if (data.wards.length === 0) {
    return (
      <EmptyState
        icon={<Receipt className="h-7 w-7" />}
        title="No statement yet"
        description="Add a ward to get started."
        action={<Link to="/portal/wards/new" className="btn-primary"><Plus className="h-4 w-4" /> Add ward</Link>}
      />
    );
  }

  const currency = data.allSchools[0]?.currency ?? "NGN";
  const { totalCharged, totalPaid, balance } = statementTotals(entries);

  const exportCsv = () => {
    const rows = [["Date", "Description", "Type", "Debit", "Credit", "Balance", "Status"]];
    entries.forEach((e) => {
      rows.push([
        formatDate(e.entry_date), e.description, e.entry_type,
        e.debit ? e.debit.toString() : "", e.credit ? e.credit.toString() : "",
        e.balance.toString(), e.status,
      ]);
    });
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${data.activeWard?.first_name ?? "ward"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Statement of account</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            All charges and payments for {data.activeWard?.first_name} {data.activeWard?.last_name}.
          </p>
        </div>
        {entries.length > 0 && (
          <button onClick={exportCsv} className="btn-secondary text-xs">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Total charged</p>
          <p className="text-2xl font-extrabold text-ink-950 mt-1">{formatMoney(totalCharged, currency)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Total paid</p>
          <p className="text-2xl font-extrabold text-brand-700 mt-1">{formatMoney(totalPaid, currency)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-ink-500 uppercase tracking-wider">Balance {balance > 0 ? "owed" : ""}</p>
          <p className={`text-2xl font-extrabold mt-1 ${balance > 0 ? "text-rose-600" : "text-brand-700"}`}>
            {formatMoney(Math.abs(balance), currency)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="text-brand-600" size={26} /></div>
      ) : entries.length === 0 ? (
        <EmptyState icon={<Receipt className="h-7 w-7" />} title="Nothing on the statement yet" description="Charges and payments will appear here once your application is underway." />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Debit</th>
                <th className="px-4 py-3 font-medium text-right">Credit</th>
                <th className="px-4 py-3 font-medium text-right">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {entries.map((e) => (
                <tr key={`${e.entry_type}-${e.id}`} className="hover:bg-ink-50">
                  <td className="px-4 py-3 text-ink-600 whitespace-nowrap">{formatDate(e.entry_date)}</td>
                  <td className="px-4 py-3 text-ink-900">{e.description}</td>
                  <td className="px-4 py-3 text-right font-semibold text-rose-600">{e.debit ? formatMoney(e.debit, e.currency) : "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-brand-700">{e.credit ? formatMoney(e.credit, e.currency) : "—"}</td>
                  <td className="px-4 py-3 text-right font-bold text-ink-950 whitespace-nowrap">{formatMoney(e.balance, e.currency)}</td>
                  <td className="px-4 py-3"><Badge tone={e.status === "paid" ? "brand" : e.status === "overdue" ? "rose" : "gold"}>{e.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
