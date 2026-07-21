-- 1. Update handle_new_user() to handle teacher + student user types
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_type text;
  v_school_id uuid;
  v_enrollment_id uuid;
BEGIN
  v_user_type := COALESCE(new.raw_user_meta_data->>'user_type', 'parent');
  IF v_user_type = 'parent' THEN
    INSERT INTO parent_profiles (id, email, full_name, phone)
    VALUES (new.id, new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'phone', ''))
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_user_type = 'school_admin' THEN
    v_school_id := NULLIF(new.raw_user_meta_data->>'school_id', '')::uuid;
    INSERT INTO school_admins (id, school_id, email, full_name, role, phone)
    VALUES (new.id, v_school_id, new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'role', 'admin'),
      COALESCE(new.raw_user_meta_data->>'phone', ''))
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_user_type = 'teacher' THEN
    v_school_id := NULLIF(new.raw_user_meta_data->>'school_id', '')::uuid;
    INSERT INTO teachers (id, school_id, email, full_name, phone, qualification)
    VALUES (new.id, v_school_id, new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'phone', ''),
      COALESCE(new.raw_user_meta_data->>'qualification', ''))
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_user_type = 'student' THEN
    v_school_id := NULLIF(new.raw_user_meta_data->>'school_id', '')::uuid;
    v_enrollment_id := NULLIF(new.raw_user_meta_data->>'enrollment_id', '')::uuid;
    INSERT INTO students (id, school_id, enrollment_id, email, full_name, admission_number)
    VALUES (new.id, v_school_id, v_enrollment_id, new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'admission_number', ''))
    ON CONFLICT (id) DO NOTHING;
  ELSIF v_user_type = 'platform_admin' THEN
    INSERT INTO platform_admins (id, email, full_name, role)
    VALUES (new.id, new.email,
      COALESCE(new.raw_user_meta_data->>'full_name', ''),
      COALESCE(new.raw_user_meta_data->>'role', 'admin'))
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN new;
END;
$$;

-- 2. platform_admins table
CREATE TABLE IF NOT EXISTS platform_admins (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- 3. Helper: kr.is_platform_admin()
CREATE OR REPLACE FUNCTION kr.is_platform_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM platform_admins WHERE id = auth.uid());
$$;

-- 4. platform_admins RLS (self only)
DROP POLICY IF EXISTS "platform_admin_select_self" ON platform_admins;
CREATE POLICY "platform_admin_select_self" ON platform_admins FOR SELECT
  TO authenticated USING (id = auth.uid() OR kr.is_platform_admin());

DROP POLICY IF EXISTS "platform_admin_insert_self" ON platform_admins;
CREATE POLICY "platform_admin_insert_self" ON platform_admins FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

-- 5. Platform admin SELECT policies on key tables
DROP POLICY IF EXISTS "schools_select_platform" ON schools;
CREATE POLICY "schools_select_platform" ON schools FOR SELECT
  TO authenticated USING (kr.is_platform_admin());

DROP POLICY IF EXISTS "schools_update_platform" ON schools;
CREATE POLICY "schools_update_platform" ON schools FOR UPDATE
  TO authenticated USING (kr.is_platform_admin()) WITH CHECK (kr.is_platform_admin());

DROP POLICY IF EXISTS "payments_select_platform" ON payments;
CREATE POLICY "payments_select_platform" ON payments FOR SELECT
  TO authenticated USING (kr.is_platform_admin());

DROP POLICY IF EXISTS "school_admins_select_platform" ON school_admins;
CREATE POLICY "school_admins_select_platform" ON school_admins FOR SELECT
  TO authenticated USING (kr.is_platform_admin());

DROP POLICY IF EXISTS "enroll_select_platform" ON enrollments;
CREATE POLICY "enroll_select_platform" ON enrollments FOR SELECT
  TO authenticated USING (kr.is_platform_admin());

DROP POLICY IF EXISTS "teachers_select_platform" ON teachers;
CREATE POLICY "teachers_select_platform" ON teachers FOR SELECT
  TO authenticated USING (kr.is_platform_admin());

DROP POLICY IF EXISTS "students_select_platform" ON students;
CREATE POLICY "students_select_platform" ON students FOR SELECT
  TO authenticated USING (kr.is_platform_admin());

DROP POLICY IF EXISTS "app_select_platform" ON applications;
CREATE POLICY "app_select_platform" ON applications FOR SELECT
  TO authenticated USING (kr.is_platform_admin());

DROP POLICY IF EXISTS "classes_select_platform" ON classes;
CREATE POLICY "classes_select_platform" ON classes FOR SELECT
  TO authenticated USING (kr.is_platform_admin());
