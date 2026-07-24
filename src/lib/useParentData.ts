import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./auth";
import { useRouter } from "./router";
import { apiGet } from "./apiClient";
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

type ApiEnvelope<T> = {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  errors: unknown;
  timestamp: string;
};

let cache: { schools: School[] } | null = null;

type ParentApplication = Application & {
  school?: School;
};

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

    const response = await apiGet<ApiEnvelope<School[]>>("/api/schools");
    const schools = response.data;

    cache = {
      schools,
    };

    return schools;
  }, []);

  const reload = useCallback(async () => {
    if (!user || user.userType !== "parent") {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const [wardsRes, schools, applicationsRes, enrollmentsRes, notificationsRes] =
        await Promise.all([
          apiGet<ApiEnvelope<Ward[]>>("/api/parent/wards"),
          loadSchools(),
          apiGet<ApiEnvelope<ParentApplication[]>>("/api/parent/applications"),
          apiGet<
            ApiEnvelope<
              (Enrollment & {
                class?: { id: string; name: string } | null;
                school?: School;
              })[]
            >
          >("/api/parent/enrollments"),
          apiGet<ApiEnvelope<NotificationRow[]>>("/api/parent/notifications"),
        ]);

      const wards = wardsRes.data;
      const applications = applicationsRes.data;
      const enrollments = enrollmentsRes.data;
      const notifications = notificationsRes.data;

      setWards(wards);
      setAllSchools(schools);
      setNotifications(notifications);

      if (wards.length === 0) {
        setContexts([]);
        return;
      }

      const schoolMap = new Map(
        schools.map((school) => [school.id, school])
      );

      const ctxs: WardContext[] = wards.map((ward) => ({
        ward,
        applications: applications
          .filter((a) => a.ward_id === ward.id)
          .map((a) => ({
            ...a,
            school: a.school ?? schoolMap.get(a.school_id),
          })),
        enrollments: enrollments
          .filter((e) => e.ward_id === ward.id)
          .map((e) => ({
            ...e,
            school: e.school ?? schoolMap.get(e.school_id),
          })),
      }));

      setContexts(ctxs);
    } catch (err) {
      console.error(err);

      setWards([]);
      setContexts([]);
      setAllSchools([]);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
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