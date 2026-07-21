import { useEffect, useState } from "react";
import { Link, useRouter } from "../../lib/router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { useAdminData } from "../../lib/useAdminData";
import { Button, Spinner, Badge, EmptyState, Modal } from "../../components/ui";
import { notifyParent } from "../../lib/notify";
import { formatMoney, formatDateTime, formatDate, genRegNumber } from "../../lib/format";
import { STAGE_META, DOCUMENT_TYPES } from "../../lib/status";
import {
  ArrowLeft, CheckCircle2, AlertTriangle, FileText, Calendar, MapPin,
  GraduationCap, X, MessageSquare, Clock,
} from "lucide-react";
import type { Application, School, Payment, DocumentRow, Exam, ExamResult, Enrollment, ClassLevel, Ward, ParentProfile } from "../../lib/types";

export function AdminApplicationDetailPage() {
  const { user } = useAuth();
  const { route, navigate } = useRouter();
  const toast = useToast();
  const adminData = useAdminData();
  const appId = route.segments[2];

  const [app, setApp] = useState<Application | null>(null);
  const [ward, setWard] = useState<Ward | null>(null);
  const [parent, setParent] = useState<ParentProfile | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);

  // modals
  const [rejectModal, setRejectModal] = useState(false);
  const [examModal, setExamModal] = useState(false);
  const [resultModal, setResultModal] = useState(false);
  const [enrollModal, setEnrollModal] = useState(false);
  const [docModal, setDocModal] = useState<DocumentRow | null>(null);

  const [rejectReason, setRejectReason] = useState("");
  const [examForm, setExamForm] = useState({ exam_date: "", venue: "", duration: "" });
  const [resultForm, setResultForm] = useState({ score: "", max_score: "100", status: "pass", remarks: "" });
  const [enrollForm, setEnrollForm] = useState({ classId: "", regNumber: "" });
  const [docReview, setDocReview] = useState({ status: "approved" as "approved" | "rejected", reason: "" });

  const load = async () => {
    if (!appId) return;
    const { data: a } = await supabase.from("applications").select("*").eq("id", appId).maybeSingle();
    if (!a) { setLoading(false); return; }
    setApp(a as Application);
    const [w, p, pays, docs, e, er, en] = await Promise.all([
      supabase.from("wards").select("*").eq("id", a.ward_id).maybeSingle(),
      supabase.from("parent_profiles").select("*").eq("id", a.parent_id).maybeSingle(),
      supabase.from("payments").select("*").eq("application_id", a.id).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("application_id", a.id).order("created_at"),
      supabase.from("exams").select("*").eq("application_id", a.id).maybeSingle(),
      supabase.from("exam_results").select("*").eq("application_id", a.id).maybeSingle(),
      supabase.from("enrollments").select("*").eq("application_id", a.id).maybeSingle(),
    ]);
    setWard((w.data as Ward) ?? null);
    setParent((p.data as ParentProfile) ?? null);
    setPayments((pays.data as Payment[]) ?? []);
    setDocuments((docs.data as DocumentRow[]) ?? []);
    setExam((e.data as Exam) ?? null);
    setExamResult((er.data as ExamResult) ?? null);
    setEnrollment((en.data as Enrollment) ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, [appId]);

  const school = adminData.school;
  const classes = adminData.classes;

  if (loading || adminData.loading) return <div className="grid place-items-center py-20"><Spinner className="text-brand-600" size={28} /></div>;
  if (!app || !school) {
    return <EmptyState icon={<FileText className="h-7 w-7" />} title="Application not found" action={<Link to="/admin/applications" className="btn-primary">Back</Link>} />;
  }

  const meta = STAGE_META[app.status];
  const recordStage = async (stage: string, note: string) => {
    await supabase.from("application_stages").insert({ application_id: app.id, stage, note, actor_type: "school", actor_id: user!.id });
  };
  const updateStatus = async (status: Application["status"], note: string, extra: Partial<Application> = {}) => {
    await supabase.from("applications").update({ status, updated_at: new Date().toISOString(), ...extra }).eq("id", app.id);
    await recordStage(status, note);
    setApp({ ...app, status, ...extra });
    await load();
  };

  const approve = async () => {
    await updateStatus("approved", "Application approved by school. Parent to pay assessment fee.");
    await notifyParent(app.parent_id, "Application approved!", `Your application to ${school.name} has been approved. Please pay the assessment fee to proceed.`, "application", `/portal/applications/${app.id}`);
    toast({ kind: "success", title: "Application approved", message: "Parent notified to pay assessment fee." });
  };

  const reject = async () => {
    if (!rejectReason.trim()) { toast({ kind: "error", title: "Reason required" }); return; }
    await updateStatus("rejected", `Application rejected: ${rejectReason}`, { rejection_reason: rejectReason });
    await notifyParent(app.parent_id, "Application update", `Your application to ${school.name} was not approved. Reason: ${rejectReason}`, "application", `/portal/applications/${app.id}`);
    toast({ kind: "info", title: "Application rejected", message: "Parent notified." });
    setRejectModal(false); setRejectReason("");
  };

  const scheduleExam = async () => {
    if (!examForm.exam_date) { toast({ kind: "error", title: "Date required" }); return; }
    const { error } = await supabase.from("exams").upsert({
      school_id: school.id,
      application_id: app.id,
      exam_date: new Date(examForm.exam_date).toISOString(),
      venue: examForm.venue || null,
      duration: examForm.duration || null,
      status: "scheduled",
    }, { onConflict: "application_id" });
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    await updateStatus("exam_scheduled", `Exam scheduled for ${formatDateTime(examForm.exam_date)}${examForm.venue ? " at " + examForm.venue : ""}.`, { exam_date: new Date(examForm.exam_date).toISOString(), exam_venue: examForm.venue });
    await notifyParent(app.parent_id, "Exam scheduled", `Entrance exam scheduled for ${formatDateTime(examForm.exam_date)}${examForm.venue ? " at " + examForm.venue : ""}.`, "exam", `/portal/applications/${app.id}`);
    toast({ kind: "success", title: "Exam scheduled", message: "Parent notified." });
    setExamModal(false); setExamForm({ exam_date: "", venue: "", duration: "" });
  };

  const recordResult = async () => {
    const score = Number(resultForm.score);
    const max = Number(resultForm.max_score) || 100;
    if (isNaN(score)) { toast({ kind: "error", title: "Valid score required" }); return; }
    const status = resultForm.status as "pass" | "fail";
    const examId = exam?.id;
    if (!examId) { toast({ kind: "error", title: "Schedule an exam first" }); return; }
    const { error } = await supabase.from("exam_results").upsert({
      exam_id: examId, application_id: app.id, school_id: school.id,
      score, max_score: max, status, remarks: resultForm.remarks || null,
    }, { onConflict: "application_id" });
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    const newStatus = status === "pass" ? "exam_passed" : "exam_failed";
    await updateStatus(newStatus, `Exam result: ${status === "pass" ? "Passed" : "Failed"} (${score}/${max})${resultForm.remarks ? " — " + resultForm.remarks : ""}`);
    await notifyParent(app.parent_id, status === "pass" ? "Exam passed!" : "Exam result", status === "pass" ? `Congratulations! ${ward?.first_name} passed the entrance exam. Pay the acceptance fee to continue.` : `${ward?.first_name} did not pass the entrance exam. Contact the school for guidance.`, "exam", `/portal/applications/${app.id}`);
    toast({ kind: "success", title: "Result recorded", message: "Parent notified." });
    setResultModal(false); setResultForm({ score: "", max_score: "100", status: "pass", remarks: "" });
  };

  const reviewDoc = async () => {
    if (!docModal) return;
    const { error } = await supabase.from("documents").update({
      status: docReview.status, rejection_reason: docReview.status === "rejected" ? docReview.reason : null, reviewed_at: new Date().toISOString(),
    }).eq("id", docModal.id);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    await recordStage(docReview.status === "approved" ? "doc_approved" : "doc_rejected", `Document ${docModal.label ?? docModal.type} ${docReview.status}.${docReview.reason ? " Reason: " + docReview.reason : ""}`);

    // If all docs approved, move to docs_approved
    const allApproved = documents.every((d) => d.id === docModal.id ? docReview.status === "approved" : d.status === "approved");
    if (allApproved && app.status === "docs_submitted") {
      await updateStatus("docs_approved", "All documents approved. Parent to pay school fees.");
      await notifyParent(app.parent_id, "Documents approved!", `Your documents for ${school.name} have been approved. Please pay school fees to complete enrollment.`, "documents", `/portal/applications/${app.id}`);
      toast({ kind: "success", title: "All documents approved", message: "Parent notified to pay school fees." });
    } else if (docReview.status === "rejected") {
      if (app.status === "docs_submitted") {
        await updateStatus("docs_rejected", `Document rejected: ${docModal.label ?? docModal.type}. Parent to re-upload.`);
        await notifyParent(app.parent_id, "Document rejected", `A document was rejected: ${docModal.label ?? docModal.type}. ${docReview.reason ? "Reason: " + docReview.reason : ""}. Please re-upload.`, "documents", `/portal/applications/${app.id}`);
      }
      toast({ kind: "info", title: "Document rejected", message: "Parent asked to re-upload." });
    } else {
      toast({ kind: "success", title: "Document approved" });
    }
    setDocModal(null); setDocReview({ status: "approved", reason: "" });
    await load();
  };

  const enroll = async () => {
    if (!enrollForm.classId) { toast({ kind: "error", title: "Select a class" }); return; }
    const regNo = enrollForm.regNumber || genRegNumber(school.slug);
    const session = adminData.sessions.find((s) => s.is_current);
    const { data: en, error } = await supabase.from("enrollments").insert({
      ward_id: app.ward_id, school_id: school.id, application_id: app.id,
      class_id: enrollForm.classId, registration_number: regNo,
      session_id: session?.id ?? null, status: "active",
    }).select().single();
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    await updateStatus("enrolled", `Enrolled. Reg No: ${regNo}. Class: ${classes.find(c => c.id === enrollForm.classId)?.name}.`, { registration_number: regNo, assigned_class_id: enrollForm.classId });
    await notifyParent(app.parent_id, "Enrolled! Welcome to " + school.name, `${ward?.first_name} ${ward?.last_name} is now enrolled. Registration number: ${regNo}. Class: ${classes.find(c => c.id === enrollForm.classId)?.name}.`, "enrollment", `/portal/applications/${app.id}`);
    toast({ kind: "success", title: "Student enrolled!", message: `Reg No: ${regNo}` });
    setEnrollModal(false); setEnrollForm({ classId: "", regNumber: "" });
  };

  const hasPayment = (type: string) => payments.some((p) => p.type === type && p.status === "paid");

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/admin/applications" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> All applications
      </Link>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-ink-800 to-ink-950 p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-ink-300">Applicant</p>
              <h1 className="text-2xl font-bold mt-1">{ward?.first_name} {ward?.last_name}</h1>
              <p className="text-sm text-ink-300 mt-0.5">{app.applying_for_class_name} · {app.session_name}</p>
              <p className="text-xs text-ink-400 mt-1">Parent: {parent?.full_name || parent?.email}</p>
            </div>
            <Badge tone={meta.tone} className="!bg-white/20 !text-white whitespace-nowrap">{meta.label}</Badge>
          </div>
        </div>
      </div>

      {/* Ward details */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-ink-900 mb-3">Applicant details</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Detail label="Date of birth" value={ward?.date_of_birth ? formatDate(ward.date_of_birth) : "—"} />
          <Detail label="Gender" value={ward?.gender ?? "—"} />
          <Detail label="Blood group" value={ward?.blood_group ?? "—"} />
          <Detail label="Parent email" value={parent?.email ?? "—"} />
          <Detail label="Parent phone" value={parent?.phone ?? "—"} />
          <Detail label="Applied on" value={formatDate(app.created_at)} />
        </div>
        {ward?.medical_notes && (
          <div className="mt-3 rounded-xl bg-gold-50 ring-1 ring-gold-100 p-3 text-sm text-gold-800">
            <span className="font-semibold">Medical notes:</span> {ward.medical_notes}
          </div>
        )}
      </div>

      {/* Action panel */}
      <div className="card p-5">
        <h2 className="text-base font-semibold text-ink-900 mb-4">Actions</h2>
        <ActionPanel
          app={app} school={school} ward={ward} payments={payments} exam={exam} examResult={examResult} documents={documents} enrollment={enrollment}
          onApprove={approve} onReject={() => setRejectModal(true)}
          onScheduleExam={() => setExamModal(true)} onRecordResult={() => setResultModal(true)}
          onEnroll={() => { setEnrollForm({ classId: app.assigned_class_id ?? app.applying_for_class_id ?? "", regNumber: genRegNumber(school.slug) }); setEnrollModal(true); }}
        />
      </div>

      {/* Documents */}
      <div className="card">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">Documents</h2>
        </div>
        <div className="p-5">
          {documents.length === 0 ? (
            <p className="text-sm text-ink-500">No documents uploaded yet.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-xl ring-1 ring-ink-100 p-3">
                  <FileText className="h-5 w-5 text-ink-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{d.label ?? d.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-ink-500">{d.file_name}</p>
                    {d.rejection_reason && <p className="text-xs text-rose-600 mt-0.5">Rejected: {d.rejection_reason}</p>}
                  </div>
                  <Badge tone={d.status === "approved" ? "brand" : d.status === "rejected" ? "rose" : "gold"}>{d.status}</Badge>
                  <Button variant="secondary" className="text-xs px-2.5 py-1.5" onClick={() => { setDocModal(d); setDocReview({ status: "approved", reason: "" }); }}>Review</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payments */}
      <div className="card">
        <div className="border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">Payments</h2>
        </div>
        <div className="divide-y divide-ink-100">
          {payments.length === 0 ? <p className="p-5 text-sm text-ink-500">No payments.</p> : payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium text-ink-900">{p.type.replace(/_/g, " ")}</p>
                <p className="text-xs text-ink-500">{formatDateTime(p.paid_at ?? p.created_at)} · {p.reference}</p>
              </div>
              <span className="text-sm font-bold text-ink-950">{formatMoney(p.amount, p.currency)}</span>
              <Badge tone={p.status === "paid" ? "brand" : "gold"}>{p.status}</Badge>
            </div>
          ))}
        </div>
      </div>

      {/* Modals */}
      <Modal open={rejectModal} onClose={() => setRejectModal(false)} title="Reject application">
        <div className="space-y-4">
          <p className="text-sm text-ink-600">The parent will be notified and can re-apply next session.</p>
          <div>
            <label className="label">Reason for rejection</label>
            <textarea className="input min-h-24" placeholder="e.g. Class is at capacity for this session" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button variant="danger" onClick={reject} className="flex-1">Reject application</Button>
            <Button variant="secondary" onClick={() => setRejectModal(false)}>Cancel</Button>
          </div>
        </div>
      </Modal>

      <Modal open={examModal} onClose={() => setExamModal(false)} title="Schedule entrance exam">
        <div className="space-y-4">
          <div>
            <label className="label">Exam date & time</label>
            <input type="datetime-local" className="input" value={examForm.exam_date} onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Venue</label>
            <input className="input" placeholder="e.g. Main Hall, Block A" value={examForm.venue} onChange={(e) => setExamForm({ ...examForm, venue: e.target.value })} />
          </div>
          <div>
            <label className="label">Duration</label>
            <input className="input" placeholder="e.g. 2 hours" value={examForm.duration} onChange={(e) => setExamForm({ ...examForm, duration: e.target.value })} />
          </div>
          <Button onClick={scheduleExam} className="w-full"><Calendar className="h-4 w-4" /> Schedule exam</Button>
        </div>
      </Modal>

      <Modal open={resultModal} onClose={() => setResultModal(false)} title="Record exam result">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Score</label>
              <input type="number" className="input" placeholder="75" value={resultForm.score} onChange={(e) => setResultForm({ ...resultForm, score: e.target.value })} />
            </div>
            <div>
              <label className="label">Max score</label>
              <input type="number" className="input" value={resultForm.max_score} onChange={(e) => setResultForm({ ...resultForm, max_score: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Result</label>
            <select className="input" value={resultForm.status} onChange={(e) => setResultForm({ ...resultForm, status: e.target.value })}>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
            </select>
          </div>
          <div>
            <label className="label">Remarks (optional)</label>
            <textarea className="input min-h-20" value={resultForm.remarks} onChange={(e) => setResultForm({ ...resultForm, remarks: e.target.value })} />
          </div>
          <Button onClick={recordResult} className="w-full"><CheckCircle2 className="h-4 w-4" /> Save result</Button>
        </div>
      </Modal>

      <Modal open={enrollModal} onClose={() => setEnrollModal(false)} title="Enroll student" size="md">
        <div className="space-y-4">
          <div className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3 text-sm text-brand-800">
            This will assign a registration number and class, completing the admission.
          </div>
          <div>
            <label className="label">Assign class</label>
            <select className="input" value={enrollForm.classId} onChange={(e) => setEnrollForm({ ...enrollForm, classId: e.target.value })}>
              <option value="">Select class…</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Registration number</label>
            <input className="input" value={enrollForm.regNumber} onChange={(e) => setEnrollForm({ ...enrollForm, regNumber: e.target.value })} />
            <p className="text-xs text-ink-400 mt-1">Auto-generated. You can edit it.</p>
          </div>
          <Button onClick={enroll} className="w-full"><GraduationCap className="h-4 w-4" /> Enroll student</Button>
        </div>
      </Modal>

      <Modal open={!!docModal} onClose={() => setDocModal(null)} title="Review document">
        {docModal && (
          <div className="space-y-4">
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="text-sm font-semibold text-ink-900">{docModal.label ?? docModal.type.replace(/_/g, " ")}</p>
              <p className="text-xs text-ink-500">{docModal.file_name}</p>
            </div>
            <a href={docModal.file_url} target="_blank" rel="noopener noreferrer" className="btn-secondary w-full justify-center">View file</a>
            <div>
              <label className="label">Decision</label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setDocReview({ ...docReview, status: "approved" })} className={`rounded-xl p-3 text-sm font-medium ring-1 transition ${docReview.status === "approved" ? "ring-2 ring-brand-500 bg-brand-50 text-brand-800" : "ring-ink-200"}`}>
                  <CheckCircle2 className="h-4 w-4 inline mr-1" /> Approve
                </button>
                <button onClick={() => setDocReview({ ...docReview, status: "rejected" })} className={`rounded-xl p-3 text-sm font-medium ring-1 transition ${docReview.status === "rejected" ? "ring-2 ring-rose-500 bg-rose-50 text-rose-800" : "ring-ink-200"}`}>
                  <X className="h-4 w-4 inline mr-1" /> Reject
                </button>
              </div>
            </div>
            {docReview.status === "rejected" && (
              <div>
                <label className="label">Reason (sent to parent)</label>
                <textarea className="input min-h-20" placeholder="e.g. Image is blurry, please re-upload a clear scan" value={docReview.reason} onChange={(e) => setDocReview({ ...docReview, reason: e.target.value })} />
              </div>
            )}
            <Button onClick={reviewDoc} className="w-full">Submit review</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ActionPanel({ app, school, ward, payments, exam, examResult, documents, enrollment, onApprove, onReject, onScheduleExam, onRecordResult, onEnroll }: {
  app: Application; school: School; ward: Ward | null; payments: Payment[]; exam: Exam | null; examResult: ExamResult | null; documents: DocumentRow[]; enrollment: Enrollment | null;
  onApprove: () => void; onReject: () => void; onScheduleExam: () => void; onRecordResult: () => void; onEnroll: () => void;
}) {
  const hasPayment = (type: string) => payments.some((p) => p.type === type && p.status === "paid");

  if (app.status === "submitted" || app.status === "under_review") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-600">Review this application and decide.</p>
        <div className="flex gap-2">
          <Button onClick={onApprove} className="flex-1"><CheckCircle2 className="h-4 w-4" /> Approve</Button>
          <Button variant="danger" onClick={onReject} className="flex-1"><X className="h-4 w-4" /> Reject</Button>
        </div>
      </div>
    );
  }
  if (app.status === "approved") {
    return <Info text="Approved — waiting for parent to pay the assessment fee." tone="brand" />;
  }
  if (app.status === "assessment_paid") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-ink-600">Assessment fee paid. Schedule the entrance exam.</p>
        <Button onClick={onScheduleExam} className="w-full"><Calendar className="h-4 w-4" /> Schedule exam</Button>
      </div>
    );
  }
  if (app.status === "exam_scheduled") {
    return (
      <div className="space-y-3">
        <Info text={`Exam scheduled for ${formatDateTime(exam?.exam_date ?? null)}${exam?.venue ? " at " + exam.venue : ""}.`} tone="gold" />
        <Button onClick={onRecordResult} className="w-full"><CheckCircle2 className="h-4 w-4" /> Record exam result</Button>
      </div>
    );
  }
  if (app.status === "exam_passed") {
    return <Info text="Exam passed — waiting for parent to pay acceptance fee and upload documents." tone="brand" />;
  }
  if (app.status === "docs_submitted") {
    const pending = documents.filter((d) => d.status === "pending");
    return (
      <div className="space-y-2">
        <Info text={`${pending.length} document${pending.length !== 1 ? "s" : ""} awaiting review.`} tone="gold" />
        <p className="text-xs text-ink-500">Review each document in the Documents section below. When all are approved, the parent will be asked to pay school fees.</p>
      </div>
    );
  }
  if (app.status === "docs_approved") {
    return <Info text="Documents approved — waiting for parent to pay school fees." tone="brand" />;
  }
  if (app.status === "docs_rejected") {
    return <Info text="A document was rejected — waiting for parent to re-upload." tone="rose" />;
  }
  if (app.status === "fees_paid") {
    return (
      <div className="space-y-3">
        <Info text="School fees paid. Assign a class and registration number to complete enrollment." tone="brand" />
        <Button onClick={onEnroll} className="w-full"><GraduationCap className="h-4 w-4" /> Enroll student</Button>
      </div>
    );
  }
  if (app.status === "enrolled") {
    return <Info text={`Enrolled. Reg No: ${enrollment?.registration_number}.`} tone="brand" />;
  }
  if (app.status === "rejected") {
    return <Info text="This application was rejected." tone="rose" />;
  }
  if (app.status === "exam_failed") {
    return <Info text="Exam not passed." tone="rose" />;
  }
  return <Info text="No action needed right now." tone="neutral" />;
}

function Info({ text, tone }: { text: string; tone: "brand" | "gold" | "rose" | "neutral" }) {
  const tones = {
    brand: "bg-brand-50 ring-brand-100 text-brand-800",
    gold: "bg-gold-50 ring-gold-100 text-gold-800",
    rose: "bg-rose-50 ring-rose-100 text-rose-800",
    neutral: "bg-ink-50 ring-ink-100 text-ink-700",
  };
  return <div className={`rounded-xl ring-1 p-3 text-sm ${tones[tone]}`}>{text}</div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-ink-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-medium text-ink-900 mt-0.5">{value}</p>
    </div>
  );
}
