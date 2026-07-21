import { useState, useEffect } from "react";
import { useStudentData, type StudentCbtExam } from "../../lib/useStudentData";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { MonitorSmartphone, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import type { CbtQuestion } from "../../lib/types";

export function StudentExamsPage() {
  const data = useStudentData();
  if (data.loading) return null;

  const available = data.cbtExams.filter((c) => c.status === "active" && (!c.myAttempt || c.myAttempt.status === "in_progress"));
  const completed = data.cbtExams.filter((c) => c.myAttempt?.status === "submitted" || c.myAttempt?.status === "graded");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">CBT Exams</h1>
        <p className="text-sm text-ink-500 mt-0.5">Computer-based tests approved by your school.</p>
      </div>

      {data.cbtExams.length === 0 ? (
        <EmptyState icon={<MonitorSmartphone className="h-7 w-7" />} title="No exams available" description="Your teachers haven't published any approved CBT exams for your class yet." />
      ) : (
        <>
          {available.length > 0 && (
            <div className="card">
              <div className="border-b border-ink-100 px-5 py-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gold-600" />
                <h2 className="text-base font-semibold text-ink-900">Available ({available.length})</h2>
              </div>
              <div className="divide-y divide-ink-100">
                {available.map((c) => <ExamRow key={c.id} exam={c} />)}
              </div>
            </div>
          )}

          {completed.length > 0 && (
            <div className="card">
              <div className="border-b border-ink-100 px-5 py-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brand-600" />
                <h2 className="text-base font-semibold text-ink-900">Completed ({completed.length})</h2>
              </div>
              <div className="divide-y divide-ink-100">
                {completed.map((c) => <ExamRow key={c.id} exam={c} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ExamRow({ exam }: { exam: StudentCbtExam }) {
  const [taking, setTaking] = useState(false);
  const attempt = exam.myAttempt;
  const inProgress = attempt?.status === "in_progress";
  const completed = attempt?.status === "submitted" || attempt?.status === "graded";

  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-ink-900">{exam.title}</h3>
        <p className="text-xs text-ink-500 mt-1">{exam.subject?.name ?? "General"} · {exam.questions.length} questions · {exam.duration_minutes} min</p>
        {completed && attempt && (
          <p className="text-sm font-bold text-ink-950 mt-2">Your score: {attempt.score}/{attempt.max_score}</p>
        )}
        {inProgress && <p className="text-xs text-gold-700 mt-2">In progress — resume to complete.</p>}
      </div>
      {completed ? (
        <Badge tone="brand">Done</Badge>
      ) : (
        <Button onClick={() => setTaking(true)} className="text-xs">{inProgress ? "Resume" : "Start"}</Button>
      )}
      <TakeExamModal exam={exam} open={taking} onClose={() => setTaking(false)} />
    </div>
  );
}

function TakeExamModal({ exam, open, onClose }: { exam: StudentCbtExam; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const data = useStudentData();
  const toast = useToast();
  const [questions, setQuestions] = useState<CbtQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, "a" | "b" | "c" | "d">>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(exam.duration_minutes * 60);

  useEffect(() => {
    if (!open) return;
    setQuestions(exam.questions);
    setSecondsLeft(exam.duration_minutes * 60);
    // Resume or create attempt
    (async () => {
      if (exam.myAttempt && exam.myAttempt.status === "in_progress") {
        setAttemptId(exam.myAttempt.id);
        setAnswers((exam.myAttempt.answers as any) ?? {});
      } else if (user && !exam.myAttempt) {
        const { data: att, error } = await supabase.from("cbt_attempts").insert({
          cbt_exam_id: exam.id, student_id: user.id, school_id: exam.school_id, class_id: exam.class_id,
          answers: {}, score: 0, max_score: exam.questions.reduce((s, q) => s + q.points, 0), status: "in_progress",
        }).select().single();
        if (error) { toast({ kind: "error", title: "Error", message: error.message }); onClose(); return; }
        setAttemptId((att as any).id);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!open || !attemptId) return;
    if (secondsLeft <= 0) { submit(true); return; }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [open, attemptId, secondsLeft]);

  const selectAnswer = (qId: string, opt: "a" | "b" | "c" | "d") => {
    setAnswers((a) => ({ ...a, [qId]: opt }));
  };

  const submit = async (auto = false) => {
    if (!user || !attemptId) return;
    setSubmitting(true);
    const totalPoints = questions.reduce((s, q) => s + q.points, 0);
    let score = 0;
    questions.forEach((q) => { if (answers[q.id] === q.correct_option) score += q.points; });
    const { error } = await supabase.from("cbt_attempts").update({
      answers, score, status: "submitted", submitted_at: new Date().toISOString(),
    }).eq("id", attemptId);
    setSubmitting(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: auto ? "Time up — submitted" : "Exam submitted", message: `Score: ${score}/${totalPoints}` });
    data.reload();
    onClose();
  };

  const answeredCount = Object.keys(answers).length;
  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");

  return (
    <Modal open={open} onClose={submitting ? () => {} : onClose} title={exam.title} size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-500">{questions.length} questions · answered {answeredCount}/{questions.length}</span>
          <span className={`font-bold tabular-nums ${secondsLeft < 60 ? "text-rose-600" : "text-ink-900"}`}>{mm}:{ss}</span>
        </div>
        {secondsLeft < 60 && (
          <div className="rounded-lg bg-rose-50 ring-1 ring-rose-100 p-2 flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="h-3.5 w-3.5" /> Less than a minute left — exam will auto-submit.
          </div>
        )}
        <div className="space-y-4 max-h-[50vh] overflow-y-auto scrollbar-thin">
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-xl ring-1 ring-ink-100 p-3">
              <p className="text-sm font-semibold text-ink-900">{i + 1}. {q.question_text} <span className="text-xs text-ink-400">({q.points} pt)</span></p>
              <div className="mt-2 space-y-1.5">
                {(["a", "b", "c", "d"] as const).map((opt) => (
                  <button key={opt} onClick={() => selectAnswer(q.id, opt)}
                    className={`w-full text-left rounded-lg px-3 py-2 text-sm transition ${answers[q.id] === opt ? "bg-brand-600 text-white" : "bg-ink-50 text-ink-700 hover:bg-ink-100"}`}>
                    {opt.toUpperCase()}. {(q as any)[`option_${opt}`]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => submit(false)} loading={submitting} className="w-full">Submit exam</Button>
      </div>
    </Modal>
  );
}
