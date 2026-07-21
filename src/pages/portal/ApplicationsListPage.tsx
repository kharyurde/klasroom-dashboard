import { Link } from "../../lib/router";
import { useParentData } from "../../lib/useParentData";
import { EmptyState, Badge, Button } from "../../components/ui";
import { STAGE_META } from "../../lib/status";
import { formatDate } from "../../lib/format";
import { FileText, Plus, ArrowRight, Filter } from "lucide-react";
import { useState } from "react";

export function ApplicationsListPage() {
  const data = useParentData();
  const [filter, setFilter] = useState<"all" | "active" | "enrolled" | "rejected">("all");

  if (data.loading) return null;

  if (data.wards.length === 0) {
    return (
      <EmptyState icon={<FileText className="h-7 w-7" />} title="No applications yet"
        description="Add a ward and apply to a school to see applications here."
        action={<Link to="/portal/wards/new" className="btn-primary"><Plus className="h-4 w-4" /> Add a ward</Link>} />
    );
  }

  const allApps = data.contexts.flatMap((c) => c.applications.map((a) => ({ ...a, ward: c.ward })));
  const filtered = allApps.filter((a) => {
    if (filter === "active") return !["enrolled", "rejected", "withdrawn"].includes(a.status);
    if (filter === "enrolled") return a.status === "enrolled";
    if (filter === "rejected") return a.status === "rejected";
    return true;
  }).sort((a, b) => b.created_at.localeCompare(a.created_at));

  const filters = [
    { k: "all", l: "All" }, { k: "active", l: "Active" }, { k: "enrolled", l: "Enrolled" }, { k: "rejected", l: "Rejected" },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Applications</h1>
          <p className="text-sm text-ink-500 mt-0.5">Track every application across all your wards and schools.</p>
        </div>
        <Link to="/apply" className="btn-primary"><Plus className="h-4 w-4" /> New application</Link>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
        <Filter className="h-4 w-4 text-ink-400 shrink-0" />
        {filters.map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition ${filter === f.k ? "bg-brand-600 text-white" : "bg-white ring-1 ring-ink-200 text-ink-600 hover:bg-ink-50"}`}>
            {f.l}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<FileText className="h-7 w-7" />} title="No applications here"
          description="Try a different filter, or start a new application."
          action={<Link to="/apply" className="btn-primary"><Plus className="h-4 w-4" /> Apply to a school</Link>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const meta = STAGE_META[a.status];
            return (
              <Link key={a.id} to={`/portal/applications/${a.id}`}
                className="card card-hover p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-ink-50 grid place-items-center text-lg font-bold text-ink-700 shrink-0">
                  {a.school?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-ink-900 truncate">{a.school?.name}</p>
                    <Badge tone={meta.tone}>{meta.short}</Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-0.5">
                    {a.ward.first_name} {a.ward.last_name} · {a.applying_for_class_name} · {formatDate(a.created_at)}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-ink-300 shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
