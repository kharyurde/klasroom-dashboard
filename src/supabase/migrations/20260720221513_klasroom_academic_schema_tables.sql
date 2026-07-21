/*
# Klasroom Academic Schema — Tables (Part 1)

Creates academic tables for teacher & student portals.
Tables only — no policies yet (added in Part 2 after helper functions exist).
Order matters: students before student_class_enrollments.

## New Tables
- subjects, teachers, students, student_class_enrollments, teacher_assignments
- assignments, assignment_submissions
- cbt_exams, cbt_questions, cbt_attempts
- timetable_slots, calendar_events
- clubs, club_members
- result_drafts (teacher uploads -> admin approval -> results published)
*/

-- subjects
CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name, class_id)
);
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_subjects_school ON subjects(school_id);

-- teachers
CREATE TABLE IF NOT EXISTS teachers (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text,
  photo_url text,
  qualification text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_teachers_school ON teachers(school_id);

-- students (backed by enrollments — only admitted students get accounts)
CREATE TABLE IF NOT EXISTS students (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  admission_number text,
  photo_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','graduated','expelled','withdrawn','deleted')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_enrollment ON students(enrollment_id);

-- student_class_enrollments (links enrollment -> class for a session)
CREATE TABLE IF NOT EXISTS student_class_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  session_id uuid REFERENCES academic_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','graduated','expelled','withdrawn')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, session_id)
);
ALTER TABLE student_class_enrollments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sce_student ON student_class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_sce_class ON student_class_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_sce_school ON student_class_enrollments(school_id);

-- teacher_assignments (subject/class links — a teacher teaches X subject in Y class)
CREATE TABLE IF NOT EXISTS teacher_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (teacher_id, subject_id, class_id)
);
ALTER TABLE teacher_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_ta_teacher ON teacher_assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ta_school ON teacher_assignments(school_id);

-- assignments (assignment | test | exam | project)
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'assignment' CHECK (kind IN ('assignment','test','exam','project')),
  max_score numeric(6,2) NOT NULL DEFAULT 100,
  due_date timestamptz,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_assign_class ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_assign_teacher ON assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assign_school ON assignments(school_id);

-- assignment_submissions
CREATE TABLE IF NOT EXISTS assignment_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  content text,
  file_url text,
  file_name text,
  score numeric(6,2),
  teacher_feedback text,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','graded','returned')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  graded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, student_id)
);
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_sub_assign ON assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_sub_student ON assignment_submissions(student_id);

-- cbt_exams (objectives, teacher creates -> admin approves -> students take)
CREATE TABLE IF NOT EXISTS cbt_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  duration_minutes int NOT NULL DEFAULT 60,
  start_at timestamptz,
  end_at timestamptz,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approval_note text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive','completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cbt_exams ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cbt_class ON cbt_exams(class_id);
CREATE INDEX IF NOT EXISTS idx_cbt_teacher ON cbt_exams(teacher_id);
CREATE INDEX IF NOT EXISTS idx_cbt_school ON cbt_exams(school_id);

-- cbt_questions
CREATE TABLE IF NOT EXISTS cbt_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cbt_exam_id uuid NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  correct_option text NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  points numeric(6,2) NOT NULL DEFAULT 1,
  ord int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cbt_questions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cbtq_exam ON cbt_questions(cbt_exam_id);

-- cbt_attempts
CREATE TABLE IF NOT EXISTS cbt_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cbt_exam_id uuid NOT NULL REFERENCES cbt_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score numeric(6,2) NOT NULL DEFAULT 0,
  max_score numeric(6,2) NOT NULL DEFAULT 100,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','graded')),
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cbt_exam_id, student_id)
);
ALTER TABLE cbt_attempts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cbta_exam ON cbt_attempts(cbt_exam_id);
CREATE INDEX IF NOT EXISTS idx_cbta_student ON cbt_attempts(student_id);

-- timetable_slots (weekly recurring)
CREATE TABLE IF NOT EXISTS timetable_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  period int NOT NULL CHECK (period BETWEEN 1 AND 12),
  start_time text,
  end_time text,
  room text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, day_of_week, period)
);
ALTER TABLE timetable_slots ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_tt_class ON timetable_slots(class_id);
CREATE INDEX IF NOT EXISTS idx_tt_teacher ON timetable_slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tt_school ON timetable_slots(school_id);

-- calendar_events
CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  event_type text NOT NULL DEFAULT 'event' CHECK (event_type IN ('event','exam','holiday','activity','meeting','deadline')),
  start_date date NOT NULL,
  end_date date,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all','students','teachers','parents')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cal_school ON calendar_events(school_id);
CREATE INDEX IF NOT EXISTS idx_cal_start ON calendar_events(start_date);

-- clubs
CREATE TABLE IF NOT EXISTS clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  teacher_id uuid REFERENCES teachers(id) ON DELETE SET NULL,
  meeting_day text,
  meeting_time text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);
ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_clubs_school ON clubs(school_id);

-- club_members
CREATE TABLE IF NOT EXISTS club_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','executive','leader')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (club_id, student_id)
);
ALTER TABLE club_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cm_club ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_cm_student ON club_members(student_id);

-- result_drafts (teacher uploads -> admin approves -> published into results)
CREATE TABLE IF NOT EXISTS result_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id uuid NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE SET NULL,
  ward_id uuid NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  term text NOT NULL,
  session_name text,
  score numeric(6,2),
  max_score numeric(6,2) DEFAULT 100,
  grade text,
  teacher_remark text,
  approval_status text NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending','approved','rejected')),
  approval_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE result_drafts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_rd_school ON result_drafts(school_id);
CREATE INDEX IF NOT EXISTS idx_rd_teacher ON result_drafts(teacher_id);
CREATE INDEX IF NOT EXISTS idx_rd_class ON result_drafts(class_id);
CREATE INDEX IF NOT EXISTS idx_rd_status ON result_drafts(approval_status);
