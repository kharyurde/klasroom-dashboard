import { useEffect, useState } from "react";
import { useAdminData } from "../../lib/useAdminData";
import { useToast } from "../../lib/toast";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { formatDate } from "../../lib/format";
import type { Subject, CbtExam, ResultDraft, CalendarEvent, Club } from "../../lib/types";
import {
  BookOpen, MonitorSmartphone, FileBarChart, CalendarDays, Sparkles,
  Plus, Trash2, Check, X, Pencil,
} from "lucide-react";

type Tab = "subjects" | "cbt" | "results" | "calendar" | "clubs";

export function AdminAcademicPage() {
  const data = useAdminData();
  const [tab, setTab] = useState<Tab>("subjects");

  if (data.loading) return null;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "subjects", label: "Subjects", icon: BookOpen },
    { key: "cbt", label: "CBT approvals", icon: MonitorSmartphone },
    { key: "results", label: "Result drafts", icon: FileBarChart },
    { key: "calendar", label: "Calendar", icon: CalendarDays },
    { key: "clubs", label: "Clubs", icon: Sparkles },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Academic</h1>
        <p className="text-sm text-ink-500 mt-0.5">Manage subjects, approve CBT exams & result drafts, publish calendar events and clubs.</p>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl bg-white ring-1 ring-ink-100 p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === t.key ? "bg-brand-600 text-white" : "text-ink-600 hover:bg-ink-50"}`}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "subjects" && <SubjectsTab schoolId={data.school?.id ?? ""} classes={data.classes} />}
      {tab === "cbt" && <CbtTab schoolId={data.school?.id ?? ""} classes={data.classes} />}
      {tab === "results" && <ResultsTab schoolId={data.school?.id ?? ""} classes={data.classes} />}
      {tab === "calendar" && <CalendarTab schoolId={data.school?.id ?? ""} />}
      {tab === "clubs" && <ClubsTab schoolId={data.school?.id ?? ""} />}
    </div>
  );
}

// ============ Subjects ============
function SubjectsTab({ schoolId, classes }: { schoolId: string; classes: any[] }) {
  const toast = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", classId: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data } = await supabase.from("subjects").select("*").eq("school_id", schoolId).order("name");
    setSubjects((data as Subject[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [schoolId]);

  const save = async () => {
    if (!form.name) { toast({ kind: "error", title: "Name required" }); return; }
    setSaving(true);
    const { error } = await supabase.from("subjects").insert({
      school_id: schoolId, name: form.name, code: form.code || null, class_id: form.classId || null,
    });
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Subject added" });
    setModal(false); setForm({ name: "", code: "", classId: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this subject?")) return;
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Deleted" }); load(); }
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-600">{subjects.length} subject{subjects.length === 1 ? "" : "s"}</p>
        <Button onClick={() => setModal(true)} className="text-xs"><Plus className="h-4 w-4" /> Add subject</Button>
      </div>
      {subjects.length === 0 ? (
        <EmptyState icon={<BookOpen className="h-7 w-7" />} title="No subjects" description="Add subjects so teachers can tag assignments and results." />
      ) : (
        <div className="card">
          <div className="divide-y divide-ink-100">
            {subjects.map((s) => {
              const cls = classes.find((c) => c.id === s.class_id);
              return (
                <div key={s.id} className="flex items-center gap-3 p-4">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-brand-700"><BookOpen className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{s.name}</p>
                    <p className="text-xs text-ink-500">{s.code ?? "—"} · {cls?.name ?? "All classes"}</p>
                  </div>
                  <button onClick={() => remove(s.id)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Add subject">
        <div className="space-y-4">
          <div>
            <label className="label">Subject name</label>
            <input className="input" placeholder="Mathematics" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Code (optional)</label>
              <input className="input" placeholder="MTH" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            </div>
            <div>
              <label className="label">Class (optional)</label>
              <select className="input" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">All classes</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={save} loading={saving} className="w-full">Add subject</Button>
        </div>
      </Modal>
    </div>
  );
}

// ============ CBT approvals ============
function CbtTab({ schoolId, classes }: { schoolId: string; classes: any[] }) {
  const toast = useToast();
  const [exams, setExams] = useState<(CbtExam & { teacher?: any; subject?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteModal, setNoteModal] = useState<{ exam: CbtExam; action: "approved" | "rejected" } | null>(null);
  const [note, setNote] = useState("");

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data } = await supabase.from("cbt_exams").select("*, teacher:teachers(*), subject:subjects(*)").eq("school_id", schoolId).order("created_at", { ascending: false });
    setExams((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [schoolId]);

  const decide = async () => {
    if (!noteModal) return;
    const { error } = await supabase.from("cbt_exams").update({
      approval_status: noteModal.action, approval_note: note || null,
    }).eq("id", noteModal.exam.id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: `Exam ${noteModal.action}` }); load(); }
    setNoteModal(null); setNote("");
  };

  if (loading) return null;
  const pending = exams.filter((e) => e.approval_status === "pending");
  const decided = exams.filter((e) => e.approval_status !== "pending");

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="card">
          <div className="border-b border-ink-100 px-5 py-3 flex items-center gap-2">
            <MonitorSmartphone className="h-5 w-5 text-gold-600" />
            <h2 className="text-sm font-semibold text-ink-900">Awaiting approval ({pending.length})</h2>
          </div>
          <div className="divide-y divide-ink-100">
            {pending.map((e) => (
              <div key={e.id} className="flex items-start gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{e.title}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{e.teacher?.full_name ?? "—"} · {e.subject?.name ?? "General"} · {classes.find((c) => c.id === e.class_id)?.name ?? "—"} · {e.duration_minutes} min</p>
                </div>
                <div className="flex gap-1">
                  <Button variant="secondary" className="text-xs" onClick={() => { setNoteModal({ exam: e, action: "approved" }); setNote(""); }}>
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button variant="danger" className="text-xs" onClick={() => { setNoteModal({ exam: e, action: "rejected" }); setNote(""); }}>
                    <X className="h-3.5 w-3.5" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {decided.length > 0 && (
        <div className="card">
          <div className="border-b border-ink-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-ink-900">Reviewed ({decided.length})</h2>
          </div>
          <div className="divide-y divide-ink-100">
            {decided.map((e) => (
              <div key={e.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{e.title}</p>
                  <p className="text-xs text-ink-500">{e.teacher?.full_name} · {classes.find((c) => c.id === e.class_id)?.name}</p>
                  {e.approval_note && <p className="text-xs text-ink-600 mt-0.5">Note: {e.approval_note}</p>}
                </div>
                <Badge tone={e.approval_status === "approved" ? "brand" : "rose"}>{e.approval_status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {exams.length === 0 && (
        <EmptyState icon={<MonitorSmartphone className="h-7 w-7" />} title="No CBT exams" description="Teachers' objective exams will appear here for your approval." />
      )}

      <Modal open={!!noteModal} onClose={() => setNoteModal(null)} title={noteModal?.action === "approved" ? "Approve exam" : "Reject exam"}>
        <div className="space-y-4">
          <p className="text-sm text-ink-600">{noteModal?.exam.title}</p>
          <div>
            <label className="label">Note (optional)</label>
            <textarea className="input min-h-20" placeholder={noteModal?.action === "rejected" ? "Reason for rejection…" : "Feedback for teacher…"} value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button onClick={decide} variant={noteModal?.action === "approved" ? "primary" : "danger"} className="w-full">
            {noteModal?.action === "approved" ? "Approve exam" : "Reject exam"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ============ Result drafts ============
function ResultsTab({ schoolId, classes }: { schoolId: string; classes: any[] }) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<(ResultDraft & { teacher?: any; subject?: any; ward?: any })[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [acting, setActing] = useState<{ draft: ResultDraft & { teacher?: any; subject?: any; ward?: any }; action: "approved" | "rejected" } | null>(null);

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data } = await supabase.from("result_drafts").select("*, teacher:teachers(*), subject:subjects(*), ward:wards(*)").eq("school_id", schoolId).order("created_at", { ascending: false });
    setDrafts((data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [schoolId]);

  const decide = async () => {
    if (!acting || !schoolId) return;
    const { error } = await supabase.from("result_drafts").update({
      approval_status: acting.action, approval_note: note || null, reviewed_at: new Date().toISOString(),
    }).eq("id", acting.draft.id);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    if (acting.action === "approved") {
      // Publish to results table
      const d = acting.draft;
      const { error: rErr } = await supabase.from("results").insert({
        enrollment_id: d.enrollment_id, ward_id: d.ward_id, school_id: schoolId,
        term: d.term, session_name: d.session_name, subject: d.subject?.name ?? "Subject",
        score: d.score, max_score: d.max_score, grade: d.grade, teacher_remark: d.teacher_remark,
        published: true,
      });
      if (rErr) toast({ kind: "error", title: "Publish error", message: rErr.message });
    }
    toast({ kind: "success", title: `Draft ${acting.action}` });
    setActing(null); setNote("");
    load();
  };

  if (loading) return null;
  const pending = drafts.filter((d) => d.approval_status === "pending");
  const reviewed = drafts.filter((d) => d.approval_status !== "pending");

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="card">
          <div className="border-b border-ink-100 px-5 py-3 flex items-center gap-2">
            <FileBarChart className="h-5 w-5 text-gold-600" />
            <h2 className="text-sm font-semibold text-ink-900">Awaiting approval ({pending.length})</h2>
          </div>
          <div className="divide-y divide-ink-100">
            {pending.map((d) => (
              <div key={d.id} className="flex items-start gap-3 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{d.ward?.first_name} {d.ward?.last_name}</p>
                  <p className="text-xs text-ink-500 mt-0.5">{d.subject?.name} · {classes.find((c) => c.id === d.class_id)?.name} · {d.term}{d.session_name ? ` · ${d.session_name}` : ""}</p>
                  <p className="text-sm font-bold text-ink-950 mt-1">{d.score ?? "—"}/{d.max_score}{d.grade ? ` · ${d.grade}` : ""}</p>
                  {d.teacher_remark && <p className="text-xs text-ink-600 mt-0.5">Remark: {d.teacher_remark}</p>}
                </div>
                <div className="flex gap-1">
                  <Button variant="secondary" className="text-xs" onClick={() => { setActing({ draft: d, action: "approved" }); setNote(""); }}><Check className="h-3.5 w-3.5" /> Approve</Button>
                  <Button variant="danger" className="text-xs" onClick={() => { setActing({ draft: d, action: "rejected" }); setNote(""); }}><X className="h-3.5 w-3.5" /> Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="card">
          <div className="border-b border-ink-100 px-5 py-3"><h2 className="text-sm font-semibold text-ink-900">Reviewed ({reviewed.length})</h2></div>
          <div className="divide-y divide-ink-100">
            {reviewed.map((d) => (
              <div key={d.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{d.ward?.first_name} {d.ward?.last_name} · {d.subject?.name}</p>
                  <p className="text-xs text-ink-500">{d.score ?? "—"}/{d.max_score} · {d.term}</p>
                  {d.approval_note && <p className="text-xs text-ink-600 mt-0.5">Note: {d.approval_note}</p>}
                </div>
                <Badge tone={d.approval_status === "approved" ? "brand" : "rose"}>{d.approval_status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {drafts.length === 0 && (
        <EmptyState icon={<FileBarChart className="h-7 w-7" />} title="No result drafts" description="Teacher-uploaded result drafts will appear here for approval before publishing." />
      )}

      <Modal open={!!acting} onClose={() => setActing(null)} title={acting?.action === "approved" ? "Approve result draft" : "Reject result draft"}>
        <div className="space-y-4">
          <p className="text-sm text-ink-600">{acting?.draft.ward?.first_name} {acting?.draft.ward?.last_name} · {acting?.draft.subject?.name}</p>
          {acting?.action === "approved" && <p className="text-xs text-brand-700 bg-brand-50 rounded-lg p-3">Approving will publish this result to the student and parent.</p>}
          <div>
            <label className="label">Note (optional)</label>
            <textarea className="input min-h-20" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <Button onClick={decide} variant={acting?.action === "approved" ? "primary" : "danger"} className="w-full">
            {acting?.action === "approved" ? "Approve & publish" : "Reject draft"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ============ Calendar ============
function CalendarTab({ schoolId }: { schoolId: string }) {
  const toast = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", eventType: "event" as CalendarEvent["event_type"], startDate: "", endDate: "", audience: "all" as CalendarEvent["audience"] });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data } = await supabase.from("calendar_events").select("*").eq("school_id", schoolId).order("start_date", { ascending: false });
    setEvents((data as CalendarEvent[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [schoolId]);

  const save = async () => {
    if (!form.title || !form.startDate) { toast({ kind: "error", title: "Title and start date required" }); return; }
    setSaving(true);
    const { error } = await supabase.from("calendar_events").insert({
      school_id: schoolId, title: form.title, description: form.description || null,
      event_type: form.eventType, start_date: form.startDate, end_date: form.endDate || null, audience: form.audience,
    });
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Event added" });
    setModal(false); setForm({ title: "", description: "", eventType: "event", startDate: "", endDate: "", audience: "all" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this event?")) return;
    const { error } = await supabase.from("calendar_events").delete().eq("id", id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Deleted" }); load(); }
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-600">{events.length} event{events.length === 1 ? "" : "s"}</p>
        <Button onClick={() => setModal(true)} className="text-xs"><Plus className="h-4 w-4" /> Add event</Button>
      </div>
      {events.length === 0 ? (
        <EmptyState icon={<CalendarDays className="h-7 w-7" />} title="No calendar events" description="Publish events that students and teachers see on their calendars." />
      ) : (
        <div className="card">
          <div className="divide-y divide-ink-100">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-3 p-4">
                <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-100 text-brand-700 text-xs font-bold">
                  {new Date(e.start_date).getDate()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{e.title}</p>
                  <p className="text-xs text-ink-500 capitalize">{e.event_type} · {formatDate(e.start_date)}{e.end_date ? ` — ${formatDate(e.end_date)}` : ""} · {e.audience}</p>
                </div>
                <button onClick={() => remove(e.id)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Add calendar event">
        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-16" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value as any })}>
                {["event", "exam", "holiday", "activity", "meeting", "deadline"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Audience</label>
              <select className="input" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value as any })}>
                {["all", "students", "teachers", "parents"].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Start date</label>
              <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </div>
            <div>
              <label className="label">End date (optional)</label>
              <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </div>
          </div>
          <Button onClick={save} loading={saving} className="w-full">Add event</Button>
        </div>
      </Modal>
    </div>
  );
}

// ============ Clubs ============
function ClubsTab({ schoolId }: { schoolId: string }) {
  const toast = useToast();
  const [clubs, setClubs] = useState<(Club & { teacher?: any; memberCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", meetingDay: "", meetingTime: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!schoolId) return;
    setLoading(true);
    const { data } = await supabase.from("clubs").select("*, teacher:teachers(*)").eq("school_id", schoolId).order("name");
    const list = (data as any[]) ?? [];
    const ids = list.map((c) => c.id);
    const { data: cm } = ids.length ? await supabase.from("club_members").select("club_id").in("club_id", ids) : { data: [] };
    const countMap = new Map<string, number>();
    ((cm as any[]) ?? []).forEach((m) => countMap.set(m.club_id, (countMap.get(m.club_id) ?? 0) + 1));
    setClubs(list.map((c) => ({ ...c, memberCount: countMap.get(c.id) ?? 0 })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [schoolId]);

  const save = async () => {
    if (!form.name) { toast({ kind: "error", title: "Name required" }); return; }
    setSaving(true);
    const { error } = await supabase.from("clubs").insert({
      school_id: schoolId, name: form.name, description: form.description || null,
      meeting_day: form.meetingDay || null, meeting_time: form.meetingTime || null,
    });
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Club created" });
    setModal(false); setForm({ name: "", description: "", meetingDay: "", meetingTime: "" });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this club? Members will be removed.")) return;
    const { error } = await supabase.from("clubs").delete().eq("id", id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Deleted" }); load(); }
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-600">{clubs.length} club{clubs.length === 1 ? "" : "s"}</p>
        <Button onClick={() => setModal(true)} className="text-xs"><Plus className="h-4 w-4" /> Add club</Button>
      </div>
      {clubs.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-7 w-7" />} title="No clubs yet" description="Create clubs and societies that students can join from their portal." />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {clubs.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700"><Sparkles className="h-5 w-5" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900 truncate">{c.name}</p>
                  {c.description && <p className="text-xs text-ink-600 mt-1 line-clamp-2">{c.description}</p>}
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-500">
                    {c.meeting_day && <span>{c.meeting_day}{c.meeting_time ? ` · ${c.meeting_time}` : ""}</span>}
                    <span>{c.memberCount} member{c.memberCount === 1 ? "" : "s"}</span>
                  </div>
                </div>
                <button onClick={() => remove(c.id)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Add club">
        <div className="space-y-4">
          <div>
            <label className="label">Club name</label>
            <input className="input" placeholder="Debate Club" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input min-h-16" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Meeting day</label>
              <input className="input" placeholder="Fridays" value={form.meetingDay} onChange={(e) => setForm({ ...form, meetingDay: e.target.value })} />
            </div>
            <div>
              <label className="label">Meeting time</label>
              <input className="input" placeholder="3:00 PM" value={form.meetingTime} onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} />
            </div>
          </div>
          <Button onClick={save} loading={saving} className="w-full">Add club</Button>
        </div>
      </Modal>
    </div>
  );
}
