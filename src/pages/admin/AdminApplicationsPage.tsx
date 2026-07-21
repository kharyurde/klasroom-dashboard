import { Link } from "../../lib/router";
import { useAdminData } from "../../lib/useAdminData";
import { Badge, EmptyState } from "../../components/ui";
import { STAGE_META } from "../../lib/status";
import { formatDate } from "../../lib/format";
import { FileText, ArrowRight, Filter, Search } from "lucide-react";
import { useState } from "react";
import type { ApplicationStatus } from "../../lib/types";

export function AdminApplicationsPage() {
  const data = useAdminData();
  const [filter, setFilter] = useState<"all" | "submitted" | "approved" | "exam" | "docs" | "fees" | "enrolled" | "rejected">("all");
  const [q, setQ] = useState("");

  if (data.loading) return null;

  const matches = (a: any) => {
    if (filter === "submitted") return ["submitted", "under_review"].includes(a.status);
    if (filter === "approved") return ["approved", "assessment_paid"].includes(a.status);
    if (filter === "exam") return ["exam_scheduled", "exam_passed", "exam_failed"].includes(a.status);
    if (filter === "docs") return ["docs_submitted", "docs_approved", "docs_rejected"].includes(a.status);
    if (filter === "fees") return a.status === "fees_paid";
    if (filter === "enrolled") return a.status === "enrolled";
    if (filter === "rejected") return a.status === "rejected";
    return true;
  };

  const filtered = data.applications.filter(matches).filter((a) => {
    if (!q.trim()) return true;
    const term = q.trim().toLowerCase();
    return [a.ward?.first_name, a.ward?.last_name, a.parent?.email, a.applying_for_class_name].filter(Boolean).join(" ").toLowerCase().includes(term);
  });

  const filters = [
    { k: "all", l: "All" }, { k: "submitted", l: "New" }, { k: "approved", l: "Approved" }, { k: "exam", l: "Exam" },
    { k: "docs", l: "Documents" }, { k: "fees", l: "Fees" }, { k: "enrolled", l: "Enrolled" }, { k: "rejected", l: "Rejected" },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Applications</h1>
        <p className="text-sm text-ink-500 mt-0.5">Review and manage every application to {data.school?.name}.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <input className="input pl-10" placeholder="Search by name or email…" value={q} onChange={(e) => setQ(e.target.value)} />
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
        <EmptyState icon={<FileText className="h-7 w-7" />} title="No applications" description="No applications match this filter." />
      ) : (
        <div className="card">
          <div className="divide-y divide-ink-100">
            {filtered.map((a) => {
              const meta = STAGE_META[a.status as ApplicationStatus];
              return (
                <Link key={a.id} to={`/admin/applications/${a.id}`} className="flex items-center gap-4 p-4 hover:bg-ink-50 transition">
                  <div className="h-11 w-11 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-sm font-semibold shrink-0">
                    {a.ward?.first_name?.[0]}{a.ward?.last_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{a.ward?.first_name} {a.ward?.last_name}</p>
                    <p className="text-xs text-ink-500">{a.applying_for_class_name} · {a.parent?.email} · {formatDate(a.created_at)}</p>
                  </div>
                  <Badge tone={meta.tone}>{meta.short}</Badge>
                  <ArrowRight className="h-4 w-4 text-ink-300 shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
