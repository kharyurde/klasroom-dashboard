/*
# Klasroom Academic Schema — Part 2: Helpers, RLS, Trigger update

Helper functions for teacher/student role checks, updated auth trigger handling
4 user types (parent, school_admin, teacher, student), and 4 RLS policies per
new academic table. See Klasroom Academic Schema tables migration for table defs.
*/

-- =========================================================
-- Helper functions
-- =========================================================
CREATE OR REPLACE FUNCTION kr.is_teacher()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM teachers WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION kr.is_student()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM students WHERE id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION kr.teacher_school_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM teachers WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION kr.student_school_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT school_id FROM students WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION kr.student_class_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT class_id FROM student_class_enrollments
  WHERE student_id = auth.uid() AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION kr.teacher_of_class(p_class uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM teacher_assignments WHERE teacher_id = auth.uid() AND class_id = p_class);
$$;

CREATE OR REPLACE FUNCTION kr.teacher_owns_assignment(p_assign uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM assignments WHERE id = p_assign AND teacher_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION kr.teacher_owns_cbt(p_cbt uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM cbt_exams WHERE id = p_cbt AND teacher_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION kr.student_in_class(p_class uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM student_class_enrollments
    WHERE student_id = auth.uid() AND class_id = p_class AND status = 'active');
$$;

CREATE OR REPLACE FUNCTION kr.student_owns_submission(p_sub uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM assignment_submissions WHERE id = p_sub AND student_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION kr.student_owns_attempt(p_att uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM cbt_attempts WHERE id = p_att AND student_id = auth.uid());
$$;

-- =========================================================
-- Updated auth trigger (parent, school_admin, teacher, student)
-- =========================================================
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
  END IF;
  RETURN new;
END;
$$;

-- =========================================================
-- subjects
-- =========================================================
DROP POLICY IF EXISTS "subj_select_school" ON subjects;
CREATE POLICY "subj_select_school" ON subjects FOR SELECT
  TO authenticated USING (
    kr.school_admin_of(school_id) OR kr.teacher_school_id() = school_id OR kr.student_school_id() = school_id
  );
DROP POLICY IF EXISTS "subj_insert_admin" ON subjects;
CREATE POLICY "subj_insert_admin" ON subjects FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "subj_update_admin" ON subjects;
CREATE POLICY "subj_update_admin" ON subjects FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "subj_delete_admin" ON subjects;
CREATE POLICY "subj_delete_admin" ON subjects FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- teachers
-- =========================================================
DROP POLICY IF EXISTS "teacher_select_self_or_admin" ON teachers;
CREATE POLICY "teacher_select_self_or_admin" ON teachers FOR SELECT
  TO authenticated USING (id = auth.uid() OR kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "teacher_insert_admin" ON teachers;
CREATE POLICY "teacher_insert_admin" ON teachers FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "teacher_update_self_or_admin" ON teachers;
CREATE POLICY "teacher_update_self_or_admin" ON teachers FOR UPDATE
  TO authenticated USING (id = auth.uid() OR kr.school_admin_of(school_id))
  WITH CHECK (id = auth.uid() OR kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "teacher_delete_admin" ON teachers;
CREATE POLICY "teacher_delete_admin" ON teachers FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- students
-- =========================================================
DROP POLICY IF EXISTS "student_select_self_or_admin_or_teacher" ON students;
CREATE POLICY "student_select_self_or_admin_or_teacher" ON students FOR SELECT
  TO authenticated USING (
    id = auth.uid() OR kr.school_admin_of(school_id) OR kr.teacher_school_id() = school_id
  );
DROP POLICY IF EXISTS "student_insert_admin" ON students;
CREATE POLICY "student_insert_admin" ON students FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "student_update_admin" ON students;
CREATE POLICY "student_update_admin" ON students FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "student_delete_admin" ON students;
CREATE POLICY "student_delete_admin" ON students FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- student_class_enrollments
-- =========================================================
DROP POLICY IF EXISTS "sce_select_school" ON student_class_enrollments;
CREATE POLICY "sce_select_school" ON student_class_enrollments FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR kr.school_admin_of(school_id)
    OR kr.teacher_school_id() = school_id
  );
DROP POLICY IF EXISTS "sce_insert_admin" ON student_class_enrollments;
CREATE POLICY "sce_insert_admin" ON student_class_enrollments FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "sce_update_admin" ON student_class_enrollments;
CREATE POLICY "sce_update_admin" ON student_class_enrollments FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "sce_delete_admin" ON student_class_enrollments;
CREATE POLICY "sce_delete_admin" ON student_class_enrollments FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- teacher_assignments (subject/class links)
-- =========================================================
DROP POLICY IF EXISTS "ta_select_school" ON teacher_assignments;
CREATE POLICY "ta_select_school" ON teacher_assignments FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid()
    OR kr.school_admin_of(school_id)
    OR kr.student_school_id() = school_id
  );
DROP POLICY IF EXISTS "ta_insert_admin_or_teacher" ON teacher_assignments;
CREATE POLICY "ta_insert_admin_or_teacher" ON teacher_assignments FOR INSERT
  TO authenticated WITH CHECK (
    kr.school_admin_of(school_id) OR teacher_id = auth.uid()
  );
DROP POLICY IF EXISTS "ta_update_admin_or_teacher" ON teacher_assignments;
CREATE POLICY "ta_update_admin_or_teacher" ON teacher_assignments FOR UPDATE
  TO authenticated USING (teacher_id = auth.uid() OR kr.school_admin_of(school_id))
  WITH CHECK (teacher_id = auth.uid() OR kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "ta_delete_admin_or_teacher" ON teacher_assignments;
CREATE POLICY "ta_delete_admin_or_teacher" ON teacher_assignments FOR DELETE
  TO authenticated USING (teacher_id = auth.uid() OR kr.school_admin_of(school_id));

-- =========================================================
-- assignments
-- =========================================================
DROP POLICY IF EXISTS "assign_select_class_members" ON assignments;
CREATE POLICY "assign_select_class_members" ON assignments FOR SELECT
  TO authenticated USING (
    kr.teacher_owns_assignment(id)
    OR kr.school_admin_of(school_id)
    OR kr.student_in_class(class_id)
  );
DROP POLICY IF EXISTS "assign_insert_teacher" ON assignments;
CREATE POLICY "assign_insert_teacher" ON assignments FOR INSERT
  TO authenticated WITH CHECK (
    kr.teacher_school_id() = school_id AND kr.teacher_of_class(class_id)
  );
DROP POLICY IF EXISTS "assign_update_teacher" ON assignments;
CREATE POLICY "assign_update_teacher" ON assignments FOR UPDATE
  TO authenticated USING (kr.teacher_owns_assignment(id) OR kr.school_admin_of(school_id))
  WITH CHECK (kr.teacher_owns_assignment(id) OR kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "assign_delete_teacher" ON assignments;
CREATE POLICY "assign_delete_teacher" ON assignments FOR DELETE
  TO authenticated USING (kr.teacher_owns_assignment(id) OR kr.school_admin_of(school_id));

-- =========================================================
-- assignment_submissions
-- =========================================================
DROP POLICY IF EXISTS "sub_select_owner_or_teacher_or_admin" ON assignment_submissions;
CREATE POLICY "sub_select_owner_or_teacher_or_admin" ON assignment_submissions FOR SELECT
  TO authenticated USING (
    kr.student_owns_submission(id)
    OR kr.school_admin_of(school_id)
    OR EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_submissions.assignment_id AND a.teacher_id = auth.uid())
  );
DROP POLICY IF EXISTS "sub_insert_student" ON assignment_submissions;
CREATE POLICY "sub_insert_student" ON assignment_submissions FOR INSERT
  TO authenticated WITH CHECK (
    student_id = auth.uid() AND kr.student_in_class(class_id)
  );
DROP POLICY IF EXISTS "sub_update_student_or_teacher" ON assignment_submissions;
CREATE POLICY "sub_update_student_or_teacher" ON assignment_submissions FOR UPDATE
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_submissions.assignment_id AND a.teacher_id = auth.uid())
    OR kr.school_admin_of(school_id)
  ) WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM assignments a WHERE a.id = assignment_submissions.assignment_id AND a.teacher_id = auth.uid())
    OR kr.school_admin_of(school_id)
  );
DROP POLICY IF EXISTS "sub_delete_admin" ON assignment_submissions;
CREATE POLICY "sub_delete_admin" ON assignment_submissions FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- cbt_exams
-- =========================================================
DROP POLICY IF EXISTS "cbt_select_teacher_students_admin" ON cbt_exams;
CREATE POLICY "cbt_select_teacher_students_admin" ON cbt_exams FOR SELECT
  TO authenticated USING (
    kr.teacher_owns_cbt(id)
    OR kr.school_admin_of(school_id)
    OR kr.student_in_class(class_id)
  );
DROP POLICY IF EXISTS "cbt_insert_teacher" ON cbt_exams;
CREATE POLICY "cbt_insert_teacher" ON cbt_exams FOR INSERT
  TO authenticated WITH CHECK (
    kr.teacher_school_id() = school_id AND kr.teacher_of_class(class_id)
  );
DROP POLICY IF EXISTS "cbt_update_teacher_or_admin" ON cbt_exams;
CREATE POLICY "cbt_update_teacher_or_admin" ON cbt_exams FOR UPDATE
  TO authenticated USING (kr.teacher_owns_cbt(id) OR kr.school_admin_of(school_id))
  WITH CHECK (kr.teacher_owns_cbt(id) OR kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "cbt_delete_teacher_or_admin" ON cbt_exams;
CREATE POLICY "cbt_delete_teacher_or_admin" ON cbt_exams FOR DELETE
  TO authenticated USING (kr.teacher_owns_cbt(id) OR kr.school_admin_of(school_id));

-- =========================================================
-- cbt_questions
-- =========================================================
DROP POLICY IF EXISTS "cbtq_select_owner_students_admin" ON cbt_questions;
CREATE POLICY "cbtq_select_owner_students_admin" ON cbt_questions FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cbt_exams c WHERE c.id = cbt_questions.cbt_exam_id AND (
      c.teacher_id = auth.uid()
      OR kr.school_admin_of(c.school_id)
      OR (c.approval_status = 'approved' AND kr.student_in_class(c.class_id))
    ))
  );
DROP POLICY IF EXISTS "cbtq_insert_teacher" ON cbt_questions;
CREATE POLICY "cbtq_insert_teacher" ON cbt_questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM cbt_exams c WHERE c.id = cbt_questions.cbt_exam_id AND c.teacher_id = auth.uid())
  );
DROP POLICY IF EXISTS "cbtq_update_teacher_or_admin" ON cbt_questions;
CREATE POLICY "cbtq_update_teacher_or_admin" ON cbt_questions FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cbt_exams c WHERE c.id = cbt_questions.cbt_exam_id AND (c.teacher_id = auth.uid() OR kr.school_admin_of(c.school_id)))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM cbt_exams c WHERE c.id = cbt_questions.cbt_exam_id AND (c.teacher_id = auth.uid() OR kr.school_admin_of(c.school_id)))
  );
DROP POLICY IF EXISTS "cbtq_delete_teacher_or_admin" ON cbt_questions;
CREATE POLICY "cbtq_delete_teacher_or_admin" ON cbt_questions FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM cbt_exams c WHERE c.id = cbt_questions.cbt_exam_id AND (c.teacher_id = auth.uid() OR kr.school_admin_of(c.school_id)))
  );

-- =========================================================
-- cbt_attempts
-- =========================================================
DROP POLICY IF EXISTS "cbta_select_owner_or_teacher_or_admin" ON cbt_attempts;
CREATE POLICY "cbta_select_owner_or_teacher_or_admin" ON cbt_attempts FOR SELECT
  TO authenticated USING (
    kr.student_owns_attempt(id)
    OR kr.school_admin_of(school_id)
    OR EXISTS (SELECT 1 FROM cbt_exams c WHERE c.id = cbt_attempts.cbt_exam_id AND c.teacher_id = auth.uid())
  );
DROP POLICY IF EXISTS "cbta_insert_student" ON cbt_attempts;
CREATE POLICY "cbta_insert_student" ON cbt_attempts FOR INSERT
  TO authenticated WITH CHECK (
    student_id = auth.uid() AND kr.student_in_class(class_id)
  );
DROP POLICY IF EXISTS "cbta_update_student_or_teacher" ON cbt_attempts;
CREATE POLICY "cbta_update_student_or_teacher" ON cbt_attempts FOR UPDATE
  TO authenticated USING (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM cbt_exams c WHERE c.id = cbt_attempts.cbt_exam_id AND c.teacher_id = auth.uid())
    OR kr.school_admin_of(school_id)
  ) WITH CHECK (
    student_id = auth.uid()
    OR EXISTS (SELECT 1 FROM cbt_exams c WHERE c.id = cbt_attempts.cbt_exam_id AND c.teacher_id = auth.uid())
    OR kr.school_admin_of(school_id)
  );
DROP POLICY IF EXISTS "cbta_delete_admin" ON cbt_attempts;
CREATE POLICY "cbta_delete_admin" ON cbt_attempts FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- timetable_slots
-- =========================================================
DROP POLICY IF EXISTS "tt_select_school" ON timetable_slots;
CREATE POLICY "tt_select_school" ON timetable_slots FOR SELECT
  TO authenticated USING (
    kr.school_admin_of(school_id)
    OR kr.teacher_school_id() = school_id
    OR kr.student_school_id() = school_id
  );
DROP POLICY IF EXISTS "tt_insert_admin" ON timetable_slots;
CREATE POLICY "tt_insert_admin" ON timetable_slots FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "tt_update_admin" ON timetable_slots;
CREATE POLICY "tt_update_admin" ON timetable_slots FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "tt_delete_admin" ON timetable_slots;
CREATE POLICY "tt_delete_admin" ON timetable_slots FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- calendar_events
-- =========================================================
DROP POLICY IF EXISTS "cal_select_school" ON calendar_events;
CREATE POLICY "cal_select_school" ON calendar_events FOR SELECT
  TO authenticated USING (
    kr.school_admin_of(school_id)
    OR kr.teacher_school_id() = school_id
    OR kr.student_school_id() = school_id
  );
DROP POLICY IF EXISTS "cal_insert_admin" ON calendar_events;
CREATE POLICY "cal_insert_admin" ON calendar_events FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "cal_update_admin" ON calendar_events;
CREATE POLICY "cal_update_admin" ON calendar_events FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "cal_delete_admin" ON calendar_events;
CREATE POLICY "cal_delete_admin" ON calendar_events FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- clubs
-- =========================================================
DROP POLICY IF EXISTS "club_select_school" ON clubs;
CREATE POLICY "club_select_school" ON clubs FOR SELECT
  TO authenticated USING (
    kr.school_admin_of(school_id)
    OR kr.teacher_school_id() = school_id
    OR kr.student_school_id() = school_id
  );
DROP POLICY IF EXISTS "club_insert_admin" ON clubs;
CREATE POLICY "club_insert_admin" ON clubs FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "club_update_admin" ON clubs;
CREATE POLICY "club_update_admin" ON clubs FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "club_delete_admin" ON clubs;
CREATE POLICY "club_delete_admin" ON clubs FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

-- =========================================================
-- club_members
-- =========================================================
DROP POLICY IF EXISTS "cm_select_school" ON club_members;
CREATE POLICY "cm_select_school" ON club_members FOR SELECT
  TO authenticated USING (
    student_id = auth.uid()
    OR kr.school_admin_of(school_id)
    OR kr.teacher_school_id() = school_id
  );
DROP POLICY IF EXISTS "cm_insert_student_or_admin" ON club_members;
CREATE POLICY "cm_insert_student_or_admin" ON club_members FOR INSERT
  TO authenticated WITH CHECK (
    student_id = auth.uid() OR kr.school_admin_of(school_id)
  );
DROP POLICY IF EXISTS "cm_update_admin" ON club_members;
CREATE POLICY "cm_update_admin" ON club_members FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "cm_delete_student_or_admin" ON club_members;
CREATE POLICY "cm_delete_student_or_admin" ON club_members FOR DELETE
  TO authenticated USING (student_id = auth.uid() OR kr.school_admin_of(school_id));

-- =========================================================
-- result_drafts (teacher uploads -> admin approval)
-- =========================================================
DROP POLICY IF EXISTS "rd_select_teacher_or_admin" ON result_drafts;
CREATE POLICY "rd_select_teacher_or_admin" ON result_drafts FOR SELECT
  TO authenticated USING (
    teacher_id = auth.uid() OR kr.school_admin_of(school_id)
  );
DROP POLICY IF EXISTS "rd_insert_teacher" ON result_drafts;
CREATE POLICY "rd_insert_teacher" ON result_drafts FOR INSERT
  TO authenticated WITH CHECK (
    teacher_id = auth.uid() AND kr.teacher_school_id() = school_id
  );
DROP POLICY IF EXISTS "rd_update_teacher_or_admin" ON result_drafts;
CREATE POLICY "rd_update_teacher_or_admin" ON result_drafts FOR UPDATE
  TO authenticated USING (teacher_id = auth.uid() OR kr.school_admin_of(school_id))
  WITH CHECK (teacher_id = auth.uid() OR kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "rd_delete_teacher_or_admin" ON result_drafts;
CREATE POLICY "rd_delete_teacher_or_admin" ON result_drafts FOR DELETE
  TO authenticated USING (teacher_id = auth.uid() OR kr.school_admin_of(school_id));
