import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { useAuth } from "./auth";
import { useRouter } from "./router";
import type { Ward, Application, Enrollment, School, Payment, NotificationRow } from "./types";

export type WardContext = {
  ward: Ward;
  applications: (Application & { school?: School })[];
  enrollments: (Enrollment & { school?: School; class?: { id: string; name: string } | null })[];
};

export type ParentData = {
  loading: boolean;
  wards: Ward[];
  contexts: WardContext[];
  allSchools: School[];
  notifications: NotificationRow[];
  reload: () => Promise<void>;
  activeWardId: string | null;
  setActiveWardId: (id: string | null) => void;
  activeWard: Ward | null;
  activeContext: WardContext | null;
};

let cache: { schools: School[] } | null = null;

export function useParentData(): ParentData {
  const { user } = useAuth();
  const { route, navigate } = useRouter();
  const [loading, setLoading] = useState(true);
  const [wards, setWards] = useState<Ward[]>([]);
  const [contexts, setContexts] = useState<WardContext[]>([]);
  const [allSchools, setAllSchools] = useState<School[]>([]);
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [activeWardId, setActiveWardIdState] = useState<string | null>(null);

  const loadSchools = useCallback(async (): Promise<School[]> => {
    if (cache?.schools?.length) return cache.schools;
    const { data } = await supabase.from("schools").select("*").order("name");
    cache = { schools: (data as School[]) ?? [] };
    return cache.schools;
  }, []);

  const reload = useCallback(async () => {
    if (!user || user.userType !== "parent") {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [wardsRes, schools] = await Promise.all([
      supabase.from("wards").select("*").eq("parent_id", user.id).order("created_at"),
      loadSchools(),
    ]);
    const wardsList = (wardsRes.data as Ward[]) ?? [];
    setWards(wardsList);
    setAllSchools(schools);

    if (wardsList.length === 0) {
      setContexts([]);
      setLoading(false);
      return;
    }

    const wardIds = wardsList.map((w) => w.id);
    const [appsRes, enrollRes] = await Promise.all([
      supabase
        .from("applications")
        .select("*")
        .in("ward_id", wardIds)
        .order("created_at", { ascending: false }),
      supabase
        .from("enrollments")
        .select("*, class:classes(id,name)")
        .in("ward_id", wardIds)
        .order("enrolled_at", { ascending: false }),
    ]);

    const schoolMap = new Map(schools.map((s) => [s.id, s]));
    const apps = (appsRes.data as Application[]) ?? [];
    const enrolls = (enrollRes.data as (Enrollment & { class?: { id: string; name: string } | null })[]) ?? [];

    const ctxs: WardContext[] = wardsList.map((ward) => ({
      ward,
      applications: apps
        .filter((a) => a.ward_id === ward.id)
        .map((a) => ({ ...a, school: schoolMap.get(a.school_id) })),
      enrollments: enrolls
        .filter((e) => e.ward_id === ward.id)
        .map((e) => ({ ...e, school: schoolMap.get(e.school_id) })),
    }));
    setContexts(ctxs);

    // notifications
    const { data: notifs } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setNotifications((notifs as NotificationRow[]) ?? []);

    setLoading(false);
  }, [user, loadSchools]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Resolve active ward from URL ?ward= or fallback to first.
  useEffect(() => {
    if (contexts.length === 0) {
      setActiveWardIdState(null);
      return;
    }
    const fromQuery = route.query.get("ward");
    if (fromQuery && contexts.some((c) => c.ward.id === fromQuery)) {
      setActiveWardIdState(fromQuery);
      return;
    }
    if (!activeWardId || !contexts.some((c) => c.ward.id === activeWardId)) {
      setActiveWardIdState(contexts[0].ward.id);
    }
  }, [contexts, activeWardId, route.query]);

  const setActiveWardId = useCallback(
    (id: string | null) => {
      setActiveWardIdState(id);
      if (id) {
        const q = new URLSearchParams(route.query.toString());
        q.set("ward", id);
        navigate(`${route.path}?${q.toString()}`);
      }
    },
    [route.query, route.path, navigate]
  );

  const activeWard = wards.find((w) => w.id === activeWardId) ?? null;
  const activeContext = contexts.find((c) => c.ward.id === activeWardId) ?? null;

  return {
    loading,
    wards,
    contexts,
    allSchools,
    notifications,
    reload,
    activeWardId,
    setActiveWardId,
    activeWard,
    activeContext,
  };
}
