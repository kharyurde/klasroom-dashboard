import { Link } from "../../lib/router";
import { useParentData } from "../../lib/useParentData";
import { EmptyState, Badge } from "../../components/ui";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { GraduationCap, Plus, TrendingUp } from "lucide-react";
import type { ResultRow, Enrollment } from "../../lib/types";

export function ResultsPage() {
  const data = useParentData();
  const [results, setResults] = useState<ResultRow[]>([]);
  const [enrollments, setEnrollments] = useState<(Enrollment & { school?: { name: string } })[]>([]);

  useEffect(() => {
    if (!data.activeWardId) return;
    (async () => {
      const { data: en } = await supabase.from("enrollments").select("*").eq("ward_id", data.activeWardId);
      const enrolls = (en as Enrollment[]) ?? [];
      const schoolMap = new Map(data.allSchools.map((s) => [s.id, { name: s.name }]));
      setEnrollments(enrolls.map((e) => ({ ...e, school: schoolMap.get(e.school_id) })));
      if (enrolls.length === 0) { setResults([]); return; }
      const { data: r } = await supabase.from("results").select("*").in("enrollment_id", enrolls.map((e) => e.id)).eq("published", true).order("created_at", { ascending: false });
      setResults((r as ResultRow[]) ?? []);
    })();
  }, [data.activeWardId, data.allSchools]);

  if (data.loading) return null;
  if (data.wards.length === 0) {
    return <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="No results" description="Add a ward to see results."
      action={<Link to="/portal/wards/new" className="btn-primary"><Plus className="h-4 w-4" /> Add ward</Link>} />;
  }

  const grouped = results.reduce<Record<string, ResultRow[]>>((acc, r) => {
    const key = `${r.term} · ${r.session_name ?? ""}`;
    (acc[key] ??= []).push(r);
    return acc;
  }, {});

  const activeEnrollments = enrollments.filter((e) => e.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Results</h1>
        <p className="text-sm text-ink-500 mt-0.5">Report cards for {data.activeWard?.first_name} {data.activeWard?.last_name}.</p>
      </div>

      {activeEnrollments.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="Not enrolled yet" description="Results appear here once your child is enrolled and the school publishes results." />
      ) : results.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="No results published" description="The school hasn't published any results yet. Check back after assessments." />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([key, rows]) => {
            const total = rows.reduce((s, r) => s + (r.score ?? 0), 0);
            const max = rows.reduce((s, r) => s + r.max_score, 0);
            const pct = max > 0 ? Math.round((total / max) * 100) : 0;
            return (
              <div key={key} className="card overflow-hidden">
                <div className="flex items-center justify-between bg-ink-50 px-5 py-3 border-b border-ink-100">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">{key}</p>
                    <p className="text-xs text-ink-500">{rows[0].school_id && data.allSchools.find(s => s.id === rows[0].school_id)?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-brand-600" />
                    <span className="text-lg font-bold text-brand-700">{pct}%</span>
                  </div>
                </div>
                <div className="divide-y divide-ink-100">
                  {rows.map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm font-medium text-ink-900">{r.subject}</p>
                        {r.teacher_remark && <p className="text-xs text-ink-500 mt-0.5">{r.teacher_remark}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-ink-950">{r.score ?? "—"}/{r.max_score}</span>
                        {r.grade && <Badge tone="brand">{r.grade}</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}