import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useRouter } from "./router";
import type { School, Application, Payment, ClassLevel, AcademicSession, Enrollment, Complaint, RequestRow } from "./types";

export type AdminData = {
  loading: boolean;
  school: School | null;
  classes: ClassLevel[];
  sessions: AcademicSession[];
  applications: (Application & { ward?: any; parent?: any })[];
  enrollments: (Enrollment & { ward?: any })[];
  payments: Payment[];
  complaints: Complaint[];
  requests: RequestRow[];
  reload: () => Promise<void>;
};

export function useAdminData(): AdminData {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [applications, setApplications] = useState<(Application & { ward?: any; parent?: any })[]>([]);
  const [enrollments, setEnrollments] = useState<(Enrollment & { ward?: any })[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [requests, setRequests] = useState<RequestRow[]>([]);

  const reload = useCallback(async () => {
    if (!user || user.userType !== "school_admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const admin = user.profile as any;
    const schoolId = admin?.school_id;
    if (!schoolId) { setLoading(false); return; }

    const { data: s } = await supabase.from("schools").select("*").eq("id", schoolId).maybeSingle();
    setSchool((s as School) ?? null);

    const [cls, sess, apps, en, pay, comp, req] = await Promise.all([
      supabase.from("classes").select("*").eq("school_id", schoolId).order("level"),
      supabase.from("academic_sessions").select("*").eq("school_id", schoolId).order("is_current", { ascending: false }),
      supabase.from("applications").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      supabase.from("enrollments").select("*").eq("school_id", schoolId).order("enrolled_at", { ascending: false }),
      supabase.from("payments").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      supabase.from("complaints").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
      supabase.from("requests").select("*").eq("school_id", schoolId).order("created_at", { ascending: false }),
    ]);

    setClasses((cls.data as ClassLevel[]) ?? []);
    setSessions((sess.data as AcademicSession[]) ?? []);

    const appsList = (apps.data as Application[]) ?? [];
    // Fetch related wards and parents
    const wardIds = Array.from(new Set(appsList.map((a) => a.ward_id)));
    const parentIds = Array.from(new Set(appsList.map((a) => a.parent_id)));
    const [wardsRes, parentsRes] = await Promise.all([
      wardIds.length ? supabase.from("wards").select("*").in("id", wardIds) : Promise.resolve({ data: [] }),
      parentIds.length ? supabase.from("parent_profiles").select("*").in("id", parentIds) : Promise.resolve({ data: [] }),
    ]);
    const wardMap = new Map(((wardsRes.data as any[]) ?? []).map((w) => [w.id, w]));
    const parentMap = new Map(((parentsRes.data as any[]) ?? []).map((p) => [p.id, p]));
    setApplications(appsList.map((a) => ({ ...a, ward: wardMap.get(a.ward_id), parent: parentMap.get(a.parent_id) })));

    const enrollsList = (en.data as Enrollment[]) ?? [];
    const enWardIds = Array.from(new Set(enrollsList.map((e) => e.ward_id)));
    const enWards = enWardIds.length ? await supabase.from("wards").select("*").in("id", enWardIds) : { data: [] };
    const enWardMap = new Map(((enWards.data as any[]) ?? []).map((w) => [w.id, w]));
    setEnrollments(enrollsList.map((e) => ({ ...e, ward: enWardMap.get(e.ward_id) })));

    setPayments((pay.data as Payment[]) ?? []);
    setComplaints((comp.data as Complaint[]) ?? []);
    setRequests((req.data as RequestRow[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  return { loading, school, classes, sessions, applications, enrollments, payments, complaints, requests, reload };
}