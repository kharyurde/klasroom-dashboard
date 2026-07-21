import { useStudentData } from "../../lib/useStudentData";
import { Badge, EmptyState } from "../../components/ui";
import { FileBarChart, TrendingUp } from "lucide-react";

export function StudentResultsPage() {
  const data = useStudentData();
  if (data.loading) return null;

  const byTerm: Record<string, typeof data.results> = {};
  data.results.forEach((r) => {
    const k = `${r.term}${r.session_name ? ` · ${r.session_name}` : ""}`;
    if (!byTerm[k]) byTerm[k] = [];
    byTerm[k].push(r);
  });
  const terms = Object.keys(byTerm);
  const avg = data.results.length > 0
    ? Math.round(data.results.reduce((s, r) => s + ((r.score ?? 0) / r.max_score * 100), 0) / data.results.length)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Results</h1>
        <p className="text-sm text-ink-500 mt-0.5">{data.classLevel?.name ?? "No class"} · {data.results.length} published result{data.results.length === 1 ? "" : "s"}</p>
      </div>

      {avg != null && (
        <div className="card p-5 flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-ink-950">{avg}%</p>
            <p className="text-xs text-ink-500">Overall average across {data.results.length} result{data.results.length === 1 ? "" : "s"}</p>
          </div>
        </div>
      )}

      {data.results.length === 0 ? (
        <EmptyState icon={<FileBarChart className="h-7 w-7" />} title="No results published yet" description="Your results will appear here once your teachers upload them and the school admin approves." />
      ) : (
        <div className="space-y-4">
          {terms.map((term) => (
            <div key={term} className="card">
              <div className="border-b border-ink-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-ink-900">{term}</h2>
              </div>
              <div className="divide-y divide-ink-100">
                {byTerm[term].map((r) => {
                  const pct = r.max_score > 0 ? Math.round((r.score ?? 0) / r.max_score * 100) : 0;
                  return (
                    <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-900 truncate">{r.subject}</p>
                        {r.teacher_remark && <p className="text-xs text-ink-500 mt-0.5 line-clamp-1">{r.teacher_remark}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-ink-950">{r.score ?? "—"}/{r.max_score}</p>
                        <p className="text-xs text-ink-400">{pct}%</p>
                      </div>
                      {r.grade && <Badge tone="brand">{r.grade}</Badge>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
