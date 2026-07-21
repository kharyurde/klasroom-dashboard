import { useTeacherData } from "../../lib/useTeacherData";
import { EmptyState } from "../../components/ui";
import { CalendarDays } from "lucide-react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function TeacherTimetablePage() {
  const data = useTeacherData();
  if (data.loading) return null;

  const byDay: Record<number, typeof data.timetable> = {};
  data.timetable.forEach((slot) => {
    if (!byDay[slot.day_of_week]) byDay[slot.day_of_week] = [];
    byDay[slot.day_of_week].push(slot);
  });
  const dayList = [1, 2, 3, 4, 5, 0, 6];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Timetable</h1>
        <p className="text-sm text-ink-500 mt-0.5">Your weekly teaching schedule.</p>
      </div>

      {data.timetable.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="No timetable slots" description="The school admin assigns your teaching slots. None assigned yet." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dayList.map((d) => {
            const slots = (byDay[d] ?? []).sort((a, b) => a.period - b.period);
            if (slots.length === 0) return null;
            return (
              <div key={d} className="card">
                <div className="border-b border-ink-100 px-4 py-3 flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">{DAYS[d].slice(0, 3)}</div>
                  <h2 className="text-sm font-semibold text-ink-900">{DAYS[d]}</h2>
                </div>
                <div className="divide-y divide-ink-100">
                  {slots.map((s) => (
                    <div key={s.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-ink-900">{s.subject?.name ?? "—"}</p>
                        <span className="text-[10px] font-bold text-ink-400">P{s.period}</span>
                      </div>
                      <p className="text-xs text-ink-500 mt-0.5">{s.class?.name}{s.room ? ` · ${s.room}` : ""}</p>
                      <p className="text-xs text-ink-400 mt-0.5">{s.start_time ?? "—"} - {s.end_time ?? "—"}</p>
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
