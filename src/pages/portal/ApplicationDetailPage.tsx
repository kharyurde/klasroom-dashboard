import { useEffect, useState } from "react";
import { Link, useRouter } from "../../lib/router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { Button, Spinner, Badge, EmptyState, Modal } from "../../components/ui";
import { processPayment } from "../../lib/payments";
import { notifyParent } from "../../lib/notify";
import { downloadReceipt, prettyType } from "../../lib/receipt";
import { formatMoney, formatDateTime } from "../../lib/format";
import { STAGE_META, PIPELINE_ORDER, stageIndex, DOCUMENT_TYPES } from "../../lib/status";
import {
  ArrowLeft, CheckCircle2, Clock, AlertTriangle, CreditCard, FileText,
  Upload, Download, GraduationCap, Calendar, MapPin, RefreshCw, Send,
} from "lucide-react";
import type { Application, School, Ward, Payment, DocumentRow, Exam, ExamResult, Enrollment, ClassLevel, ApplicationStage } from "../../lib/types";

export function ApplicationDetailPage() {
  const { user } = useAuth();
  const { route, navigate } = useRouter();
  const toast = useToast();
  const appId = route.segments[2]; // /portal/applications/:id
  const [app, setApp] = useState<Application | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [ward, setWard] = useState<Ward | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [stages, setStages] = useState<ApplicationStage[]>([]);
  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [uploadModal, setUploadModal] = useState(false);

  const load = async () => {
    if (!appId) return;
    const { data: a } = await supabase.from("applications").select("*").eq("id", appId).maybeSingle();
    if (!a) { setLoading(false); return; }
    setApp(a as Application);
    const [s, w, p, d, e, er, en, st, c] = await Promise.all([
      supabase.from("schools").select("*").eq("id", a.school_id).maybeSingle(),
      supabase.from("wards").select("*").eq("id", a.ward_id).maybeSingle(),
      supabase.from("payments").select("*").eq("application_id", a.id).order("created_at", { ascending: false }),
      supabase.from("documents").select("*").eq("application_id", a.id).order("created_at"),
      supabase.from("exams").select("*").eq("application_id", a.id).maybeSingle(),
      supabase.from("exam_results").select("*").eq("application_id", a.id).maybeSingle(),
      supabase.from("enrollments").select("*").eq("application_id", a.id).maybeSingle(),
      supabase.from("application_stages").select("*").eq("application_id", a.id).order("created_at"),
      supabase.from("classes").select("*").eq("school_id", a.school_id).order("level"),
    ]);
    setSchool((s.data as School) ?? null);
    setWard((w.data as Ward) ?? null);
    setPayments((p.data as Payment[]) ?? []);
    setDocuments((d.data as DocumentRow[]) ?? []);
    setExam((e.data as Exam) ?? null);
    setExamResult((er.data as ExamResult) ?? null);
    setEnrollment((en.data as Enrollment) ?? null);
    setStages((st.data as ApplicationStage[]) ?? []);
    setClasses((c.data as ClassLevel[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [appId]);

  if (loading) return <div className="grid place-items-center py-20"><Spinner className="text-brand-600" size={28} /></div>;
  if (!app || !school || !ward) {
    return <EmptyState icon={<FileText className="h-7 w-7" />} title="Application not found" action={<Link to="/portal/applications" className="btn-primary">Back to applications</Link>} />;
  }

  const meta = STAGE_META[app.status];
  const idx = stageIndex(app.status);
  const progress = Math.round((idx / (PIPELINE_ORDER.length - 1)) * 100);

  const hasPayment = (type: string) => payments.some((p) => p.type === type && p.status === "paid");

  const recordStage = async (stage: string, note: string) => {
    await supabase.from("application_stages").insert({ application_id: app.id, stage, note, actor_type: "parent", actor_id: user!.id });
  };

  const updateStatus = async (status: Application["status"], note: string) => {
    await supabase.from("applications").update({ status, updated_at: new Date().toISOString() }).eq("id", app.id);
    await recordStage(status, note);
    setApp({ ...app, status });
    await load();
  };

  const pay = async (type: "assessment_fee" | "acceptance_fee" | "school_fees") => {
    setPaying(type);
    try {
      const amount = type === "assessment_fee" ? school.assessment_fee : type === "acceptance_fee" ? school.acceptance_fee : await computeSchoolFees(school);
      const payment = await processPayment({
        school: { id: school.id, currency: school.currency, name: school.name, application_fee: school.application_fee, assessment_fee: school.assessment_fee, acceptance_fee: school.acceptance_fee },
        ward, type, amount, applicationId: app.id,
      });
      await notifyParent(user!.id, "Payment successful", `${prettyType(type)} of ${formatMoney(amount, school.currency)} paid to ${school.name}.`, "payment", `/portal/applications/${app.id}`);

      if (type === "assessment_fee") {
        await updateStatus("assessment_paid", "Assessment fee paid. Awaiting exam schedule from school.");
        toast({ kind: "success", title: "Assessment fee paid", message: "You'll be notified when the exam is scheduled." });
      } else if (type === "acceptance_fee") {
        await updateStatus("docs_submitted", "Acceptance fee paid. Please upload required documents.");
        toast({ kind: "success", title: "Acceptance fee paid", message: "Now upload your documents for review." });
        setUploadModal(true);
      } else if (type === "school_fees") {
        await updateStatus("fees_paid", "School fees paid. Awaiting registration number and class assignment.");
        await notifyParent(user!.id, "School fees paid", `School fees paid for ${ward.first_name}. The school will assign a registration number and class shortly.`, "enrollment", `/portal/applications/${app.id}`);
        toast({ kind: "success", title: "School fees paid", message: "The school will assign a registration number and class." });
      }
      toast({ kind: "success", title: "Receipt ready", message: "Download your receipt from the payments section." });
    } catch (e) {
      toast({ kind: "error", title: "Payment failed", message: (e as Error).message });
    }
    setPaying(null);
  };

  const computeSchoolFees = async (school: School): Promise<number> => {
    const { data: fees } = await supabase.from("fee_structures").select("*").eq("school_id", school.id).eq("mandatory", true);
    return (fees ?? []).reduce((sum: number, f: any) => sum + Number(f.amount), 0);
  };

  const reapply = async () => {
    await supabase.from("applications").update({ status: "submitted", rejection_reason: null, updated_at: new Date().toISOString() }).eq("id", app.id);
    await recordStage("submitted", "Application re-submitted for next session.");
    toast({ kind: "success", title: "Re-submitted", message: "Application sent to school for review." });
    await load();
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <Link to="/portal/applications" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
        <ArrowLeft className="h-4 w-4" /> All applications
      </Link>

      {/* Header */}
      <div className="card overflow-hidden">
        <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-brand-200">{ward.first_name} {ward.last_name}</p>
              <h1 className="text-2xl font-bold mt-1">{school.name}</h1>
              <p className="text-sm text-brand-100 mt-0.5">{app.applying_for_class_name} · {app.session_name}</p>
            </div>
            <Badge tone={meta.tone} className="!bg-white/20 !text-white whitespace-nowrap">{meta.label}</Badge>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-brand-100 mb-1.5">
              <span>{app.status === "rejected" ? "Application rejected" : "Admission progress"}</span>
              <span>{app.status === "rejected" ? "—" : `${progress}%`}</span>
            </div>
            <div className="h-2 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: app.status === "rejected" ? "100%" : `${progress}%` }} />
            </div>
          </div>
        </div>

        {app.status === "rejected" && (
          <div className="p-5 bg-rose-50 border-b border-rose-100">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-rose-900">Application rejected</p>
                {app.rejection_reason && <p className="text-sm text-rose-700 mt-0.5">{app.rejection_reason}</p>}
                <p className="text-xs text-rose-600 mt-2">You can re-apply for the next session or contact the school for attention.</p>
                <div className="flex gap-2 mt-3">
                  <Button variant="secondary" onClick={reapply} className="text-xs"><RefreshCw className="h-3.5 w-3.5" /> Re-apply for next session</Button>
                  <Link to="/portal/complaints" className="btn-secondary text-xs"><Send className="h-3.5 w-3.5" /> Contact school</Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {enrollment && (
          <div className="p-5 bg-brand-50 border-b border-brand-100">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-brand-900">Enrolled!</p>
                <p className="text-xs text-brand-800">
                  Reg. No: <span className="font-bold">{enrollment.registration_number}</span>
                  {enrollment.class_id && <> · Class: <span className="font-bold">{classes.find(c => c.id === enrollment.class_id)?.name ?? "—"}</span></>}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pipeline */}
      {app.status !== "rejected" && (
        <PipelineView status={app.status} />
      )}

      {/* Action cards by status */}
      <div className="grid md:grid-cols-2 gap-4">
        <ActionCard app={app} school={school} ward={ward} payments={payments} exam={exam} examResult={examResult} documents={documents}
          paying={paying} onPay={pay} onOpenUpload={() => setUploadModal(true)} />

        <ExamCard app={app} exam={exam} examResult={examResult} />
      </div>

      {/* Documents */}
      <DocumentsCard app={app} documents={documents} onOpenUpload={() => setUploadModal(true)} />

      {/* Payments */}
      <PaymentsCard payments={payments} school={school} ward={ward} />

      {/* Timeline */}
      <TimelineCard stages={stages} />

      {uploadModal && (
        <UploadDocumentsModal app={app} school={school} ward={ward} existing={documents} onClose={() => setUploadModal(false)} onDone={async () => { setUploadModal(false); await load(); }} />
      )}
    </div>
  );
}

function PipelineView({ status }: { status: Application["status"] }) {
  const idx = stageIndex(status);
  return (
    <div className="card p-5">
      <h2 className="text-base font-semibold text-ink-900 mb-4">Admission pipeline</h2>
      <div className="space-y-1">
        {PIPELINE_ORDER.map((s, i) => {
          const m = STAGE_META[s];
          const done = i < idx;
          const current = i === idx;
          return (
            <div key={s} className="flex items-center gap-3">
              <div className={`grid h-7 w-7 place-items-center rounded-full shrink-0 transition ${
                done ? "bg-brand-600 text-white" : current ? "bg-brand-100 text-brand-700 ring-2 ring-brand-400" : "bg-ink-100 text-ink-400"
              }`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <span className="text-xs font-bold">{i + 1}</span>}
              </div>
              <div className={`flex-1 py-2 border-b border-ink-100 last:border-0 ${current ? "" : done ? "" : "opacity-60"}`}>
                <p className={`text-sm font-medium ${current ? "text-brand-800" : done ? "text-ink-800" : "text-ink-500"}`}>{m.label}</p>
                {current && <p className="text-xs text-ink-500 mt-0.5">{m.description}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ActionCard({ app, school, ward, payments, exam, examResult, documents, paying, onPay, onOpenUpload }: {
  app: Application; school: School; ward: Ward; payments: Payment[]; exam: Exam | null; examResult: ExamResult | null; documents: DocumentRow[];
  paying: string | null; onPay: (t: "assessment_fee" | "acceptance_fee" | "school_fees") => void; onOpenUpload: () => void;
}) {
  const hasDocRejection = documents.some((d) => d.status === "rejected");

  let content: React.ReactNode = null;
  if (app.status === "approved") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-brand-600" />
          <p className="text-sm font-semibold text-brand-800">Application approved!</p>
        </div>
        <p className="text-sm text-ink-600 mb-4">Pay the assessment fee to proceed to the entrance exam.</p>
        <Button onClick={() => onPay("assessment_fee")} loading={paying === "assessment_fee"} className="w-full">
          <CreditCard className="h-4 w-4" /> Pay {formatMoney(school.assessment_fee, school.currency)} assessment fee
        </Button>
      </>
    );
  } else if (app.status === "assessment_paid") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-gold-600" />
          <p className="text-sm font-semibold text-gold-800">Awaiting exam schedule</p>
        </div>
        <p className="text-sm text-ink-600">The school will schedule your entrance exam. You'll be notified with the date and venue.</p>
      </>
    );
  } else if (app.status === "exam_scheduled") {
    content = exam ? (
      <div className="space-y-2">
        <p className="text-sm font-semibold text-ink-900">Exam scheduled</p>
        <div className="flex items-center gap-2 text-sm text-ink-700"><Calendar className="h-4 w-4 text-brand-600" /> {formatDateTime(exam.exam_date)}</div>
        {exam.venue && <div className="flex items-center gap-2 text-sm text-ink-700"><MapPin className="h-4 w-4 text-brand-600" /> {exam.venue}</div>}
        {exam.duration && <p className="text-xs text-ink-500">Duration: {exam.duration}</p>}
      </div>
    ) : <p className="text-sm text-ink-600">Exam details coming soon.</p>;
  } else if (app.status === "exam_passed") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-brand-600" />
          <p className="text-sm font-semibold text-brand-800">Exam passed!</p>
        </div>
        <p className="text-sm text-ink-600 mb-4">Pay the acceptance fee, then upload your documents for review.</p>
        <Button onClick={() => onPay("acceptance_fee")} loading={paying === "acceptance_fee"} className="w-full">
          <CreditCard className="h-4 w-4" /> Pay {formatMoney(school.acceptance_fee, school.currency)} acceptance fee
        </Button>
      </>
    );
  } else if (app.status === "docs_submitted") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-gold-600" />
          <p className="text-sm font-semibold text-gold-800">Documents under review</p>
        </div>
        <p className="text-sm text-ink-600">The school is reviewing your documents. You'll be notified of the decision.</p>
        <Button variant="secondary" onClick={onOpenUpload} className="w-full mt-3">
          <Upload className="h-4 w-4" /> Add more documents
        </Button>
      </>
    );
  } else if (app.status === "docs_approved") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-5 w-5 text-brand-600" />
          <p className="text-sm font-semibold text-brand-800">Documents approved!</p>
        </div>
        <p className="text-sm text-ink-600 mb-4">Pay school fees to complete enrollment.</p>
        <Button onClick={() => onPay("school_fees")} loading={paying === "school_fees"} className="w-full">
          <CreditCard className="h-4 w-4" /> Pay school fees
        </Button>
      </>
    );
  } else if (app.status === "docs_rejected" || hasDocRejection) {
    content = (
      <>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <p className="text-sm font-semibold text-rose-800">Documents rejected</p>
        </div>
        <p className="text-sm text-ink-600 mb-4">Please re-upload the requested documents.</p>
        <Button onClick={onOpenUpload} className="w-full">
          <Upload className="h-4 w-4" /> Re-upload documents
        </Button>
      </>
    );
  } else if (app.status === "fees_paid") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-gold-600" />
          <p className="text-sm font-semibold text-gold-800">Finalizing enrollment</p>
        </div>
        <p className="text-sm text-ink-600">The school is assigning a registration number and class. You'll be notified shortly.</p>
      </>
    );
  } else if (app.status === "enrolled") {
    content = (
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-brand-600" />
        <p className="text-sm font-semibold text-brand-800">Fully enrolled — welcome aboard!</p>
      </div>
    );
  } else if (app.status === "submitted" || app.status === "under_review") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="h-5 w-5 text-gold-600" />
          <p className="text-sm font-semibold text-gold-800">Awaiting school review</p>
        </div>
        <p className="text-sm text-ink-600">The school is reviewing your application. You'll be notified when approved.</p>
      </>
    );
  } else if (app.status === "exam_failed") {
    content = (
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-rose-600" />
        <p className="text-sm font-semibold text-rose-800">Exam not passed. Contact the school for guidance.</p>
      </div>
    );
  }

  return <div className="card p-5">{content}</div>;
}

function ExamCard({ app, exam, examResult }: { app: Application; exam: Exam | null; examResult: ExamResult | null }) {
  let title = "Entrance exam";
  let content: React.ReactNode = <p className="text-sm text-ink-500">Exam details will appear here once scheduled.</p>;

  if (app.status === "exam_scheduled" && exam) {
    title = "Exam scheduled";
    content = (
      <div className="space-y-2.5">
        <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-brand-600" /> {formatDateTime(exam.exam_date)}</div>
        {exam.venue && <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-brand-600" /> {exam.venue}</div>}
        {exam.duration && <p className="text-xs text-ink-500">Duration: {exam.duration}</p>}
        <p className="text-xs text-ink-400 mt-2">A confirmation page with these details will be shown after assessment fee payment. You'll be notified by email about the exam schedule.</p>
      </div>
    );
  } else if (examResult) {
    title = "Exam result";
    const pass = examResult.status === "pass";
    content = (
      <div>
        <div className="flex items-center gap-2 mb-2">
          {pass ? <CheckCircle2 className="h-5 w-5 text-brand-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}
          <p className={`text-sm font-semibold ${pass ? "text-brand-800" : "text-rose-800"}`}>{pass ? "Passed" : "Not passed"}</p>
        </div>
        {examResult.score != null && <p className="text-sm text-ink-700">Score: <span className="font-bold">{examResult.score}/{examResult.max_score}</span></p>}
        {examResult.remarks && <p className="text-xs text-ink-500 mt-1">{examResult.remarks}</p>}
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="text-base font-semibold text-ink-900 mb-3">{title}</h3>
      {content}
    </div>
  );
}

function DocumentsCard({ app, documents, onOpenUpload }: { app: Application; documents: DocumentRow[]; onOpenUpload: () => void }) {
  const required = DOCUMENT_TYPES.filter((d) => d.required);
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
        <h2 className="text-base font-semibold text-ink-900">Documents</h2>
        <Button variant="secondary" onClick={onOpenUpload} className="text-xs"><Upload className="h-3.5 w-3.5" /> Upload</Button>
      </div>
      <div className="p-5">
        {documents.length === 0 ? (
          <p className="text-sm text-ink-500">No documents uploaded yet. Required: {required.map((r) => r.label).join(", ")}.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((d) => {
              const tone = d.status === "approved" ? "brand" : d.status === "rejected" ? "rose" : "gold";
              return (
                <div key={d.id} className="flex items-center gap-3 rounded-xl ring-1 ring-ink-100 p-3">
                  <FileText className="h-5 w-5 text-ink-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-900 truncate">{d.label ?? d.type.replace(/_/g, " ")}</p>
                    {d.rejection_reason && <p className="text-xs text-rose-600 mt-0.5">{d.rejection_reason}</p>}
                  </div>
                  <Badge tone={tone}>{d.status}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function PaymentsCard({ payments, school, ward }: { payments: Payment[]; school: School; ward: Ward }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
        <h2 className="text-base font-semibold text-ink-900">Payments</h2>
        <span className="text-xs text-ink-500">{payments.filter(p => p.status === "paid").length} paid</span>
      </div>
      <div className="p-5">
        {payments.length === 0 ? (
          <p className="text-sm text-ink-500">No payments yet.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl ring-1 ring-ink-100 p-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink-900">{prettyType(p.type)}</p>
                  <p className="text-xs text-ink-500">{formatDateTime(p.paid_at ?? p.created_at)} · {p.reference}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-ink-900">{formatMoney(p.amount, p.currency)}</p>
                  {p.status === "paid" && (
                    <button onClick={() => downloadReceipt(p, school, ward)} className="text-xs text-brand-700 hover:underline inline-flex items-center gap-1">
                      <Download className="h-3 w-3" /> Receipt
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TimelineCard({ stages }: { stages: ApplicationStage[] }) {
  return (
    <div className="card">
      <div className="border-b border-ink-100 px-5 py-4">
        <h2 className="text-base font-semibold text-ink-900">Timeline</h2>
      </div>
      <div className="p-5">
        {stages.length === 0 ? (
          <p className="text-sm text-ink-500">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {[...stages].reverse().map((s) => (
              <div key={s.id} className="flex gap-3">
                <div className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-brand-700 shrink-0">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink-900">{STAGE_META[s.stage as keyof typeof STAGE_META]?.label ?? s.stage}</p>
                  {s.note && <p className="text-xs text-ink-500 mt-0.5">{s.note}</p>}
                  <p className="text-[10px] text-ink-400 mt-0.5">{formatDateTime(s.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadDocumentsModal({ app, school, ward, existing, onClose, onDone }: {
  app: Application; school: School; ward: Ward; existing: DocumentRow[]; onClose: () => void; onDone: () => void;
}) {
  const { user } = useAuth();
  const toast = useToast();
  const [type, setType] = useState<string>("birth_certificate");
  const [label, setLabel] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needed = DOCUMENT_TYPES.filter((d) => {
    if (!d.required) return false;
    return !existing.some((e) => e.type === d.value && e.status !== "rejected");
  });

  const submit = async () => {
    setError(null);
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { setError("File too large (max 8MB)."); return; }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${app.id}/${type}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("documents").upload(path, file, { upsert: false });
    if (upErr) { setError(upErr.message); setUploading(false); return; }
    const { data: pub } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 60 * 24 * 365);
    const { error: insErr } = await supabase.from("documents").insert({
      application_id: app.id, ward_id: ward.id, parent_id: user.id, school_id: school.id,
      type: type as DocumentRow["type"], label: label || null,
      file_url: pub?.signedUrl ?? path, file_name: file.name, file_size: file.size, status: "pending",
    });
    setUploading(false);
    if (insErr) { setError(insErr.message); return; }
    toast({ kind: "success", title: "Document uploaded", message: "The school will review it." });
    setFile(null); setLabel("");
    onDone();
  };

  return (
    <Modal open={true} onClose={onClose} title="Upload document" size="md">
      <div className="space-y-4">
        {needed.length > 0 && (
          <div className="rounded-xl bg-gold-50 ring-1 ring-gold-100 p-3 text-xs text-gold-800">
            Still needed: {needed.map((n) => n.label).join(", ")}
          </div>
        )}
        {error && <div className="rounded-xl bg-rose-50 ring-1 ring-rose-100 p-3 text-sm text-rose-700">{error}</div>}
        <div>
          <label className="label">Document type</label>
          <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
            {DOCUMENT_TYPES.map((d) => <option key={d.value} value={d.value}>{d.label}{d.required ? " *" : ""}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Label (optional)</label>
          <input className="input" placeholder="e.g. Tunde's birth certificate" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <div>
          <label className="label">File (PDF, JPG, PNG — max 8MB)</label>
          <div className="rounded-xl border-2 border-dashed border-ink-200 p-5 text-center hover:border-brand-400 transition cursor-pointer">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" id="doc-file"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <label htmlFor="doc-file" className="cursor-pointer">
              <Upload className="h-7 w-7 text-ink-400 mx-auto" />
              <p className="mt-2 text-sm text-ink-600">{file ? file.name : "Click to choose a file"}</p>
            </label>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Button onClick={submit} loading={uploading} disabled={!file} className="flex-1">
            <Upload className="h-4 w-4" /> Upload
          </Button>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
