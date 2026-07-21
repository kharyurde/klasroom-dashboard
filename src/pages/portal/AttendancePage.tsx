import { Link } from "../../lib/router";
import { useParentData } from "../../lib/useParentData";
import { EmptyState, Badge } from "../../components/ui";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Calendar, Plus, CheckCircle2, XCircle, Clock as ClockIcon } from "lucide-react";
import { formatDate } from "../../lib/format";
import type { AttendanceRow, Enrollment } from "../../lib/types";

export function AttendancePage() {
  const data = useParentData();
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  useEffect(() => {
    if (!data.activeWardId) return;
    (async () => {
      const { data: en } = await supabase.from("enrollments").select("*").eq("ward_id", data.activeWardId).eq("status", "active").maybeSingle();
      setEnrollment((en as Enrollment) ?? null);
      if (!en) { setAttendance([]); return; }
      const { data: a } = await supabase.from("attendance").select("*").eq("enrollment_id", en.id).order("date", { ascending: false }).limit(60);
      setAttendance((a as AttendanceRow[]) ?? []);
    })();
  }, [data.activeWardId]);

  if (data.loading) return null;
  if (data.wards.length === 0) {
    return <EmptyState icon={<Calendar className="h-7 w-7" />} title="No attendance" description="Add a ward to get started."
      action={<Link to="/portal/wards/new" className="btn-primary"><Plus className="h-4 w-4" /> Add ward</Link>} />;
  }

  const present = attendance.filter((a) => a.status === "present").length;
  const absent = attendance.filter((a) => a.status === "absent").length;
  const late = attendance.filter((a) => a.status === "late").length;
  const rate = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Attendance</h1>
        <p className="text-sm text-ink-500 mt-0.5">Attendance record for {data.activeWard?.first_name} {data.activeWard?.last_name}.</p>
      </div>

      {!enrollment ? (
        <EmptyState icon={<Calendar className="h-7 w-7" />} title="Not enrolled" description="Attendance appears once your child is enrolled and the school records it." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Attendance rate" value={`${rate}%`} tone="brand" />
            <Stat label="Present" value={present} tone="brand" />
            <Stat label="Absent" value={absent} tone="rose" />
            <Stat label="Late" value={late} tone="gold" />
          </div>

          {attendance.length === 0 ? (
            <EmptyState icon={<Calendar className="h-7 w-7" />} title="No records yet" description="The school hasn't recorded attendance yet." />
          ) : (
            <div className="card">
              <div className="border-b border-ink-100 px-5 py-4">
                <h2 className="text-base font-semibold text-ink-900">Recent records</h2>
              </div>
              <div className="divide-y divide-ink-100">
                {attendance.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                    {a.status === "present" && <CheckCircle2 className="h-5 w-5 text-brand-600" />}
                    {a.status === "absent" && <XCircle className="h-5 w-5 text-rose-600" />}
                    {a.status === "late" && <ClockIcon className="h-5 w-5 text-gold-600" />}
                    {a.status === "excused" && <ClockIcon className="h-5 w-5 text-ocean-600" />}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-ink-900">{formatDate(a.date)}</p>
                      {a.note && <p className="text-xs text-ink-500">{a.note}</p>}
                    </div>
                    <Badge tone={a.status === "present" ? "brand" : a.status === "absent" ? "rose" : a.status === "late" ? "gold" : "ocean"}>
                      {a.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: "brand" | "rose" | "gold" }) {
  const tones = { brand: "text-brand-700", rose: "text-rose-700", gold: "text-gold-700" };
  return (
    <div className="card p-5">
      <p className="text-xs text-ink-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-extrabold mt-1 ${tones[tone]}`}>{value}</p>
    </div>
  );
}
