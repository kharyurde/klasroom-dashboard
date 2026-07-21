import { useState, useEffect } from "react";
import { useTeacherData } from "../../lib/useTeacherData";
import { useToast } from "../../lib/toast";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { CalendarCheck, Save } from "lucide-react";

type Status = "present" | "absent" | "late" | "excused";

export function TeacherAttendancePage() {
  const data = useTeacherData();
  const toast = useToast();
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const [saving, setSaving] = useState(false);

  const [classStudents, setClassStudents] = useState<{ id: string; full_name: string }[]>([]);

  if (data.loading) return null;

  const loadClassStudents = async (cId: string) => {
    if (!cId) { setClassStudents([]); return; }
    const { data: sces } = await supabase
      .from("student_class_enrollments")
      .select("student_id")
      .eq("class_id", cId)
      .eq("status", "active");
    const ids = ((sces as any[]) ?? []).map((r) => r.student_id);
    if (ids.length === 0) { setClassStudents([]); return; }
    const { data: studs } = await supabase.from("students").select("id, full_name").in("id", ids);
    setClassStudents((studs as any[]) ?? []);
  };

  // load students when class changes
  useEffect(() => {
    if (classId) loadClassStudents(classId);
    else setClassStudents([]);
  }, [classId]);

  const setStatus = (studentId: string, status: Status) => {
    setMarks((m) => ({ ...m, [studentId]: status }));
  };

  const markAll = (status: Status) => {
    const all: Record<string, Status> = {};
    classStudents.forEach((s) => { all[s.id] = status; });
    setMarks(all);
  };

  const save = async () => {
    if (!classId || !date) { toast({ kind: "error", title: "Class and date required" }); return; }
    const entries = Object.entries(marks);
    if (entries.length === 0) { toast({ kind: "error", title: "Mark at least one student" }); return; }
    setSaving(true);
    // We need ward_id and enrollment_id for each student. Fetch via student_class_enrollments joined to enrollments.
    const { data: sces } = await supabase
      .from("student_class_enrollments")
      .select("*, enrollment:enrollments(*)")
      .eq("class_id", classId)
      .eq("status", "active");
    const sceMap = new Map(((sces as any[]) ?? []).map((r) => [r.student_id, r]));
    const rows = entries
      .map(([studentId, status]) => {
        const sce = sceMap.get(studentId);
        if (!sce?.enrollment) return null;
        return {
          enrollment_id: sce.enrollment_id,
          ward_id: sce.enrollment.ward_id,
          school_id: data.school!.id,
          date,
          status,
        };
      })
      .filter(Boolean);
    if (rows.length === 0) { toast({ kind: "error", title: "No enrollments found for selected class" }); setSaving(false); return; }
    // Upsert (delete then insert for this date+enrollment)
    const enrollIds = rows.map((r: any) => r.enrollment_id);
    await supabase.from("attendance").delete().in("enrollment_id", enrollIds).eq("date", date);
    const { error } = await supabase.from("attendance").insert(rows);
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Attendance saved", message: `${rows.length} records for ${formatDate(date)}` });
    setMarks({});
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Attendance</h1>
        <p className="text-sm text-ink-500 mt-0.5">Mark daily attendance for your classes.</p>
      </div>

      <div className="card p-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Class</label>
            <select className="input" value={classId} onChange={(e) => { setClassId(e.target.value); setMarks({}); }}>
              <option value="">Select class</option>
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Date</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {!classId ? (
        <EmptyState icon={<CalendarCheck className="h-7 w-7" />} title="Select a class" description="Pick a class and date to mark attendance." />
      ) : classStudents.length === 0 ? (
        <EmptyState icon={<CalendarCheck className="h-7 w-7" />} title="No students" description="No active students found in this class." />
      ) : (
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-900">{classStudents.length} students</h2>
            <div className="flex gap-2">
              <Button variant="secondary" className="text-xs" onClick={() => markAll("present")}>All present</Button>
              <Button variant="secondary" className="text-xs" onClick={() => markAll("absent")}>All absent</Button>
            </div>
          </div>
          <div className="divide-y divide-ink-100">
            {classStudents.map((s) => {
              const status = marks[s.id];
              return (
                <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="h-9 w-9 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-xs font-semibold shrink-0">
                    {s.full_name?.[0] ?? "?"}
                  </div>
                  <p className="text-sm font-medium text-ink-900 flex-1 min-w-0 truncate">{s.full_name}</p>
                  <div className="flex gap-1">
                    {(["present", "absent", "late", "excused"] as Status[]).map((st) => (
                      <button key={st} onClick={() => setStatus(s.id, st)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${status === st ? TONE_ACTIVE[st] : "bg-ink-50 text-ink-600 hover:bg-ink-100"}`}>
                        {st[0].toUpperCase() + st.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-ink-100 p-4">
            <Button onClick={save} loading={saving} className="w-full"><Save className="h-4 w-4" /> Save attendance</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const TONE_ACTIVE: Record<Status, string> = {
  present: "bg-brand-600 text-white",
  absent: "bg-rose-600 text-white",
  late: "bg-gold-500 text-white",
  excused: "bg-ocean-600 text-white",
};
