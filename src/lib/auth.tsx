import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import type { ParentProfile, SchoolAdmin, Teacher, Student, PlatformAdmin } from "./types";

export type AuthUser = {
  id: string;
  email: string;
  userType: "parent" | "school_admin" | "teacher" | "student" | "platform_admin";
  emailConfirmed: boolean;
  profile: ParentProfile | SchoolAdmin | Teacher | Student | PlatformAdmin | null;
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: AuthUser | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ParentProfile | SchoolAdmin | Teacher | Student | PlatformAdmin | null>(null);

  const loadProfile = async (sid: string): Promise<ParentProfile | SchoolAdmin | Teacher | Student | PlatformAdmin | null> => {
    const { data: parent } = await supabase
      .from("parent_profiles")
      .select("*")
      .eq("id", sid)
      .maybeSingle();
    if (parent) return parent as ParentProfile;
    const { data: admin } = await supabase
      .from("school_admins")
      .select("*")
      .eq("id", sid)
      .maybeSingle();
    if (admin) return admin as SchoolAdmin;
    const { data: teacher } = await supabase
      .from("teachers")
      .select("*")
      .eq("id", sid)
      .maybeSingle();
    if (teacher) return teacher as Teacher;
    const { data: student } = await supabase
      .from("students")
      .select("*")
      .eq("id", sid)
      .maybeSingle();
    if (student) return student as Student;
    const { data: platform } = await supabase
      .from("platform_admins")
      .select("*")
      .eq("id", sid)
      .maybeSingle();
    return (platform as PlatformAdmin) ?? null;
  };

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session) {
        const p = await loadProfile(data.session.user.id);
        if (mounted) setProfile(p);
      }
      if (mounted) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      (async () => {
        setSession(sess);
        if (sess) {
          const p = await loadProfile(sess.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      })();
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const user: AuthUser | null = useMemo(() => {
    if (!session) return null;
    const meta = (session.user.user_metadata ?? {}) as Record<string, string>;
    const userType = (meta.user_type as "parent" | "school_admin" | "teacher" | "student" | "platform_admin") || "parent";
    return {
      id: session.user.id,
      email: session.user.email ?? "",
      userType,
      emailConfirmed: Boolean(session.user.email_confirmed_at),
      profile,
    };
  }, [session, profile]);

  const refresh = async () => {
    if (session) {
      const p = await loadProfile(session.user.id);
      setProfile(p);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ loading, session, user, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
