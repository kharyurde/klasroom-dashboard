import type { ApplicationStatus } from "./types";

export type StageInfo = {
  key: ApplicationStatus;
  label: string;
  short: string;
  tone: "neutral" | "brand" | "ocean" | "gold" | "rose" | "ink";
  description: string;
};

export const STAGE_META: Record<ApplicationStatus, StageInfo> = {
  draft: { key: "draft", label: "Draft", short: "Draft", tone: "neutral", description: "Application not yet submitted." },
  submitted: { key: "submitted", label: "Submitted", short: "Submitted", tone: "ocean", description: "Application submitted to the school and awaiting review." },
  under_review: { key: "under_review", label: "Under Review", short: "Review", tone: "gold", description: "The school is reviewing this application." },
  approved: { key: "approved", label: "Approved — Pay Assessment", short: "Approved", tone: "brand", description: "Application approved. Pay the assessment/entrance exam fee to proceed." },
  rejected: { key: "rejected", label: "Rejected", short: "Rejected", tone: "rose", description: "Application was not accepted. You may re-apply next session." },
  assessment_paid: { key: "assessment_paid", label: "Assessment Paid", short: "Assessment Paid", tone: "ocean", description: "Assessment fee paid. Awaiting exam schedule from the school." },
  exam_scheduled: { key: "exam_scheduled", label: "Exam Scheduled", short: "Exam Set", tone: "gold", description: "Entrance exam has been scheduled. See details." },
  exam_passed: { key: "exam_passed", label: "Exam Passed", short: "Passed", tone: "brand", description: "Candidate passed the entrance exam. Pay acceptance fee & upload documents." },
  exam_failed: { key: "exam_failed", label: "Exam Not Passed", short: "Failed", tone: "rose", description: "Candidate did not pass the entrance exam." },
  docs_submitted: { key: "docs_submitted", label: "Documents Submitted", short: "Docs Review", tone: "gold", description: "Documents submitted for review by the school." },
  docs_approved: { key: "docs_approved", label: "Documents Approved", short: "Docs OK", tone: "brand", description: "Documents approved. Pay school fees to complete enrollment." },
  docs_rejected: { key: "docs_rejected", label: "Documents Rejected", short: "Docs Rejected", tone: "rose", description: "Documents were rejected. Please re-upload the requested documents." },
  fees_paid: { key: "fees_paid", label: "Fees Paid — Enrollment", short: "Fees Paid", tone: "ocean", description: "School fees paid. Awaiting registration number and class assignment." },
  enrolled: { key: "enrolled", label: "Enrolled", short: "Enrolled", tone: "brand", description: "Student is fully enrolled. Registration number and class assigned." },
  withdrawn: { key: "withdrawn", label: "Withdrawn", short: "Withdrawn", tone: "neutral", description: "Application withdrawn." },
};

export const PIPELINE_ORDER: ApplicationStatus[] = [
  "submitted",
  "under_review",
  "approved",
  "assessment_paid",
  "exam_scheduled",
  "exam_passed",
  "docs_submitted",
  "docs_approved",
  "fees_paid",
  "enrolled",
];

export function stageIndex(status: ApplicationStatus): number {
  const i = PIPELINE_ORDER.indexOf(status);
  return i < 0 ? 0 : i;
}

export const DOCUMENT_TYPES: { value: string; label: string; required: boolean }[] = [
  { value: "birth_certificate", label: "Birth Certificate", required: true },
  { value: "report_card", label: "Last Report Card / Result", required: true },
  { value: "passport_photo", label: "Passport Photograph", required: true },
  { value: "transfer_certificate", label: "Transfer Certificate (if applicable)", required: false },
  { value: "medical_record", label: "Medical / Immunization Record", required: false },
  { value: "proof_of_address", label: "Proof of Address", required: false },
  { value: "other", label: "Other", required: false },
];

export const COMPLAINT_CATEGORIES: { value: string; label: string }[] = [
  { value: "complaint", label: "Complaint" },
  { value: "teacher_report", label: "Report a Teacher" },
  { value: "issue", label: "Report an Issue" },
  { value: "general", label: "General" },
];

export const REQUEST_TYPES: { value: string; label: string }[] = [
  { value: "transcript", label: "Transcript" },
  { value: "transfer_certificate", label: "Transfer Certificate" },
  { value: "leave", label: "Leave of Absence" },
  { value: "id_card", label: "ID Card" },
  { value: "result_request", label: "Result / Report Card" },
  { value: "other", label: "Other" },
];
