import { useState } from "react";
import { useTeacherData, type CbtExamWithQuestions } from "../../lib/useTeacherData";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { formatDateTime } from "../../lib/format";
import type { CbtQuestion } from "../../lib/types";
import { MonitorSmartphone, Plus, Trash2, Send, Eye, CheckCircle2, XCircle } from "lucide-react";

type QuestionDraft = {
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "a" | "b" | "c" | "d";
  points: number;
};

const emptyQ: QuestionDraft = {
  question_text: "", option_a: "", option_b: "", option_c: "", option_d: "", correct_option: "a", points: 1,
};

export function TeacherCbtPage() {
  const data = useTeacherData();
  const toast = useToast();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [questions, setQuestions] = useState<QuestionDraft[]>([{ ...emptyQ }]);
  const [examForm, setExamForm] = useState({ title: "", description: "", classId: "", subjectId: "", duration: "60", startAt: "", endAt: "" });
  const [saving, setSaving] = useState(false);
  const [viewExam, setViewExam] = useState<CbtExamWithQuestions | null>(null);

  if (data.loading) return null;

  const openNew = () => {
    setExamForm({ title: "", description: "", classId: data.classes[0]?.id ?? "", subjectId: "", duration: "60", startAt: "", endAt: "" });
    setQuestions([{ ...emptyQ }]);
    setModal(true);
  };

  const addQ = () => setQuestions((q) => [...q, { ...emptyQ }]);
  const removeQ = (i: number) => setQuestions((q) => q.filter((_, idx) => idx !== i));
  const updateQ = (i: number, patch: Partial<QuestionDraft>) => setQuestions((q) => q.map((x, idx) => idx === i ? { ...x, ...patch } : x));

  const save = async () => {
    if (!user || !examForm.title || !examForm.classId) { toast({ kind: "error", title: "Title and class required" }); return; }
    const validQs = questions.filter((q) => q.question_text && q.option_a && q.option_b && q.option_c && q.option_d);
    if (validQs.length === 0) { toast({ kind: "error", title: "Add at least one complete question" }); return; }
    setSaving(true);
    const { data: exam, error } = await supabase.from("cbt_exams").insert({
      teacher_id: user.id,
      school_id: data.school!.id,
      subject_id: examForm.subjectId || null,
      class_id: examForm.classId,
      title: examForm.title,
      description: examForm.description || null,
      duration_minutes: Number(examForm.duration) || 60,
      start_at: examForm.startAt ? new Date(examForm.startAt).toISOString() : null,
      end_at: examForm.endAt ? new Date(examForm.endAt).toISOString() : null,
      approval_status: "pending",
    }).select().single();
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); setSaving(false); return; }
    const qRows = validQs.map((q, i) => ({
      cbt_exam_id: (exam as any).id,
      question_text: q.question_text,
      option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d,
      correct_option: q.correct_option,
      points: q.points,
      ord: i,
    }));
    const { error: qErr } = await supabase.from("cbt_questions").insert(qRows);
    setSaving(false);
    if (qErr) { toast({ kind: "error", title: "Questions error", message: qErr.message }); return; }
    toast({ kind: "success", title: "CBT exam created", message: "Submitted for admin approval." });
    setModal(false);
    data.reload();
  };

  const submitForApproval = async (exam: CbtExamWithQuestions) => {
    if (exam.questionCount === 0) { toast({ kind: "error", title: "Add questions first" }); return; }
    const { error } = await supabase.from("cbt_exams").update({ approval_status: "pending" }).eq("id", exam.id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Submitted for approval" }); data.reload(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this CBT exam and all its questions?")) return;
    const { error } = await supabase.from("cbt_exams").delete().eq("id", id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Deleted" }); data.reload(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">CBT Exams</h1>
          <p className="text-sm text-ink-500 mt-0.5">Create objective exams. Admin approval required before students can take them.</p>
        </div>
        <Button onClick={openNew} className="text-xs"><Plus className="h-4 w-4" /> New exam</Button>
      </div>

      {data.cbtExams.length === 0 ? (
        <EmptyState icon={<MonitorSmartphone className="h-7 w-7" />} title="No CBT exams yet" description="Create your first computer-based test with multiple-choice questions." action={<Button onClick={openNew} className="text-xs"><Plus className="h-4 w-4" /> New exam</Button>} />
      ) : (
        <div className="space-y-3">
          {data.cbtExams.map((c) => (
            <div key={c.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-ink-900">{c.title}</h3>
                    <ApprovalBadge status={c.approval_status} />
                  </div>
                  <p className="text-xs text-ink-500 mt-1">{c.class?.name} · {c.subject?.name ?? "General"} · {c.duration_minutes} min · {c.questionCount} Q · {c.attempts.length} attempt{c.attempts.length === 1 ? "" : "s"}</p>
                  {c.start_at && <p className="text-xs text-ink-500 mt-1">Opens {formatDateTime(c.start_at)}</p>}
                  {c.approval_note && <p className="text-xs text-rose-600 mt-1">Admin note: {c.approval_note}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="secondary" className="text-xs" onClick={() => setViewExam(c)}><Eye className="h-3.5 w-3.5" /> View</Button>
                  {c.approval_status === "rejected" && (
                    <Button variant="secondary" className="text-xs" onClick={() => submitForApproval(c)}><Send className="h-3.5 w-3.5" /> Resubmit</Button>
                  )}
                  <button onClick={() => remove(c.id)} className="text-ink-400 hover:text-rose-600 p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      <Modal open={modal} onClose={() => setModal(false)} title="New CBT exam" size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. JSS 1 Mathematics Objective Test" value={examForm.title} onChange={(e) => setExamForm({ ...examForm, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input min-h-16" value={examForm.description} onChange={(e) => setExamForm({ ...examForm, description: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Class</label>
              <select className="input" value={examForm.classId} onChange={(e) => setExamForm({ ...examForm, classId: e.target.value })}>
                <option value="">Select</option>
                {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <select className="input" value={examForm.subjectId} onChange={(e) => setExamForm({ ...examForm, subjectId: e.target.value })}>
                <option value="">General</option>
                {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration (minutes)</label>
              <input type="number" className="input" value={examForm.duration} onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })} />
            </div>
            <div>
              <label className="label">Opens at (optional)</label>
              <input type="datetime-local" className="input" value={examForm.startAt} onChange={(e) => setExamForm({ ...examForm, startAt: e.target.value })} />
            </div>
          </div>

          <div className="border-t border-ink-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-ink-900">Questions ({questions.length})</p>
              <Button variant="secondary" className="text-xs" onClick={addQ}><Plus className="h-3.5 w-3.5" /> Add</Button>
            </div>
            <div className="space-y-4 max-h-72 overflow-y-auto scrollbar-thin">
              {questions.map((q, i) => (
                <div key={i} className="rounded-xl ring-1 ring-ink-100 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink-500">Q{i + 1}</span>
                    {questions.length > 1 && <button onClick={() => removeQ(i)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
                  </div>
                  <input className="input" placeholder="Question text" value={q.question_text} onChange={(e) => updateQ(i, { question_text: e.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    {(["a", "b", "c", "d"] as const).map((opt) => (
                      <div key={opt} className={`rounded-lg ring-1 p-2 ${q.correct_option === opt ? "ring-brand-400 bg-brand-50" : "ring-ink-100"}`}>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQ(i, { correct_option: opt })} className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${q.correct_option === opt ? "bg-brand-600 text-white" : "bg-ink-200 text-ink-700"}`}>{opt.toUpperCase()}</button>
                          <input className="w-full bg-transparent text-xs outline-none" placeholder={`Option ${opt.toUpperCase()}`} value={(q as any)[`option_${opt}`]} onChange={(e) => updateQ(i, { [`option_${opt}`]: e.target.value } as any)} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-ink-600">Points:</label>
                    <input type="number" className="input w-20" value={q.points} onChange={(e) => updateQ(i, { points: Number(e.target.value) || 1 })} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Button onClick={save} loading={saving} className="w-full">Create & submit for approval</Button>
        </div>
      </Modal>

      {/* View modal */}
      <Modal open={!!viewExam} onClose={() => setViewExam(null)} title={viewExam?.title} size="lg">
        {viewExam && <ViewExam exam={viewExam} />}
      </Modal>
    </div>
  );
}

function ApprovalBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") return <Badge tone="brand"><CheckCircle2 className="h-3 w-3" /> Approved</Badge>;
  if (status === "rejected") return <Badge tone="rose"><XCircle className="h-3 w-3" /> Rejected</Badge>;
  return <Badge tone="gold">Pending approval</Badge>;
}

function ViewExam({ exam }: { exam: CbtExamWithQuestions }) {
  const { data: qs, error } = useQuestions(exam.id);
  if (error) return <p className="text-sm text-rose-600">{error}</p>;
  if (!qs) return <p className="text-sm text-ink-500">Loading questions…</p>;
  if (qs.length === 0) return <p className="text-sm text-ink-500 text-center py-4">No questions.</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-500">{exam.class?.name} · {exam.subject?.name ?? "General"} · {exam.duration_minutes} min · {qs.length} questions</p>
      {qs.map((q, i) => (
        <div key={q.id} className="rounded-xl ring-1 ring-ink-100 p-3">
          <p className="text-sm font-semibold text-ink-900">{i + 1}. {q.question_text} <span className="text-xs text-ink-400">({q.points} pt)</span></p>
          <div className="mt-2 space-y-1">
            {(["a", "b", "c", "d"] as const).map((opt) => (
              <div key={opt} className={`text-xs px-2 py-1 rounded ${q.correct_option === opt ? "bg-brand-50 text-brand-800 font-medium" : "text-ink-600"}`}>
                {opt.toUpperCase()}. {(q as any)[`option_${opt}`]}{q.correct_option === opt && " ✓"}
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="border-t border-ink-100 pt-3">
        <p className="text-xs font-semibold text-ink-700 mb-2">Attempts ({exam.attempts.length})</p>
        {exam.attempts.length === 0 ? <p className="text-xs text-ink-500">No attempts yet.</p> : (
          <div className="space-y-1">
            {exam.attempts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs">
                <span className="text-ink-700">{a.status}</span>
                <span className="font-medium text-ink-900">{a.score}/{a.max_score}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useEffect } from "react";
function useQuestions(examId: string) {
  const [data, setData] = useState<CbtQuestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    supabase.from("cbt_questions").select("*").eq("cbt_exam_id", examId).order("ord").then(({ data, error }) => {
      if (!on) return;
      if (error) setError(error.message);
      else setData((data as CbtQuestion[]) ?? []);
    });
    return () => { on = false; };
  }, [examId]);
  return { data, error };
}
