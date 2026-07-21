export type School = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  currency: string;
  application_fee: number;
  assessment_fee: number;
  acceptance_fee: number;
  payment_provider: string;
  stripe_account_id: string | null;
  subscription_status: "trial" | "active" | "suspended" | "cancelled" | "past_due";
  subscription_plan: string | null;
  trial_ends_at: string | null;
  current_session_id: string | null;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type ClassLevel = {
  id: string;
  school_id: string;
  name: string;
  level: number | null;
  capacity: number | null;
  created_at: string;
};

export type AcademicSession = {
  id: string;
  school_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  created_at: string;
};

export type FeeStructure = {
  id: string;
  school_id: string;
  class_id: string | null;
  name: string;
  amount: number;
  currency: string;
  term: string | null;
  mandatory: boolean;
  created_at: string;
};

export type ParentProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
};

export type SchoolAdmin = {
  id: string;
  school_id: string;
  email: string;
  full_name: string;
  role: "admin" | "principal" | "teacher" | "bursar" | "staff";
  phone: string | null;
  created_at: string;
};

export type Ward = {
  id: string;
  parent_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  gender: "male" | "female" | "other" | null;
  photo_url: string | null;
  blood_group: string | null;
  medical_notes: string | null;
  created_at: string;
};

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "assessment_paid"
  | "exam_scheduled"
  | "exam_passed"
  | "exam_failed"
  | "docs_submitted"
  | "docs_approved"
  | "docs_rejected"
  | "fees_paid"
  | "enrolled"
  | "withdrawn";

export type Application = {
  id: string;
  ward_id: string;
  school_id: string;
  parent_id: string;
  applying_for_class_id: string | null;
  applying_for_class_name: string | null;
  session_id: string | null;
  session_name: string | null;
  status: ApplicationStatus;
  registration_number: string | null;
  assigned_class_id: string | null;
  rejection_reason: string | null;
  exam_date: string | null;
  exam_venue: string | null;
  created_at: string;
  updated_at: string;
};

export type ApplicationStage = {
  id: string;
  application_id: string;
  stage: string;
  note: string | null;
  actor_type: "parent" | "school" | "system" | null;
  actor_id: string | null;
  created_at: string;
};

export type PaymentType =
  | "application_fee"
  | "assessment_fee"
  | "acceptance_fee"
  | "school_fees"
  | "other_fees";

export type Payment = {
  id: string;
  application_id: string | null;
  enrollment_id: string | null;
  ward_id: string;
  school_id: string;
  parent_id: string;
  fee_structure_id: string | null;
  type: PaymentType;
  description: string | null;
  amount: number;
  currency: string;
  status: "pending" | "paid" | "failed" | "refunded";
  reference: string | null;
  method: string | null;
  paid_at: string | null;
  created_at: string;
};

export type DocumentType =
  | "birth_certificate"
  | "report_card"
  | "passport_photo"
  | "transfer_certificate"
  | "medical_record"
  | "proof_of_address"
  | "other";

export type DocumentRow = {
  id: string;
  application_id: string;
  ward_id: string;
  parent_id: string;
  school_id: string;
  type: DocumentType;
  label: string | null;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type Exam = {
  id: string;
  school_id: string;
  application_id: string;
  exam_date: string | null;
  venue: string | null;
  duration: string | null;
  status: "scheduled" | "completed" | "cancelled" | "no_show";
  created_at: string;
};

export type ExamResult = {
  id: string;
  exam_id: string;
  application_id: string;
  school_id: string;
  score: number | null;
  max_score: number;
  status: "pending" | "pass" | "fail";
  remarks: string | null;
  created_at: string;
};

export type Enrollment = {
  id: string;
  ward_id: string;
  school_id: string;
  application_id: string | null;
  class_id: string | null;
  registration_number: string | null;
  session_id: string | null;
  status: "active" | "graduated" | "withdrawn" | "suspended";
  enrolled_at: string;
};

export type AttendanceRow = {
  id: string;
  enrollment_id: string;
  ward_id: string;
  school_id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  note: string | null;
  created_at: string;
};

export type ResultRow = {
  id: string;
  enrollment_id: string;
  ward_id: string;
  school_id: string;
  term: string;
  session_name: string | null;
  subject: string;
  score: number | null;
  max_score: number;
  grade: string | null;
  teacher_remark: string | null;
  published: boolean;
  created_at: string;
};

export type Complaint = {
  id: string;
  parent_id: string;
  ward_id: string | null;
  school_id: string;
  enrollment_id: string | null;
  subject: string;
  category: "complaint" | "teacher_report" | "issue" | "general";
  message: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  school_response: string | null;
  responded_at: string | null;
  created_at: string;
};

export type RequestRow = {
  id: string;
  parent_id: string;
  ward_id: string | null;
  school_id: string;
  enrollment_id: string | null;
  type:
    | "transcript"
    | "transfer_certificate"
    | "leave"
    | "id_card"
    | "result_request"
    | "other";
  details: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
  school_response: string | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export type SessionUser = {
  id: string;
  email: string;
  userType: "parent" | "school_admin" | "teacher" | "student" | "platform_admin";
};

export type PlatformAdmin = {
  id: string;
  email: string;
  full_name: string;
  role: string;
  created_at: string;
};

// =========================================================
// Academic types
// =========================================================

export type Subject = {
  id: string;
  school_id: string;
  name: string;
  code: string | null;
  class_id: string | null;
  created_at: string;
};

export type Teacher = {
  id: string;
  school_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  photo_url: string | null;
  qualification: string | null;
  status: "active" | "inactive" | "suspended";
  created_at: string;
};

export type Student = {
  id: string;
  school_id: string;
  enrollment_id: string;
  email: string;
  full_name: string;
  admission_number: string | null;
  photo_url: string | null;
  status: "active" | "graduated" | "expelled" | "withdrawn" | "deleted";
  created_at: string;
};

export type StudentClassEnrollment = {
  id: string;
  student_id: string;
  school_id: string;
  enrollment_id: string;
  class_id: string;
  session_id: string | null;
  status: "active" | "graduated" | "expelled" | "withdrawn";
  created_at: string;
};

export type TeacherAssignmentLink = {
  id: string;
  teacher_id: string;
  school_id: string;
  subject_id: string | null;
  class_id: string | null;
  created_at: string;
};

export type AssignmentKind = "assignment" | "test" | "exam" | "project";

export type Assignment = {
  id: string;
  school_id: string;
  teacher_id: string;
  subject_id: string | null;
  class_id: string;
  title: string;
  description: string | null;
  kind: AssignmentKind;
  max_score: number;
  due_date: string | null;
  status: "draft" | "published" | "closed";
  created_at: string;
};

export type AssignmentSubmission = {
  id: string;
  assignment_id: string;
  student_id: string;
  school_id: string;
  class_id: string;
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  score: number | null;
  teacher_feedback: string | null;
  status: "submitted" | "graded" | "returned";
  submitted_at: string;
  graded_at: string | null;
  created_at: string;
};

export type CbtExam = {
  id: string;
  school_id: string;
  teacher_id: string;
  subject_id: string | null;
  class_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  start_at: string | null;
  end_at: string | null;
  approval_status: "pending" | "approved" | "rejected";
  approval_note: string | null;
  status: "active" | "inactive" | "completed";
  created_at: string;
};

export type CbtQuestion = {
  id: string;
  cbt_exam_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "a" | "b" | "c" | "d";
  points: number;
  ord: number;
  created_at: string;
};

export type CbtAttempt = {
  id: string;
  cbt_exam_id: string;
  student_id: string;
  school_id: string;
  class_id: string;
  answers: Record<string, "a" | "b" | "c" | "d">;
  score: number;
  max_score: number;
  status: "in_progress" | "submitted" | "graded";
  started_at: string;
  submitted_at: string | null;
  created_at: string;
};

export type TimetableSlot = {
  id: string;
  school_id: string;
  class_id: string;
  subject_id: string | null;
  teacher_id: string | null;
  day_of_week: number;
  period: number;
  start_time: string | null;
  end_time: string | null;
  room: string | null;
  created_at: string;
};

export type CalendarEvent = {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  event_type: "event" | "exam" | "holiday" | "activity" | "meeting" | "deadline";
  start_date: string;
  end_date: string | null;
  audience: "all" | "students" | "teachers" | "parents";
  created_at: string;
};

export type Club = {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  teacher_id: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  created_at: string;
};

export type ClubMember = {
  id: string;
  club_id: string;
  student_id: string;
  school_id: string;
  role: "member" | "executive" | "leader";
  joined_at: string;
};

export type ResultDraft = {
  id: string;
  school_id: string;
  teacher_id: string;
  subject_id: string;
  class_id: string;
  enrollment_id: string;
  student_id: string | null;
  ward_id: string;
  term: string;
  session_name: string | null;
  score: number | null;
  max_score: number;
  grade: string | null;
  teacher_remark: string | null;
  approval_status: "pending" | "approved" | "rejected";
  approval_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};
