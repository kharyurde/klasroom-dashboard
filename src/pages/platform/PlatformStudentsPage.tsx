import { useState } from "react";
import { usePlatformData } from "../../lib/usePlatformData";
import { Badge, EmptyState, Spinner } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { GraduationCap, Search } from "lucide-react";

export function PlatformStudentsPage() {
  const data = usePlatformData();
  const [query, setQuery] = useState("");

  if (data.loading) return <div className="grid place-items-center py-20"><Spinner className="text-brand-600" size={28} /></div>;

  const schoolMap = new Map(data.schools.map((s) => [s.id, s]));
  const filtered = data.allStudents.filter((s) =>
    s.full_name.toLowerCase().includes(query.toLowerCase()) ||
    s.email.toLowerCase().includes(query.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Students</h1>
        <p className="text-sm text-ink-500 mt-0.5">{data.allStudents.length} students across all schools.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <input className="input pl-10" placeholder="Search by name, email, or admission number…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="No students found" description={query ? "Try a different search." : "No students enrolled yet."} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">School</th>
                <th className="px-4 py-3 font-medium">Admission No.</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-semibold shrink-0">
                        {s.full_name?.[0] ?? "?"}
                      </div>
                      <span className="font-medium text-ink-900 truncate">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink-600 truncate max-w-40">{schoolMap.get(s.school_id)?.name ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600 font-mono text-xs">{s.admission_number ?? "—"}</td>
                  <td className="px-4 py-3 text-ink-600 truncate max-w-48">{s.email}</td>
                  <td className="px-4 py-3 text-ink-500 whitespace-nowrap">{formatDate(s.created_at)}</td>
                  <td className="px-4 py-3"><Badge tone={s.status === "active" ? "brand" : "neutral"}>{s.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
