import { Link } from "../../lib/router";
import { useTeacherData } from "../../lib/useTeacherData";
import { Badge, EmptyState } from "../../components/ui";
import { formatDate, relativeTime } from "../../lib/format";
import {
  ClipboardList, MonitorSmartphone, CalendarCheck, FileBarChart,
  CalendarDays, ArrowRight, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";

export function TeacherDashboardPage() {
  const data = useTeacherData();
  if (data.loading) return null;

  const pendingSubs = data.assignments.reduce((s, a) => s + a.submissions.filter((x) => x.status === "submitted").length, 0);
  const pendingCbt = data.cbtExams.filter((c) => c.approval_status === "pending").length;
  const pendingDrafts = data.resultDrafts.filter((r) => r.approval_status === "pending").length;
  const approvedCbt = data.cbtExams.filter((c) => c.approval_status === "approved").length;
  const todayIdx = new Date().getDay();
  const todaySlots = data.timetable.filter((t) => t.day_of_week === todayIdx);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Welcome, {data.teacher?.full_name?.split(" ")[0] ?? "Teacher"}</h1>
        <p className="text-sm text-ink-500 mt-0.5">{data.school?.name} · {data.classes.length} class{data.classes.length === 1 ? "" : "es"} assigned</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<ClipboardList />} tone="ocean" label="Pending submissions" value={pendingSubs} sub="to grade" link="/teacher/assignments" />
        <Stat icon={<MonitorSmartphone />} tone="brand" label="CBT exams" value={data.cbtExams.length} sub={`${approvedCbt} approved · ${pendingCbt} pending`} link="/teacher/cbt" />
        <Stat icon={<FileBarChart />} tone="gold" label="Result drafts" value={data.resultDrafts.length} sub={`${pendingDrafts} awaiting admin`} link="/teacher/results" />
        <Stat icon={<CalendarDays />} tone="rose" label="Classes" value={data.classes.length} sub="this session" link="/teacher/timetable" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Today's timetable */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-semibold text-ink-900">Today's schedule</h2>
            </div>
            <Link to="/teacher/timetable" className="text-sm font-medium text-brand-700 hover:underline">Full timetable</Link>
          </div>
          {todaySlots.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">No classes scheduled today.</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {todaySlots.map((slot) => (
                <div key={slot.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                    P{slot.period}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{slot.subject?.name ?? "—"}</p>
                    <p className="text-xs text-ink-500">{slot.class?.name ?? "—"}{slot.room ? ` · ${slot.room}` : ""}</p>
                  </div>
                  <p className="text-xs text-ink-400">{slot.start_time ?? "—"} - {slot.end_time ?? "—"}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending submissions */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold-600" />
              <h2 className="text-base font-semibold text-ink-900">Needs grading</h2>
            </div>
            <Link to="/teacher/assignments" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          {pendingSubs === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">All caught up.</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {data.assignments
                .filter((a) => a.submissions.some((s) => s.status === "submitted"))
                .slice(0, 5)
                .map((a) => (
                  <Link key={a.id} to="/teacher/assignments" className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900 truncate">{a.title}</p>
                      <p className="text-xs text-ink-500">{a.class?.name} · {a.submissions.filter((s) => s.status === "submitted").length} to grade</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-ink-300" />
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent assignments */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">Recent assignments</h2>
          <Link to="/teacher/assignments" className="text-sm font-medium text-brand-700 hover:underline">Manage</Link>
        </div>
        {data.assignments.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="No assignments yet" description="Create your first assignment, test, exam, or project." />
        ) : (
          <div className="divide-y divide-ink-100">
            {data.assignments.slice(0, 6).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{a.title}</p>
                  <p className="text-xs text-ink-500">{a.class?.name} · {a.kind} · {relativeTime(a.created_at)}</p>
                </div>
                {a.due_date && <Badge tone="neutral">Due {formatDate(a.due_date)}</Badge>}
                <Badge tone={a.status === "published" ? "brand" : "neutral"}>{a.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingCbt > 0 && (
        <div className="card p-5 bg-gold-50 ring-gold-100">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-gold-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gold-900">{pendingCbt} CBT exam{pendingCbt === 1 ? "" : "s"} awaiting admin approval</p>
              <p className="text-xs text-gold-800 mt-0.5">Students cannot take these exams until the school admin approves them.</p>
            </div>
            <Link to="/teacher/cbt" className="ml-auto text-sm font-medium text-gold-900 hover:underline">Review</Link>
          </div>
        </div>
      )}

      {pendingDrafts > 0 && (
        <div className="card p-5 bg-ocean-50 ring-ocean-100">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-ocean-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-ocean-900">{pendingDrafts} result draft{pendingDrafts === 1 ? "" : "s"} awaiting admin approval</p>
              <p className="text-xs text-ocean-800 mt-0.5">Once approved, results will be published to students and parents.</p>
            </div>
            <Link to="/teacher/results" className="ml-auto text-sm font-medium text-ocean-900 hover:underline">Review</Link>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, tone, label, value, sub, link }: { icon: React.ReactNode; tone: "ocean" | "brand" | "gold" | "rose"; label: string; value: string | number; sub: string; link: string }) {
  const tones = { ocean: "bg-ocean-100 text-ocean-700", brand: "bg-brand-100 text-brand-700", gold: "bg-gold-100 text-gold-700", rose: "bg-rose-100 text-rose-700" };
  return (
    <Link to={link} className="card card-hover p-5 block">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xl font-extrabold text-ink-950 truncate">{value}</p>
          <p className="text-xs text-ink-500">{label}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-400 truncate">{sub}</p>
    </Link>
  );
}
