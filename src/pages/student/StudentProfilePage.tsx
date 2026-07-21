import { useStudentData } from "../../lib/useStudentData";
import { Badge } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { Mail, GraduationCap, Hash, Calendar } from "lucide-react";

export function StudentProfilePage() {
  const data = useStudentData();
  if (data.loading) return null;
  const s = data.student;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Profile</h1>
        <p className="text-sm text-ink-500 mt-0.5">Your student profile at {data.school?.name}.</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-100 text-brand-700 text-xl font-bold">
            {s?.full_name?.[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink-900 truncate">{s?.full_name}</p>
            <p className="text-xs text-ink-500">{s?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone={s?.status === "active" ? "brand" : "gold"}>{s?.status}</Badge>
              {data.classLevel && <Badge tone="ocean">{data.classLevel.name}</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-ink-900 mb-3">Student information</h2>
        <div className="space-y-3 text-sm">
          <Row icon={<Mail className="h-4 w-4" />} label="School email" value={s?.email} />
          <Row icon={<Hash className="h-4 w-4" />} label="Admission number" value={s?.admission_number} />
          <Row icon={<GraduationCap className="h-4 w-4" />} label="Class" value={data.classLevel?.name} />
          <Row icon={<Calendar className="h-4 w-4" />} label="Enrolled since" value={s ? formatDate(s.created_at) : null} />
        </div>
      </div>

      {data.myClubs.length > 0 && (
        <div className="card p-5">
          <h2 className="text-base font-semibold text-ink-900 mb-3">My clubs ({data.myClubs.length})</h2>
          <div className="flex flex-wrap gap-2">
            {data.myClubs.map((c) => <Badge key={c.id} tone="brand">{c.name}</Badge>)}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink-50 text-ink-500">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-sm font-medium text-ink-900 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}
