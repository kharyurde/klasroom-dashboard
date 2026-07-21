import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type {
  Student, School, ClassLevel, Assignment, AssignmentSubmission, Subject,
  CbtExam, CbtAttempt, CbtQuestion, TimetableSlot, CalendarEvent, Club, ClubMember,
  ResultRow, AttendanceRow,
} from "./types";

export type StudentAssignment = Assignment & {
  subject?: Subject | null;
  class?: ClassLevel | null;
  mySubmission?: AssignmentSubmission | null;
};

export type StudentCbtExam = CbtExam & {
  subject?: Subject | null;
  class?: ClassLevel | null;
  questions: CbtQuestion[];
  myAttempt?: CbtAttempt | null;
};

export type StudentData = {
  loading: boolean;
  student: Student | null;
  school: School | null;
  classLevel: ClassLevel | null;
  subjects: Subject[];
  assignments: StudentAssignment[];
  cbtExams: StudentCbtExam[];
  timetable: (TimetableSlot & { subject?: Subject | null })[];
  calendarEvents: CalendarEvent[];
  clubs: (Club & { memberCount: number; isMember: boolean })[];
  myClubs: Club[];
  results: ResultRow[];
  attendance: AttendanceRow[];
  reload: () => Promise<void>;
};

export function useStudentData(): StudentData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<Student | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [classLevel, setClassLevel] = useState<ClassLevel | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<StudentAssignment[]>([]);
  const [cbtExams, setCbtExams] = useState<StudentCbtExam[]>([]);
  const [timetable, setTimetable] = useState<(TimetableSlot & { subject?: Subject | null })[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [clubs, setClubs] = useState<(Club & { memberCount: number; isMember: boolean })[]>([]);
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);

  const reload = useCallback(async () => {
    if (!user || user.userType !== "student") {
      setLoading(false);
      return;
    }
    const st = user.profile as Student | null;
    if (!st?.school_id) { setLoading(false); return; }
    setLoading(true);
    setStudent(st);

    const schoolId = st.school_id;
    const { data: s } = await supabase.from("schools").select("*").eq("id", schoolId).maybeSingle();
    setSchool((s as School) ?? null);

    // active class enrollment
    const { data: sce } = await supabase
      .from("student_class_enrollments")
      .select("*")
      .eq("student_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const classId = (sce as any)?.class_id ?? null;

    let cls: ClassLevel | null = null;
    if (classId) {
      const { data: c } = await supabase.from("classes").select("*").eq("id", classId).maybeSingle();
      cls = (c as ClassLevel) ?? null;
    }
    setClassLevel(cls);

    const [subsRes, calRes, clubsRes, cmRes] = await Promise.all([
      supabase.from("subjects").select("*").eq("school_id", schoolId),
      supabase.from("calendar_events").select("*").eq("school_id", schoolId).order("start_date"),
      supabase.from("clubs").select("*").eq("school_id", schoolId),
      supabase.from("club_members").select("*, club:clubs(*)").eq("student_id", user.id),
    ]);
    const subsList = (subsRes.data as Subject[]) ?? [];
    setSubjects(subsList);
    const subjectMap = new Map(subsList.map((x) => [x.id, x]));
    setCalendarEvents((calRes.data as CalendarEvent[]) ?? []);

    const clubsList = (clubsRes.data as Club[]) ?? [];
    const cmList = (cmRes.data as any[]) ?? [];
    const myClubIds = new Set(cmList.map((m) => m.club_id));
    setMyClubs((cmList.map((m) => m.club as Club).filter(Boolean)) as Club[]);

    // member counts per club
    const { data: allCm } = await supabase.from("club_members").select("club_id").in("club_id", clubsList.map((c) => c.id));
    const countMap = new Map<string, number>();
    ((allCm as any[]) ?? []).forEach((m) => countMap.set(m.club_id, (countMap.get(m.club_id) ?? 0) + 1));
    setClubs(clubsList.map((c) => ({ ...c, memberCount: countMap.get(c.id) ?? 0, isMember: myClubIds.has(c.id) })));

    if (!classId) {
      setAssignments([]); setCbtExams([]); setTimetable([]); setResults([]); setAttendance([]);
      setLoading(false);
      return;
    }

    const [assignRes, cbtRes, ttRes, resRes, attRes] = await Promise.all([
      supabase.from("assignments").select("*").eq("class_id", classId).order("created_at", { ascending: false }),
      supabase.from("cbt_exams").select("*").eq("class_id", classId).eq("approval_status", "approved").order("created_at", { ascending: false }),
      supabase.from("timetable_slots").select("*").eq("class_id", classId).order("day_of_week").order("period"),
      supabase.from("results").select("*").eq("ward_id", (st as any).ward_id ?? null).order("created_at", { ascending: false }),
      supabase.from("attendance").select("*").eq("ward_id", (st as any).ward_id ?? null).order("date", { ascending: false }),
    ]);

    const assignList = (assignRes.data as Assignment[]) ?? [];
    const assignIds = assignList.map((a) => a.id);
    const mySubsRes = assignIds.length
      ? await supabase.from("assignment_submissions").select("*").eq("student_id", user.id).in("assignment_id", assignIds)
      : { data: [] };
    const mySubsMap = new Map<string, AssignmentSubmission>();
    ((mySubsRes.data as AssignmentSubmission[]) ?? []).forEach((sub) => mySubsMap.set(sub.assignment_id, sub));
    setAssignments(assignList.map((a) => ({
      ...a,
      subject: a.subject_id ? subjectMap.get(a.subject_id) ?? null : null,
      class: cls,
      mySubmission: mySubsMap.get(a.id) ?? null,
    })));

    const cbtList = (cbtRes.data as CbtExam[]) ?? [];
    const cbtIds = cbtList.map((c) => c.id);
    const [qRes, myAttRes] = await Promise.all([
      cbtIds.length ? supabase.from("cbt_questions").select("*").in("cbt_exam_id", cbtIds).order("ord") : Promise.resolve({ data: [] }),
      cbtIds.length ? supabase.from("cbt_attempts").select("*").eq("student_id", user.id).in("cbt_exam_id", cbtIds) : Promise.resolve({ data: [] }),
    ]);
    const qByExam = new Map<string, CbtQuestion[]>();
    ((qRes.data as CbtQuestion[]) ?? []).forEach((q) => {
      const arr = qByExam.get(q.cbt_exam_id) ?? [];
      arr.push(q);
      qByExam.set(q.cbt_exam_id, arr);
    });
    const attMap = new Map<string, CbtAttempt>();
    ((myAttRes.data as CbtAttempt[]) ?? []).forEach((a) => attMap.set(a.cbt_exam_id, a));
    setCbtExams(cbtList.map((c) => ({
      ...c,
      subject: c.subject_id ? subjectMap.get(c.subject_id) ?? null : null,
      class: cls,
      questions: qByExam.get(c.id) ?? [],
      myAttempt: attMap.get(c.id) ?? null,
    })));

    setTimetable(((ttRes.data as TimetableSlot[]) ?? []).map((slot) => ({
      ...slot,
      subject: slot.subject_id ? subjectMap.get(slot.subject_id) ?? null : null,
    })));
    setResults((resRes.data as ResultRow[]) ?? []);
    setAttendance((attRes.data as AttendanceRow[]) ?? []);

    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return {
    loading, student, school, classLevel, subjects, assignments, cbtExams,
    timetable, calendarEvents, clubs, myClubs, results, attendance, reload,
  };
}
