/*
# Klasroom Core Schema — Part 2: Helpers, RLS policies, trigger, storage

## 1. Helper schema `kr` with SECURITY DEFINER functions used by RLS
- kr.is_parent()              — current user has parent_profiles row
- kr.is_school_admin()        — current user has school_admins row
- kr.admin_school_id()        — school_id of current admin (or null)
- kr.school_admin_of(uuid)    — current user is admin of given school
- kr.parent_owns_ward(uuid)   — current user owns the ward

## 2. RLS policies (4 per table, split, never FOR ALL)
- Public discovery tables (schools/classes/academic_sessions/fee_structures):
  SELECT anon+authenticated (no-login /apply discovery works).
- schools INSERT anon (Zoho-style self signup), UPDATE/DELETE own admin.
- Owner-scoped tables (wards/applications/payments/documents/complaints/requests/
  notifications): parent_id = auth.uid() for the owner; school_admin_of(school_id)
  for the school side.
- School-only tables (exams/exam_results/enrollments/attendance/results): school
  admin manages, parent reads via parent_owns_ward.
- parent_profiles/school_admins: self + school-admin colleagues.

## 3. Trigger
- on_auth_user_created on auth.users → handle_new_user() creates the matching
  profile row (parent_profiles or school_admins) using raw_user_meta_data.

## 4. Storage
- Bucket `documents` (private), path-prefixed by owner user id.
- Read authed; write/update/delete only into own folder prefix.

## 5. Auth config
- Best-effort enable email confirmation (explicitly required by product).
*/

-- =========================================================
-- Helper schema + functions
-- =========================================================
CREATE SCHEMA IF NOT EXISTS kr;

CREATE OR REPLACE FUNCTION kr.is_parent()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM parent_profiles WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION kr.is_school_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM school_admins WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION kr.admin_school_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM school_admins WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION kr.school_admin_of(p_school uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM school_admins WHERE id = auth.uid() AND school_id = p_school);
$$;

CREATE OR REPLACE FUNCTION kr.parent_owns_ward(p_ward uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM wards WHERE id = p_ward AND parent_id = auth.uid());
$$;

-- =========================================================
-- schools (tenants)
-- =========================================================
DROP POLICY IF EXISTS "schools_select_public" ON schools;
CREATE POLICY "schools_select_public" ON schools FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "schools_insert_self_signup" ON schools;
CREATE POLICY "schools_insert_self_signup" ON schools FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "schools_update_own_admin" ON schools;
CREATE POLICY "schools_update_own_admin" ON schools FOR UPDATE
  TO authenticated USING (kr.school_admin_of(id)) WITH CHECK (kr.school_admin_of(id));

DROP POLICY IF EXISTS "schools_delete_own_admin" ON schools;
CREATE POLICY "schools_delete_own_admin" ON schools FOR DELETE
  TO authenticated USING (kr.school_admin_of(id));

-- =========================================================
-- classes
-- =========================================================
DROP POLICY IF EXISTS "classes_select_public" ON classes;
CREATE POLICY "classes_select_public" ON classes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "classes_insert_admin" ON classes;
CREATE POLICY "classes_insert_admin" ON classes FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "classes_update_admin" ON classes;
CREATE POLICY "classes_update_admin" ON classes FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "classes_delete_admin" ON classes;
CREATE POLICY "classes_delete_admin" ON classes FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- academic_sessions
-- =========================================================
DROP POLICY IF EXISTS "sessions_select_public" ON academic_sessions;
CREATE POLICY "sessions_select_public" ON academic_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "sessions_insert_admin" ON academic_sessions;
CREATE POLICY "sessions_insert_admin" ON academic_sessions FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "sessions_update_admin" ON academic_sessions;
CREATE POLICY "sessions_update_admin" ON academic_sessions FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "sessions_delete_admin" ON academic_sessions;
CREATE POLICY "sessions_delete_admin" ON academic_sessions FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- fee_structures
-- =========================================================
DROP POLICY IF EXISTS "fees_select_public" ON fee_structures;
CREATE POLICY "fees_select_public" ON fee_structures FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "fees_insert_admin" ON fee_structures;
CREATE POLICY "fees_insert_admin" ON fee_structures FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "fees_update_admin" ON fee_structures;
CREATE POLICY "fees_update_admin" ON fee_structures FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "fees_delete_admin" ON fee_structures;
CREATE POLICY "fees_delete_admin" ON fee_structures FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- parent_profiles
-- =========================================================
DROP POLICY IF EXISTS "parent_select_self_or_school_admin" ON parent_profiles;
CREATE POLICY "parent_select_self_or_school_admin" ON parent_profiles FOR SELECT
  TO authenticated USING (id = auth.uid() OR kr.is_school_admin());

DROP POLICY IF EXISTS "parent_insert_self" ON parent_profiles;
CREATE POLICY "parent_insert_self" ON parent_profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "parent_update_self" ON parent_profiles;
CREATE POLICY "parent_update_self" ON parent_profiles FOR UPDATE
  TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- =========================================================
-- school_admins
-- =========================================================
DROP POLICY IF EXISTS "admin_select_self_or_colleagues" ON school_admins;
CREATE POLICY "admin_select_self_or_colleagues" ON school_admins FOR SELECT
  TO authenticated USING (id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "admin_insert_self_or_colleague" ON school_admins;
CREATE POLICY "admin_insert_self_or_colleague" ON school_admins FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "admin_update_self_or_colleague" ON school_admins;
CREATE POLICY "admin_update_self_or_colleague" ON school_admins FOR UPDATE
  TO authenticated USING (id = auth.uid() OR kr.school_admin_of(school_id))
  WITH CHECK (id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "admin_delete_colleague" ON school_admins;
CREATE POLICY "admin_delete_colleague" ON school_admins FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- wards
-- =========================================================
DROP POLICY IF EXISTS "ward_select_owner_or_school" ON wards;
CREATE POLICY "ward_select_owner_or_school" ON wards FOR SELECT
  TO authenticated USING (parent_id = auth.uid() OR kr.is_school_admin());

DROP POLICY IF EXISTS "ward_insert_owner" ON wards;
CREATE POLICY "ward_insert_owner" ON wards FOR INSERT
  TO authenticated WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS "ward_update_owner" ON wards;
CREATE POLICY "ward_update_owner" ON wards FOR UPDATE
  TO authenticated USING (parent_id = auth.uid()) WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS "ward_delete_owner" ON wards;
CREATE POLICY "ward_delete_owner" ON wards FOR DELETE
  TO authenticated USING (parent_id = auth.uid());

-- =========================================================
-- applications
-- =========================================================
DROP POLICY IF EXISTS "app_select_owner_or_school" ON applications;
CREATE POLICY "app_select_owner_or_school" ON applications FOR SELECT
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "app_insert_owner" ON applications;
CREATE POLICY "app_insert_owner" ON applications FOR INSERT
  TO authenticated WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS "app_update_owner_or_school" ON applications;
CREATE POLICY "app_update_owner_or_school" ON applications FOR UPDATE
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id))
  WITH CHECK (parent_id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "app_delete_owner" ON applications;
CREATE POLICY "app_delete_owner" ON applications FOR DELETE
  TO authenticated USING (parent_id = auth.uid());

-- =========================================================
-- application_stages
-- =========================================================
DROP POLICY IF EXISTS "stage_select_owner_or_school" ON application_stages;
CREATE POLICY "stage_select_owner_or_school" ON application_stages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM applications a WHERE a.id = application_stages.application_id
      AND (a.parent_id = auth.uid() OR kr.school_admin_of(a.school_id)))
  );

DROP POLICY IF EXISTS "stage_insert_owner_or_school" ON application_stages;
CREATE POLICY "stage_insert_owner_or_school" ON application_stages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM applications a WHERE a.id = application_stages.application_id
      AND (a.parent_id = auth.uid() OR kr.school_admin_of(a.school_id)))
  );

-- =========================================================
-- payments
-- =========================================================
DROP POLICY IF EXISTS "pay_select_owner_or_school" ON payments;
CREATE POLICY "pay_select_owner_or_school" ON payments FOR SELECT
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "pay_insert_owner_or_school" ON payments;
CREATE POLICY "pay_insert_owner_or_school" ON payments FOR INSERT
  TO authenticated WITH CHECK (parent_id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "pay_update_owner_or_school" ON payments;
CREATE POLICY "pay_update_owner_or_school" ON payments FOR UPDATE
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id))
  WITH CHECK (parent_id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "pay_delete_admin" ON payments;
CREATE POLICY "pay_delete_admin" ON payments FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- documents
-- =========================================================
DROP POLICY IF EXISTS "doc_select_owner_or_school" ON documents;
CREATE POLICY "doc_select_owner_or_school" ON documents FOR SELECT
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "doc_insert_owner" ON documents;
CREATE POLICY "doc_insert_owner" ON documents FOR INSERT
  TO authenticated WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS "doc_update_owner_or_school" ON documents;
CREATE POLICY "doc_update_owner_or_school" ON documents FOR UPDATE
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id))
  WITH CHECK (parent_id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "doc_delete_owner" ON documents;
CREATE POLICY "doc_delete_owner" ON documents FOR DELETE
  TO authenticated USING (parent_id = auth.uid());

-- =========================================================
-- exams
-- =========================================================
DROP POLICY IF EXISTS "exam_select_owner_or_school" ON exams;
CREATE POLICY "exam_select_owner_or_school" ON exams FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM applications a WHERE a.id = exams.application_id
      AND (a.parent_id = auth.uid() OR kr.school_admin_of(a.school_id)))
  );

DROP POLICY IF EXISTS "exam_insert_school" ON exams;
CREATE POLICY "exam_insert_school" ON exams FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "exam_update_school" ON exams;
CREATE POLICY "exam_update_school" ON exams FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "exam_delete_school" ON exams;
CREATE POLICY "exam_delete_school" ON exams FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- exam_results
-- =========================================================
DROP POLICY IF EXISTS "examresult_select_owner_or_school" ON exam_results;
CREATE POLICY "examresult_select_owner_or_school" ON exam_results FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM applications a WHERE a.id = exam_results.application_id
      AND (a.parent_id = auth.uid() OR kr.school_admin_of(a.school_id)))
  );

DROP POLICY IF EXISTS "examresult_insert_school" ON exam_results;
CREATE POLICY "examresult_insert_school" ON exam_results FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "examresult_update_school" ON exam_results;
CREATE POLICY "examresult_update_school" ON exam_results FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "examresult_delete_school" ON exam_results;
CREATE POLICY "examresult_delete_school" ON exam_results FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- enrollments
-- =========================================================
DROP POLICY IF EXISTS "enroll_select_owner_or_school" ON enrollments;
CREATE POLICY "enroll_select_owner_or_school" ON enrollments FOR SELECT
  TO authenticated USING (kr.parent_owns_ward(ward_id) OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "enroll_insert_school" ON enrollments;
CREATE POLICY "enroll_insert_school" ON enrollments FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "enroll_update_school" ON enrollments;
CREATE POLICY "enroll_update_school" ON enrollments FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "enroll_delete_school" ON enrollments;
CREATE POLICY "enroll_delete_school" ON enrollments FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- attendance
-- =========================================================
DROP POLICY IF EXISTS "att_select_owner_or_school" ON attendance;
CREATE POLICY "att_select_owner_or_school" ON attendance FOR SELECT
  TO authenticated USING (kr.parent_owns_ward(ward_id) OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "att_insert_school" ON attendance;
CREATE POLICY "att_insert_school" ON attendance FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "att_update_school" ON attendance;
CREATE POLICY "att_update_school" ON attendance FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "att_delete_school" ON attendance;
CREATE POLICY "att_delete_school" ON attendance FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- results
-- =========================================================
DROP POLICY IF EXISTS "result_select_owner_or_school" ON results;
CREATE POLICY "result_select_owner_or_school" ON results FOR SELECT
  TO authenticated USING (kr.parent_owns_ward(ward_id) OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "result_insert_school" ON results;
CREATE POLICY "result_insert_school" ON results FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "result_update_school" ON results;
CREATE POLICY "result_update_school" ON results FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "result_delete_school" ON results;
CREATE POLICY "result_delete_school" ON results FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- complaints
-- =========================================================
DROP POLICY IF EXISTS "comp_select_owner_or_school" ON complaints;
CREATE POLICY "comp_select_owner_or_school" ON complaints FOR SELECT
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "comp_insert_owner" ON complaints;
CREATE POLICY "comp_insert_owner" ON complaints FOR INSERT
  TO authenticated WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS "comp_update_owner_or_school" ON complaints;
CREATE POLICY "comp_update_owner_or_school" ON complaints FOR UPDATE
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id))
  WITH CHECK (parent_id = auth.uid() OR kr.school_admin_of(school_id));

-- =========================================================
-- requests
-- =========================================================
DROP POLICY IF EXISTS "req_select_owner_or_school" ON requests;
CREATE POLICY "req_select_owner_or_school" ON requests FOR SELECT
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "req_insert_owner" ON requests;
CREATE POLICY "req_insert_owner" ON requests FOR INSERT
  TO authenticated WITH CHECK (parent_id = auth.uid());

DROP POLICY IF EXISTS "req_update_owner_or_school" ON requests;
CREATE POLICY "req_update_owner_or_school" ON requests FOR UPDATE
  TO authenticated USING (parent_id = auth.uid() OR kr.school_admin_of(school_id))
  WITH CHECK (parent_id = auth.uid() OR kr.school_admin_of(school_id));

-- =========================================================
-- notifications
-- =========================================================
DROP POLICY IF EXISTS "notif_select_owner" ON notifications;
CREATE POLICY "notif_select_owner" ON notifications FOR SELECT
  TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_insert_authed" ON notifications;
CREATE POLICY "notif_insert_authed" ON notifications FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid() OR kr.is_school_admin());

DROP POLICY IF EXISTS "notif_update_owner" ON notifications;
CREATE POLICY "notif_update_owner" ON notifications FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "notif_delete_owner" ON notifications;
CREATE POLICY "notif_delete_owner" ON notifications FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- =========================================================
-- Trigger: auto-create profile on auth.users insert
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_type text;
  v_school_id uuid;
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
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- Storage bucket for documents
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "documents_read_authed" ON storage.objects;
CREATE POLICY "documents_read_authed" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'documents');

DROP POLICY IF EXISTS "documents_insert_owner_folder" ON storage.objects;
CREATE POLICY "documents_insert_owner_folder" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_update_owner_folder" ON storage.objects;
CREATE POLICY "documents_update_owner_folder" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "documents_delete_owner_folder" ON storage.objects;
CREATE POLICY "documents_delete_owner_folder" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================================
-- Best-effort: enable email confirmation (explicitly requested)
-- =========================================================
DO $$
BEGIN
  UPDATE auth.config SET confirm_email = true;
  RAISE NOTICE 'Email confirmation enabled.';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'auth.config update skipped: %', SQLERRM;
END
$$;
