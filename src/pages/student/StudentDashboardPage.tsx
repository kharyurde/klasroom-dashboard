import { Link } from "../../lib/router";
import { useStudentData } from "../../lib/useStudentData";
import { Badge, EmptyState } from "../../components/ui";
import { formatDate, relativeTime } from "../../lib/format";
import {
  ClipboardList, MonitorSmartphone, FileBarChart, CalendarDays, Sparkles,
  ArrowRight, Clock, TrendingUp,
} from "lucide-react";

export function StudentDashboardPage() {
  const data = useStudentData();
  if (data.loading) return null;

  const pendingAssign = data.assignments.filter((a) => !a.mySubmission && a.status === "published");
  const pendingExams = data.cbtExams.filter((c) => c.status === "active" && (!c.myAttempt || c.myAttempt.status === "in_progress"));
  const upcomingEvents = data.calendarEvents
    .filter((e) => new Date(e.start_date) >= new Date(new Date().toDateString()))
    .slice(0, 4);
  const avgScore = data.results.length > 0
    ? Math.round(data.results.reduce((s, r) => s + ((r.score ?? 0) / r.max_score * 100), 0) / data.results.length)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Hi, {data.student?.full_name?.split(" ")[0] ?? "Student"}</h1>
        <p className="text-sm text-ink-500 mt-0.5">{data.school?.name} · {data.classLevel?.name ?? "No class assigned"}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<ClipboardList />} tone="ocean" label="Pending assignments" value={pendingAssign.length} sub="to submit" link="/student/assignments" />
        <Stat icon={<MonitorSmartphone />} tone="brand" label="Active exams" value={pendingExams.length} sub="to take" link="/student/exams" />
        <Stat icon={<FileBarChart />} tone="gold" label="Results" value={data.results.length} sub={avgScore != null ? `avg ${avgScore}%` : "published"} link="/student/results" />
        <Stat icon={<Sparkles />} tone="rose" label="Clubs" value={data.myClubs.length} sub="joined" link="/student/clubs" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Pending assignments */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold-600" />
              <h2 className="text-base font-semibold text-ink-900">To-do</h2>
            </div>
            <Link to="/student/assignments" className="text-sm font-medium text-brand-700 hover:underline">All</Link>
          </div>
          {pendingAssign.length === 0 && pendingExams.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">All caught up.</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {pendingAssign.slice(0, 3).map((a) => (
                <Link key={a.id} to="/student/assignments" className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{a.title}</p>
                    <p className="text-xs text-ink-500">{a.subject?.name ?? "General"} · {a.kind}</p>
                  </div>
                  {a.due_date && <Badge tone="neutral">Due {formatDate(a.due_date)}</Badge>}
                  <ArrowRight className="h-4 w-4 text-ink-300" />
                </Link>
              ))}
              {pendingExams.slice(0, 2).map((c) => (
                <Link key={c.id} to="/student/exams" className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{c.title}</p>
                    <p className="text-xs text-ink-500">{c.subject?.name ?? "General"} · {c.duration_minutes} min</p>
                  </div>
                  <Badge tone="brand">Take exam</Badge>
                  <ArrowRight className="h-4 w-4 text-ink-300" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming events */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-semibold text-ink-900">Upcoming</h2>
            </div>
            <Link to="/student/calendar" className="text-sm font-medium text-brand-700 hover:underline">Calendar</Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">No upcoming events.</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                    {new Date(e.start_date).getDate()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{e.title}</p>
                    <p className="text-xs text-ink-500 capitalize">{e.event_type} · {formatDate(e.start_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent results */}
      {data.results.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-semibold text-ink-900">Recent results</h2>
            </div>
            <Link to="/student/results" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-ink-100">
            {data.results.slice(0, 5).map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{r.subject}</p>
                  <p className="text-xs text-ink-500">{r.term}{r.session_name ? ` · ${r.session_name}` : ""} · {relativeTime(r.created_at)}</p>
                </div>
                <span className="text-sm font-bold text-ink-950">{r.score ?? "—"}/{r.max_score}</span>
                {r.grade && <Badge tone="brand">{r.grade}</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.classLevel == null && (
        <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="No active class enrollment" description="Please contact your school admin to assign you to a class." />
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
