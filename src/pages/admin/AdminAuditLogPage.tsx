import { useEffect, useState } from "react";
import { useAdminData } from "../../lib/useAdminData";
import { fetchAuditLogs, summarizeChange, AUDIT_TABLE_LABELS, type AuditedTable, type AuditLog } from "../../lib/audit";
import { EmptyState, Spinner, Badge } from "../../components/ui";
import { formatDateTime } from "../../lib/format";
import { ShieldCheck, Plus, Pencil, Trash2 } from "lucide-react";

const ACTION_META: Record<AuditLog["action"], { label: string; icon: typeof Plus; tone: "brand" | "gold" | "rose" }> = {
  INSERT: { label: "Created", icon: Plus, tone: "brand" },
  UPDATE: { label: "Updated", icon: Pencil, tone: "gold" },
  DELETE: { label: "Deleted", icon: Trash2, tone: "rose" },
};

export function AdminAuditLogPage() {
  const data = useAdminData();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState<AuditedTable | "all">("all");

  useEffect(() => {
    if (!data.school) return;
    setLoading(true);
    fetchAuditLogs(data.school.id, { table: tableFilter === "all" ? undefined : tableFilter, limit: 200 })
      .then(setLogs)
      .finally(() => setLoading(false));
  }, [data.school, tableFilter]);

  if (data.loading) return null;
  if (!data.school) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Audit log</h1>
        <p className="text-sm text-ink-500 mt-0.5">Every change to payments, applications, enrollments, wards, and staff accounts.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterChip active={tableFilter === "all"} onClick={() => setTableFilter("all")}>All</FilterChip>
        {(Object.keys(AUDIT_TABLE_LABELS) as AuditedTable[]).map((t) => (
          <FilterChip key={t} active={tableFilter === t} onClick={() => setTableFilter(t)}>{AUDIT_TABLE_LABELS[t]}</FilterChip>
        ))}
      </div>

      {loading ? (
        <div className="grid place-items-center py-16"><Spinner className="text-brand-600" size={26} /></div>
      ) : logs.length === 0 ? (
        <EmptyState icon={<ShieldCheck className="h-7 w-7" />} title="No activity recorded yet" description="Changes to key records will show up here as they happen." />
      ) : (
        <div className="card divide-y divide-ink-100">
          {logs.map((log) => {
            const meta = ACTION_META[log.action];
            const Icon = meta.icon;
            return (
              <div key={log.id} className="flex items-start gap-3 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-ink-50 text-ink-500 shrink-0 mt-0.5">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900">
                    {AUDIT_TABLE_LABELS[log.table_name as AuditedTable] ?? log.table_name} · {summarizeChange(log)}
                  </p>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {formatDateTime(log.created_at)} · {log.actor_role ?? "system"}
                    {log.record_id && <span className="font-mono"> · {log.record_id.slice(0, 8)}</span>}
                  </p>
                </div>
                <Badge tone={meta.tone}>{meta.label}</Badge>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? "bg-brand-700 text-white" : "bg-ink-100 text-ink-600 hover:bg-ink-200"
      }`}
    >
      {children}
    </button>
  );
}
