import { useStudentData } from "../../lib/useStudentData";
import { Badge, EmptyState } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { CalendarDays } from "lucide-react";

const EVENT_TONE: Record<string, "brand" | "ocean" | "gold" | "rose" | "neutral"> = {
  event: "brand", exam: "rose", holiday: "ocean", activity: "gold", meeting: "neutral", deadline: "rose",
};

export function StudentCalendarPage() {
  const data = useStudentData();
  if (data.loading) return null;

  const events = data.calendarEvents;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const eventByDate = new Map<string, typeof events>();
  events.forEach((e) => {
    const k = e.start_date;
    const arr = eventByDate.get(k) ?? [];
    arr.push(e);
    eventByDate.set(k, arr);
  });
  const todayStr = now.toISOString().slice(0, 10);
  const monthName = now.toLocaleString("en-GB", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Calendar</h1>
        <p className="text-sm text-ink-500 mt-0.5">School activities, exams, holidays, and events.</p>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="No calendar events" description="Your school hasn't published any events yet." />
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {/* Calendar grid */}
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-ink-900 mb-3">{monthName}</h2>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-ink-400 mb-1">
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((d, i) => {
                if (d == null) return <div key={i} />;
                const dateStr = new Date(year, month, d).toISOString().slice(0, 10);
                const dayEvents = eventByDate.get(dateStr) ?? [];
                const isToday = dateStr === todayStr;
                return (
                  <div key={i} className={`aspect-square rounded-lg p-1 text-xs ${isToday ? "bg-brand-600 text-white font-bold" : dayEvents.length > 0 ? "bg-brand-50 text-brand-800" : "text-ink-600 hover:bg-ink-50"}`}>
                    <div>{d}</div>
                    {dayEvents.length > 0 && <div className="mt-0.5 flex justify-center gap-0.5">
                      {dayEvents.slice(0, 3).map((e, j) => <div key={j} className={`h-1 w-1 rounded-full ${isToday ? "bg-white" : "bg-brand-500"}`} />)}
                    </div>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event list */}
          <div className="card">
            <div className="border-b border-ink-100 px-5 py-4">
              <h2 className="text-base font-semibold text-ink-900">All events ({events.length})</h2>
            </div>
            <div className="divide-y divide-ink-100 max-h-[28rem] overflow-y-auto scrollbar-thin">
              {events.map((e) => (
                <div key={e.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                    {new Date(e.start_date).getDate()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{e.title}</p>
                    <p className="text-xs text-ink-500">{formatDate(e.start_date)}{e.end_date ? ` — ${formatDate(e.end_date)}` : ""}</p>
                    {e.description && <p className="text-xs text-ink-600 mt-1 line-clamp-2">{e.description}</p>}
                  </div>
                  <Badge tone={EVENT_TONE[e.event_type] ?? "neutral"} className="capitalize">{e.event_type}</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
