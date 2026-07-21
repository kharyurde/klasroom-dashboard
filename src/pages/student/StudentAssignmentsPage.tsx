import { useState } from "react";
import { useStudentData, type StudentAssignment } from "../../lib/useStudentData";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { ClipboardList, Upload, CheckCircle2, Clock } from "lucide-react";

export function StudentAssignmentsPage() {
  const data = useStudentData();
  const toast = useToast();
  const { user } = useAuth();
  const [submitFor, setSubmitFor] = useState<StudentAssignment | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  if (data.loading) return null;

  const openSubmit = (a: StudentAssignment) => {
    setSubmitFor(a);
    setContent(a.mySubmission?.content ?? "");
  };

  const submit = async () => {
    if (!user || !submitFor) return;
    if (!content) { toast({ kind: "error", title: "Add your answer" }); return; }
    setSaving(true);
    const existing = submitFor.mySubmission;
    if (existing) {
      const { error } = await supabase.from("assignment_submissions").update({
        content, status: "submitted", submitted_at: new Date().toISOString(),
      }).eq("id", existing.id);
      if (error) { toast({ kind: "error", title: "Error", message: error.message }); setSaving(false); return; }
    } else {
      const { error } = await supabase.from("assignment_submissions").insert({
        assignment_id: submitFor.id, student_id: user.id, school_id: data.school!.id, class_id: submitFor.class_id,
        content, status: "submitted",
      });
      if (error) { toast({ kind: "error", title: "Error", message: error.message }); setSaving(false); return; }
    }
    setSaving(false);
    toast({ kind: "success", title: "Submitted!" });
    setSubmitFor(null);
    setContent("");
    data.reload();
  };

  const pending = data.assignments.filter((a) => !a.mySubmission && a.status === "published");
  const done = data.assignments.filter((a) => a.mySubmission);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Assignments</h1>
        <p className="text-sm text-ink-500 mt-0.5">{data.classLevel?.name ?? "No class"} · {pending.length} pending, {done.length} submitted</p>
      </div>

      {data.assignments.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="No assignments yet" description="Your teachers haven't published any assignments for your class." />
      ) : (
        <>
          {pending.length > 0 && (
            <div className="card">
              <div className="border-b border-ink-100 px-5 py-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold-600" />
                <h2 className="text-base font-semibold text-ink-900">To do ({pending.length})</h2>
              </div>
              <div className="divide-y divide-ink-100">
                {pending.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 px-5 py-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-ink-900">{a.title}</h3>
                        <Badge tone="ocean">{a.kind}</Badge>
                      </div>
                      <p className="text-xs text-ink-500 mt-1">{a.subject?.name ?? "General"} · Max {a.max_score}</p>
                      {a.description && <p className="text-xs text-ink-600 mt-2 line-clamp-2">{a.description}</p>}
                      {a.due_date && <p className="text-xs text-gold-700 mt-1">Due {formatDate(a.due_date)}</p>}
                    </div>
                    <Button onClick={() => openSubmit(a)} className="text-xs">Submit</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {done.length > 0 && (
            <div className="card">
              <div className="border-b border-ink-100 px-5 py-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brand-600" />
                <h2 className="text-base font-semibold text-ink-900">Submitted ({done.length})</h2>
              </div>
              <div className="divide-y divide-ink-100">
                {done.map((a) => {
                  const sub = a.mySubmission!;
                  return (
                    <div key={a.id} className="flex items-start gap-3 px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-ink-900">{a.title}</h3>
                          <Badge tone={sub.status === "graded" ? "brand" : "gold"}>{sub.status}</Badge>
                        </div>
                        <p className="text-xs text-ink-500 mt-1">{a.subject?.name ?? "General"} · Submitted {formatDate(sub.submitted_at)}</p>
                        {sub.score != null && <p className="text-sm font-bold text-ink-950 mt-2">{sub.score}/{a.max_score}</p>}
                        {sub.teacher_feedback && <p className="text-xs text-ink-600 mt-1">Feedback: {sub.teacher_feedback}</p>}
                      </div>
                      {sub.status !== "graded" && <Button variant="secondary" className="text-xs" onClick={() => openSubmit(a)}>Edit</Button>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <Modal open={!!submitFor} onClose={() => setSubmitFor(null)} title={submitFor?.title} size="lg">
        {submitFor && (
          <div className="space-y-4">
            <div className="text-xs text-ink-500">{submitFor.subject?.name ?? "General"} · {submitFor.kind} · Max {submitFor.max_score}</div>
            {submitFor.description && <p className="text-sm text-ink-700">{submitFor.description}</p>}
            <div>
              <label className="label">Your answer</label>
              <textarea className="input min-h-40" placeholder="Type your answer here…" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <Button onClick={submit} loading={saving} className="w-full"><Upload className="h-4 w-4" /> Submit assignment</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
