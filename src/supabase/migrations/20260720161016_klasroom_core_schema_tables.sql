# Klasroom Core Schema — Part 1: Tables (no policies yet)

Creates all Klasroom tables and enables RLS. Policies are added in Part 2
after the kr helper functions exist (functions reference these tables).

## New Tables
- schools (tenants), classes, academic_sessions, fee_structures
- parent_profiles, school_admins, wards
- applications, application_stages, payments, documents
- exams, exam_results, enrollments
- attendance, results, complaints, requests, notifications

All money columns numeric(12,2). Currency defaults NGN. Owner columns
default to auth.uid() so frontend inserts that omit the owner still pass RLS.
RLS is ENABLED on every table but no policies yet (added in Part 2), so tables
are locked down until then — this migration alone does not expose any data.
*/

-- schools (tenants)
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  logo_url text,
  tagline text,
  description text,
  address text,
  city text,
  state text,
  country text NOT NULL DEFAULT 'Nigeria',
  phone text,
  email text,
  website text,
  currency text NOT NULL DEFAULT 'NGN',
  application_fee numeric(12,2) NOT NULL DEFAULT 0,
  assessment_fee numeric(12,2) NOT NULL DEFAULT 0,
  acceptance_fee numeric(12,2) NOT NULL DEFAULT 0,
  payment_provider text NOT NULL DEFAULT 'stripe',
  stripe_account_id text,
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial','active','suspended','cancelled','past_due')),
  subscription_plan text,
  trial_ends_at timestamptz,
  current_session_id uuid,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;

-- classes
CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  level int,
  capacity int DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;

-- academic_sessions
CREATE TABLE IF NOT EXISTS academic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  start_date date,
  end_date date,
  is_current boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, name)
);
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;

-- schools.current_session_id FK (added after academic_sessions exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'schools_current_session_fk'
  ) THEN
    ALTER TABLE schools ADD CONSTRAINT schools_current_session_fk
      FOREIGN KEY (current_session_id) REFERENCES academic_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- fee_structures
CREATE TABLE IF NOT EXISTS fee_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  term text,
  mandatory boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;

-- parent_profiles
CREATE TABLE IF NOT EXISTS parent_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text,
  address text,
  avatar_url text,
  email_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE parent_profiles ENABLE ROW LEVEL SECURITY;

-- school_admins
CREATE TABLE IF NOT EXISTS school_admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','principal','teacher','bursar','staff')),
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE school_admins ENABLE ROW LEVEL SECURITY;

-- wards
CREATE TABLE IF NOT EXISTS wards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL DEFAULT auth.uid() REFERENCES parent_profiles(id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  gender text CHECK (gender IN ('male','female','other')),
  photo_url text,
  blood_group text,
  medical_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE wards ENABLE ROW LEVEL SECURITY;

-- applications
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL DEFAULT auth.uid() REFERENCES parent_profiles(id) ON DELETE CASCADE,
  applying_for_class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  applying_for_class_name text,
  session_id uuid REFERENCES academic_sessions(id) ON DELETE SET NULL,
  session_name text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN (
    'draft','submitted','under_review','approved','rejected',
    'assessment_paid','exam_scheduled','exam_passed','exam_failed',
    'docs_submitted','docs_approved','docs_rejected','fees_paid','enrolled','withdrawn'
  )),
  registration_number text,
  assigned_class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  rejection_reason text,
  exam_date timestamptz,
  exam_venue text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_applications_school_status ON applications(school_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_parent ON applications(parent_id);
CREATE INDEX IF NOT EXISTS idx_applications_ward ON applications(ward_id);

-- application_stages (audit log)
CREATE TABLE IF NOT EXISTS application_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  stage text NOT NULL,
  note text,
  actor_type text CHECK (actor_type IN ('parent','school','system')),
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE application_stages ENABLE ROW LEVEL SECURITY;

-- payments
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  enrollment_id uuid,
  ward_id uuid NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL DEFAULT auth.uid() REFERENCES parent_profiles(id) ON DELETE CASCADE,
  fee_structure_id uuid REFERENCES fee_structures(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('application_fee','assessment_fee','acceptance_fee','school_fees','other_fees')),
  description text,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  reference text,
  method text DEFAULT 'card',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payments_parent ON payments(parent_id);
CREATE INDEX IF NOT EXISTS idx_payments_school ON payments(school_id);

-- documents
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  ward_id uuid NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  parent_id uuid NOT NULL DEFAULT auth.uid() REFERENCES parent_profiles(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('birth_certificate','report_card','passport_photo','transfer_certificate','medical_record','proof_of_address','other')),
  label text,
  file_url text NOT NULL,
  file_name text,
  file_size bigint,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- exams
CREATE TABLE IF NOT EXISTS exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  exam_date timestamptz,
  venue text,
  duration text,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled','no_show')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;

-- exam_results
CREATE TABLE IF NOT EXISTS exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  score numeric(6,2),
  max_score numeric(6,2) DEFAULT 100,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','pass','fail')),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

-- enrollments
CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id uuid NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  class_id uuid REFERENCES classes(id) ON DELETE SET NULL,
  registration_number text,
  session_id uuid REFERENCES academic_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','graduated','withdrawn','suspended')),
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, registration_number)
);
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_enroll_school ON enrollments(school_id);
CREATE INDEX IF NOT EXISTS idx_enroll_ward ON enrollments(ward_id);

-- attendance
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  ward_id uuid NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('present','absent','late','excused')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (enrollment_id, date)
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- results (report card lines)
CREATE TABLE IF NOT EXISTS results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  ward_id uuid NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  term text NOT NULL,
  session_name text,
  subject text NOT NULL,
  score numeric(6,2),
  max_score numeric(6,2) DEFAULT 100,
  grade text,
  teacher_remark text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- complaints
CREATE TABLE IF NOT EXISTS complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL DEFAULT auth.uid() REFERENCES parent_profiles(id) ON DELETE CASCADE,
  ward_id uuid REFERENCES wards(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  subject text NOT NULL,
  category text NOT NULL DEFAULT 'complaint' CHECK (category IN ('complaint','teacher_report','issue','general')),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  school_response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- requests
CREATE TABLE IF NOT EXISTS requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid NOT NULL DEFAULT auth.uid() REFERENCES parent_profiles(id) ON DELETE CASCADE,
  ward_id uuid REFERENCES wards(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('transcript','transfer_certificate','leave','id_card','result_request','other')),
  details text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','fulfilled')),
  school_response text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- notifications
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  type text,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);
