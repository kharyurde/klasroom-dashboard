import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type {
  Teacher, School, ClassLevel, Subject, Assignment, AssignmentSubmission,
  CbtExam, CbtAttempt, TimetableSlot, ResultDraft, Student,
} from "./types";

export type AssignmentWithSubs = Assignment & {
  subject?: Subject | null;
  class?: ClassLevel | null;
  submissions: AssignmentSubmission[];
};

export type CbtExamWithQuestions = CbtExam & {
  subject?: Subject | null;
  class?: ClassLevel | null;
  questionCount: number;
  attempts: CbtAttempt[];
};

export type TeacherData = {
  loading: boolean;
  teacher: Teacher | null;
  school: School | null;
  classes: ClassLevel[];
  subjects: Subject[];
  assignments: AssignmentWithSubs[];
  cbtExams: CbtExamWithQuestions[];
  timetable: (TimetableSlot & { subject?: Subject | null; class?: ClassLevel | null })[];
  resultDrafts: (ResultDraft & { class?: ClassLevel | null; subject?: Subject | null })[];
  students: Student[];
  reload: () => Promise<void>;
};

export function useTeacherData(): TeacherData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithSubs[]>([]);
  const [cbtExams, setCbtExams] = useState<CbtExamWithQuestions[]>([]);
  const [timetable, setTimetable] = useState<(TimetableSlot & { subject?: Subject | null; class?: ClassLevel | null })[]>([]);
  const [resultDrafts, setResultDrafts] = useState<(ResultDraft & { class?: ClassLevel | null; subject?: Subject | null })[]>([]);
  const [students, setStudents] = useState<Student[]>([]);

  const reload = useCallback(async () => {
    if (!user || (user.userType !== "teacher")) {
      setLoading(false);
      return;
    }
    const t = user.profile as Teacher | null;
    if (!t?.school_id) { setLoading(false); return; }
    setLoading(true);
    setTeacher(t);

    const schoolId = t.school_id;
    const { data: s } = await supabase.from("schools").select("*").eq("id", schoolId).maybeSingle();
    setSchool((s as School) ?? null);

    const [taRes, subsRes, assignRes, cbtRes, ttRes, rdRes] = await Promise.all([
      supabase.from("teacher_assignments").select("*").eq("teacher_id", user.id),
      supabase.from("subjects").select("*").eq("school_id", schoolId),
      supabase.from("assignments").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
      supabase.from("cbt_exams").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
      supabase.from("timetable_slots").select("*").eq("teacher_id", user.id).order("day_of_week").order("period"),
      supabase.from("result_drafts").select("*").eq("teacher_id", user.id).order("created_at", { ascending: false }),
    ]);

    const taList = (taRes.data as any[]) ?? [];
    const classIds = Array.from(new Set(taList.map((x) => x.class_id).filter(Boolean))) as string[];
    const subjectIds = Array.from(new Set(taList.map((x) => x.subject_id).filter(Boolean))) as string[];

    const [clsRes] = await Promise.all([
      classIds.length ? supabase.from("classes").select("*").in("id", classIds) : Promise.resolve({ data: [] }),
    ]);
    const classMap = new Map(((clsRes.data as ClassLevel[]) ?? []).map((c) => [c.id, c]));
    setClasses(((clsRes.data as ClassLevel[]) ?? []));
    setSubjects((subsRes.data as Subject[]) ?? []);

    const subjectMap = new Map(((subsRes.data as Subject[]) ?? []).map((s2) => [s2.id, s2]));

    // assignments + submissions
    const assignList = (assignRes.data as Assignment[]) ?? [];
    const assignIds = assignList.map((a) => a.id);
    const subRes = assignIds.length
      ? await supabase.from("assignment_submissions").select("*").in("assignment_id", assignIds)
      : { data: [] };
    const subsByAssign = new Map<string, AssignmentSubmission[]>();
    ((subRes.data as AssignmentSubmission[]) ?? []).forEach((sub) => {
      const arr = subsByAssign.get(sub.assignment_id) ?? [];
      arr.push(sub);
      subsByAssign.set(sub.assignment_id, arr);
    });
    setAssignments(assignList.map((a) => ({
      ...a,
      subject: a.subject_id ? subjectMap.get(a.subject_id) ?? null : null,
      class: a.class_id ? classMap.get(a.class_id) ?? null : null,
      submissions: subsByAssign.get(a.id) ?? [],
    })));

    // cbt exams + questions count + attempts
    const cbtList = (cbtRes.data as CbtExam[]) ?? [];
    const cbtIds = cbtList.map((c) => c.id);
    const [qRes, attRes] = await Promise.all([
      cbtIds.length ? supabase.from("cbt_questions").select("cbt_exam_id").in("cbt_exam_id", cbtIds) : Promise.resolve({ data: [] }),
      cbtIds.length ? supabase.from("cbt_attempts").select("*").in("cbt_exam_id", cbtIds) : Promise.resolve({ data: [] }),
    ]);
    const qCount = new Map<string, number>();
    ((qRes.data as any[]) ?? []).forEach((q) => {
      qCount.set(q.cbt_exam_id, (qCount.get(q.cbt_exam_id) ?? 0) + 1);
    });
    const attsByExam = new Map<string, CbtAttempt[]>();
    ((attRes.data as CbtAttempt[]) ?? []).forEach((att) => {
      const arr = attsByExam.get(att.cbt_exam_id) ?? [];
      arr.push(att);
      attsByExam.set(att.cbt_exam_id, arr);
    });
    setCbtExams(cbtList.map((c) => ({
      ...c,
      subject: c.subject_id ? subjectMap.get(c.subject_id) ?? null : null,
      class: c.class_id ? classMap.get(c.class_id) ?? null : null,
      questionCount: qCount.get(c.id) ?? 0,
      attempts: attsByExam.get(c.id) ?? [],
    })));

    // timetable with subject/class names
    setTimetable(((ttRes.data as TimetableSlot[]) ?? []).map((slot) => ({
      ...slot,
      subject: slot.subject_id ? subjectMap.get(slot.subject_id) ?? null : null,
      class: slot.class_id ? classMap.get(slot.class_id) ?? null : null,
    })));

    // result drafts
    setResultDrafts(((rdRes.data as ResultDraft[]) ?? []).map((rd) => ({
      ...rd,
      class: rd.class_id ? classMap.get(rd.class_id) ?? null : null,
      subject: rd.subject_id ? subjectMap.get(rd.subject_id) ?? null : null,
    })));

    // students in teacher's classes
    const studentsRes = classIds.length
      ? await supabase.from("students").select("*").in("school_id", [schoolId])
      : { data: [] };
    setStudents((studentsRes.data as Student[]) ?? []);

    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { loading, teacher, school, classes, subjects, assignments, cbtExams, timetable, resultDrafts, students, reload };
}
