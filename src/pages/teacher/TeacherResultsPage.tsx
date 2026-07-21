import { useState } from "react";
import { useTeacherData } from "../../lib/useTeacherData";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { FileBarChart, Plus, Trash2, Send } from "lucide-react";
import type { ResultDraft } from "../../lib/types";

export function TeacherResultsPage() {
  const data = useTeacherData();
  const toast = useToast();
  const { user } = useAuth();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ classId: "", subjectId: "", enrollmentId: "", term: "First Term", session: "", score: "", maxScore: "100", grade: "", remark: "" });
  const [saving, setSaving] = useState(false);
  const [classEnrollments, setClassEnrollments] = useState<any[]>([]);

  if (data.loading) return null;

  const openNew = () => {
    setForm({ classId: "", subjectId: "", enrollmentId: "", term: "First Term", session: "", score: "", maxScore: "100", grade: "", remark: "" });
    setClassEnrollments([]);
    setModal(true);
  };

  const loadEnrollmentsForClass = async (classId: string) => {
    if (!classId) { setClassEnrollments([]); return; }
    const { data: sces } = await supabase
      .from("student_class_enrollments")
      .select("*, enrollment:enrollments(*, ward:wards(*))")
      .eq("class_id", classId)
      .eq("status", "active");
    setClassEnrollments(((sces as any[]) ?? []).map((r) => ({ id: r.enrollment_id, ward: r.enrollment?.ward })));
  };

  const save = async () => {
    if (!user || !form.classId || !form.subjectId || !form.enrollmentId) { toast({ kind: "error", title: "Class, subject and student required" }); return; }
    const enrollment = classEnrollments.find((e) => e.id === form.enrollmentId);
    if (!enrollment?.ward) { toast({ kind: "error", title: "Student not found" }); return; }
    setSaving(true);
    const { error } = await supabase.from("result_drafts").insert({
      teacher_id: user.id,
      school_id: data.school!.id,
      subject_id: form.subjectId,
      class_id: form.classId,
      enrollment_id: form.enrollmentId,
      ward_id: enrollment.ward.id,
      term: form.term,
      session_name: form.session || null,
      score: form.score ? Number(form.score) : null,
      max_score: Number(form.maxScore) || 100,
      grade: form.grade || null,
      teacher_remark: form.remark || null,
      approval_status: "pending",
    });
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Result draft saved", message: "Sent to admin for approval." });
    setModal(false);
    data.reload();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this result draft?")) return;
    const { error } = await supabase.from("result_drafts").delete().eq("id", id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Deleted" }); data.reload(); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Results</h1>
          <p className="text-sm text-ink-500 mt-0.5">Upload result drafts. Admin approves before publishing to students and parents.</p>
        </div>
        <Button onClick={openNew} className="text-xs"><Plus className="h-4 w-4" /> New draft</Button>
      </div>

      {data.resultDrafts.length === 0 ? (
        <EmptyState icon={<FileBarChart className="h-7 w-7" />} title="No result drafts yet" description="Upload a result draft for a student. The school admin will approve it before it's published." action={<Button onClick={openNew} className="text-xs"><Plus className="h-4 w-4" /> New draft</Button>} />
      ) : (
        <div className="card">
          <div className="divide-y divide-ink-100">
            {data.resultDrafts.map((r) => (
              <DraftRow key={r.id} draft={r} onDelete={() => remove(r.id)} />
            ))}
          </div>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="New result draft" size="lg">
        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Class</label>
              <select className="input" value={form.classId} onChange={(e) => { setForm({ ...form, classId: e.target.value, enrollmentId: "" }); loadEnrollmentsForClass(e.target.value); }}>
                <option value="">Select</option>
                {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <select className="input" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}>
                <option value="">Select</option>
                {data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Student</label>
              <select className="input" value={form.enrollmentId} onChange={(e) => setForm({ ...form, enrollmentId: e.target.value })}>
                <option value="">Select student</option>
                {classEnrollments.map((e) => (
                  <option key={e.id} value={e.id}>{e.ward?.first_name} {e.ward?.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Term</label>
              <input className="input" value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
            </div>
            <div>
              <label className="label">Session (optional)</label>
              <input className="input" placeholder="2025/2026" value={form.session} onChange={(e) => setForm({ ...form, session: e.target.value })} />
            </div>
            <div>
              <label className="label">Score</label>
              <input type="number" className="input" value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} />
            </div>
            <div>
              <label className="label">Max score</label>
              <input type="number" className="input" value={form.maxScore} onChange={(e) => setForm({ ...form, maxScore: e.target.value })} />
            </div>
            <div>
              <label className="label">Grade (optional)</label>
              <input className="input" placeholder="A, B, C…" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Remark (optional)</label>
              <textarea className="input min-h-16" value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} />
            </div>
          </div>
          <Button onClick={save} loading={saving} className="w-full"><Send className="h-4 w-4" /> Save & submit for approval</Button>
        </div>
      </Modal>
    </div>
  );
}

function DraftRow({ draft, onDelete }: { draft: ResultDraft & { class?: any; subject?: any }; onDelete: () => void }) {
  const tone = draft.approval_status === "approved" ? "brand" : draft.approval_status === "rejected" ? "rose" : "gold";
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-900 truncate">{draft.subject?.name ?? "—"} · {draft.class?.name ?? "—"}</p>
        <p className="text-xs text-ink-500">{draft.term}{draft.session_name ? ` · ${draft.session_name}` : ""} · Score {draft.score ?? "—"}/{draft.max_score}{draft.grade ? ` · ${draft.grade}` : ""}</p>
        {draft.approval_note && <p className="text-xs text-rose-600 mt-1">Admin: {draft.approval_note}</p>}
      </div>
      <Badge tone={tone as any}>{draft.approval_status}</Badge>
      {draft.approval_status !== "approved" && (
        <button onClick={onDelete} className="text-ink-400 hover:text-rose-600 p-1"><Trash2 className="h-4 w-4" /></button>
      )}
    </div>
  );
}
