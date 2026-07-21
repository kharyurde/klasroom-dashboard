import { useAdminData } from "../../lib/useAdminData";
import { Badge, EmptyState } from "../../components/ui";
import { formatMoney, formatDate } from "../../lib/format";
import { GraduationCap, CreditCard } from "lucide-react";

export function AdminStudentsPage() {
  const data = useAdminData();
  if (data.loading) return null;

  const active = data.enrollments.filter((e) => e.status === "active");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Students</h1>
        <p className="text-sm text-ink-500 mt-0.5">{active.length} enrolled students at {data.school?.name}.</p>
      </div>

      {active.length === 0 ? (
        <EmptyState icon={<GraduationCap className="h-7 w-7" />} title="No enrolled students yet" description="Once you approve applications and enroll students, they'll appear here." />
      ) : (
        <div className="card">
          <div className="divide-y divide-ink-100">
            {active.map((e) => {
              const cls = data.classes.find((c) => c.id === e.class_id);
              return (
                <div key={e.id} className="flex items-center gap-4 p-4">
                  <div className="h-11 w-11 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-sm font-semibold shrink-0">
                    {e.ward?.first_name?.[0]}{e.ward?.last_name?.[0]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{e.ward?.first_name} {e.ward?.last_name}</p>
                    <p className="text-xs text-ink-500">{cls?.name ?? "—"} · Enrolled {formatDate(e.enrolled_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-ink-400">Reg. No.</p>
                    <p className="text-sm font-bold text-ink-900">{e.registration_number ?? "—"}</p>
                  </div>
                  <Badge tone="brand">Active</Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}