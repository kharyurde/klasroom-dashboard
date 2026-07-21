import { useState } from "react";
import { useTeacherData, type AssignmentWithSubs } from "../../lib/useTeacherData";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { formatDate } from "../../lib/format";
import type { AssignmentKind } from "../../lib/types";
import { ClipboardList, Plus, Pencil, Trash2, Upload } from "lucide-react";

const KINDS: { value: AssignmentKind; label: string }[] = [
  { value: "assignment", label: "Assignment" },
  { value: "test", label: "Test" },
  { value: "exam", label: "Exam" },
  { value: "project", label: "Project" },
];

export function TeacherAssignmentsPage() {
  const data = useTeacherData();
  const toast = useToast();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [edit, setEdit] = useState<AssignmentWithSubs | null>(null);
  const [subsModal, setSubsModal] = useState<AssignmentWithSubs | null>(null);
  const [form, setForm] = useState({ title: "", description: "", kind: "assignment" as AssignmentKind, classId: "", subjectId: "", maxScore: "100", dueDate: "" });
  const [saving, setSaving] = useState(false);

  if (data.loading) return null;

  const openNew = () => {
    setEdit(null);
    setForm({ title: "", description: "", kind: "assignment", classId: data.classes[0]?.id ?? "", subjectId: "", maxScore: "100", dueDate: "" });
    setModal(true);
  };

  const openEdit = (a: AssignmentWithSubs) => {
    setEdit(a);
    setForm({ title: a.title, description: a.description ?? "", kind: a.kind, classId: a.class_id, subjectId: a.subject_id ?? "", maxScore: a.max_score.toString(), dueDate: a.due_date ? a.due_date.slice(0, 10) : "" });
    setModal(true);
  };

  const save = async () => {
    if (!user || !form.title || !form.classId) { toast({ kind: "error", title: "Title and class required" }); return; }
    setSaving(true);
    const payload = {
      teacher_id: user.id,
      school_id: data.school!.id,
      subject_id: form.subjectId || null,
      class_id: form.classId,
      title: form.title,
      description: form.description || null,
      kind: form.kind,
      max_score: Number(form.maxScore) || 100,
      due_date: form.dueDate ? new Date(form.dueDate).toISOString() : null,
    };
    if (edit) {
      const { error } = await supabase.from("assignments").update(payload).eq("id", edit.id);
      if (error) toast({ kind: "error", title: "Error", message: error.message });
      else toast({ kind: "success", title: "Assignment updated" });
    } else {
      const { error } = await supabase.from("assignments").insert(payload);
      if (error) toast({ kind: "error", title: "Error", message: error.message });
      else toast({ kind: "success", title: "Assignment created" });
    }
    setSaving(false);
    setModal(false);
    data.reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this assignment? Submissions will also be removed.")) return;
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Deleted" }); data.reload(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Assignments</h1>
          <p className="text-sm text-ink-500 mt-0.5">Create and grade assignments, tests, exams, and projects.</p>
        </div>
        <Button onClick={openNew} className="text-xs"><Plus className="h-4 w-4" /> New</Button>
      </div>

      {data.assignments.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="No assignments yet" description="Create your first assignment for your class." action={<Button onClick={openNew} className="text-xs"><Plus className="h-4 w-4" /> New assignment</Button>} />
      ) : (
        <div className="space-y-3">
          {data.assignments.map((a) => (
            <div key={a.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-ink-900">{a.title}</h3>
                    <Badge tone="ocean">{a.kind}</Badge>
                    <Badge tone={a.status === "published" ? "brand" : "neutral"}>{a.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">{a.class?.name} · {a.subject?.name ?? "General"} · Max {a.max_score}</p>
                  {a.description && <p className="text-xs text-ink-600 mt-2 line-clamp-2">{a.description}</p>}
                  {a.due_date && <p className="text-xs text-ink-500 mt-1">Due {formatDate(a.due_date)}</p>}
                  <div className="mt-2 flex items-center gap-3 text-xs text-ink-500">
                    <span>{a.submissions.length} submission{a.submissions.length === 1 ? "" : "s"}</span>
                    <span>·</span>
                    <span className="text-gold-600">{a.submissions.filter((s) => s.status === "submitted").length} to grade</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="secondary" className="text-xs" onClick={() => setSubsModal(a)}>Submissions</Button>
                  <button onClick={() => openEdit(a)} className="text-ink-400 hover:text-brand-600 p-1"><Pencil className="h-4 w-4" /></button>
                  <button onClick={() => remove(a.id)} className="text-ink-400 hover:text-rose-600 p-1"><Trash2 className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title={edit ? "Edit assignment" : "New assignment"} size="lg">
        <div className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" placeholder="e.g. Algebra worksheet 3" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <label className="label">Description / instructions</label>
            <textarea className="input min-h-24" placeholder="What should students do?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as AssignmentKind })}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Class</label>
              <select className="input" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}>
                <option value="">Select class</option>
                {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <select className="input" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">General</option>
                {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Max score</label>
              <input type="number" className="input" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
            </div>
            <div>
              <label className="label">Due date</label>
              <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>
          <Button onClick={save} loading={saving} className="w-full">{edit ? "Update" : "Create"} assignment</Button>
        </div>
      </Modal>

      <SubmissionsModal assignment={subsModal} students={data.students} onClose={() => setSubsModal(null)} onGraded={data.reload} />
    </div>
  );
}

function SubmissionsModal({ assignment, students, onClose, onGraded }: { assignment: AssignmentWithSubs | null; students: { id: string; full_name: string }[]; onClose: () => void; onGraded: () => void }) {
  const toast = useToast();
  const [gradeId, setGradeId] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  if (!assignment) return null;

  const startGrade = (subId: string, currentScore: string | null) => {
    setGradeId(subId);
    setScore(currentScore ?? "");
    setFeedback("");
  };

  const submitGrade = async () => {
    if (!gradeId) return;
    setSaving(true);
    const { error } = await supabase.from("assignment_submissions")
      .update({ score: Number(score) ?? 0, teacher_feedback: feedback || null, status: "graded", graded_at: new Date().toISOString() })
      .eq("id", gradeId);
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Graded" });
    setGradeId(null);
    onGraded();
  };

  return (
    <Modal open={!!assignment} onClose={onClose} title={`Submissions — ${assignment.title}`} size="lg">
      {assignment.submissions.length === 0 ? (
        <p className="text-sm text-ink-500 text-center py-6">No submissions yet.</p>
      ) : (
        <div className="space-y-3">
          {assignment.submissions.map((sub) => {
            const st = students.find((s) => s.id === sub.student_id);
            return (
              <div key={sub.id} className="rounded-xl ring-1 ring-ink-100 p-3">
                <div className="flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{st?.full_name ?? "Student"}</p>
                    <p className="text-xs text-ink-500">Submitted {formatDate(sub.submitted_at)}</p>
                  </div>
                  <Badge tone={sub.status === "graded" ? "brand" : sub.status === "returned" ? "neutral" : "gold"}>{sub.status}</Badge>
                </div>
                {sub.content && <p className="text-xs text-ink-600 mt-2 line-clamp-3">{sub.content}</p>}
                {sub.file_url && <a href={sub.file_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"><Upload className="h-3 w-3" /> View file</a>}
                {sub.score != null && <p className="text-xs text-ink-700 mt-2 font-medium">Score: {sub.score}/{assignment.max_score}</p>}
                {sub.teacher_feedback && <p className="text-xs text-ink-600 mt-1">Feedback: {sub.teacher_feedback}</p>}

                {gradeId === sub.id ? (
                  <div className="mt-3 space-y-2 border-t border-ink-100 pt-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input type="number" max={assignment.max_score} className="input" placeholder={`Score / ${assignment.max_score}`} value={score} onChange={(e) => setScore(e.target.value)} />
                    </div>
                    <textarea className="input min-h-16" placeholder="Feedback for student (optional)" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                    <div className="flex gap-2">
                      <Button onClick={submitGrade} loading={saving} className="text-xs flex-1">Save grade</Button>
                      <Button variant="secondary" onClick={() => setGradeId(null)} className="text-xs">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  sub.status !== "graded" && (
                    <button onClick={() => startGrade(sub.id, sub.score?.toString() ?? null)} className="mt-2 text-xs font-medium text-brand-700 hover:underline">Grade this submission</button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
