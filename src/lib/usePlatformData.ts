import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import type { School, Payment, SchoolAdmin, Enrollment, Teacher, Student, Application, ClassLevel } from "./types";

export type PlatformData = {
  loading: boolean;
  schools: (School & { admin?: SchoolAdmin | null; enrollmentCount: number; teacherCount: number; studentCount: number })[];
  payments: Payment[];
  allEnrollments: Enrollment[];
  allTeachers: Teacher[];
  allStudents: Student[];
  allApplications: Application[];
  reload: () => Promise<void>;
};

export function usePlatformData(): PlatformData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [schools, setSchools] = useState<(School & { admin?: SchoolAdmin | null; enrollmentCount: number; teacherCount: number; studentCount: number })[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [allEnrollments, setAllEnrollments] = useState<Enrollment[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);

  const reload = useCallback(async () => {
    if (!user || user.userType !== "platform_admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [schoolsRes, payRes, enRes, tRes, sRes, appRes] = await Promise.all([
      supabase.from("schools").select("*").order("created_at", { ascending: false }),
      supabase.from("payments").select("*").order("created_at", { ascending: false }),
      supabase.from("enrollments").select("*"),
      supabase.from("teachers").select("*"),
      supabase.from("students").select("*"),
      supabase.from("applications").select("*"),
    ]);

    const schoolsList = (schoolsRes.data as School[]) ?? [];
    const adminIds = schoolsList.map((s) => s.id);
    const { data: admins } = adminIds.length
      ? await supabase.from("school_admins").select("*").in("school_id", adminIds)
      : { data: [] };
    const adminMap = new Map(((admins as SchoolAdmin[]) ?? []).map((a) => [a.school_id, a]));

    const enrolls = (enRes.data as Enrollment[]) ?? [];
    const teachers = (tRes.data as Teacher[]) ?? [];
    const students = (sRes.data as Student[]) ?? [];

    setSchools(schoolsList.map((s) => ({
      ...s,
      admin: adminMap.get(s.id) ?? null,
      enrollmentCount: enrolls.filter((e) => e.school_id === s.id).length,
      teacherCount: teachers.filter((t) => t.school_id === s.id).length,
      studentCount: students.filter((st) => st.school_id === s.id).length,
    })));
    setPayments((payRes.data as Payment[]) ?? []);
    setAllEnrollments(enrolls);
    setAllTeachers(teachers);
    setAllStudents(students);
    setAllApplications((appRes.data as Application[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { loading, schools, payments, allEnrollments, allTeachers, allStudents, allApplications, reload };
}
