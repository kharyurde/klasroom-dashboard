import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { hasRefreshToken, refreshSession, clearTokens } from "./apiClient";
import * as authApi from "./authApi";
import type { ApiAuthUser } from "./authApi";

export type AuthUser = ApiAuthUser & {
  emailConfirmed: boolean; // kept for compatibility with existing call sites; always true once past login
  forcePasswordChange: boolean;
  /**
   * TODO(migration): compatibility shim for hooks not yet ported off the old
   * Supabase-direct profile shape (useAdminData, useStudentData, useTeacherData,
   * portal shell headers). Only carries what /api/auth/me actually returns —
   * full_name/school_id/phone — NOT the full SchoolAdmin/Teacher/Student row
   * (admission number, class, etc.). Those hooks need real Express API endpoints
   * (students, teachers, staff) before they can return complete data again.
   */
  profile: { full_name: string; school_id: string | null; phone: string | null };
};

type AuthContextValue = {
  loading: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);

  const loadMe = async (forcePasswordChange = false): Promise<AuthUser> => {
    const { user: me } = await authApi.fetchMe();
    const authUser: AuthUser = {
      ...me,
      emailConfirmed: true,
      forcePasswordChange,
      profile: { full_name: me.fullName, school_id: me.schoolId, phone: me.phone },
    };
    setUser(authUser);
    return authUser;
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (hasRefreshToken()) {
        const restored = await refreshSession();
        if (restored) {
          try {
            await loadMe();
          } catch {
            clearTokens();
            if (mounted) setUser(null);
          }
        } else {
          clearTokens();
        }
      }
      if (mounted) setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const data = await authApi.login(email, password);
    return loadMe(data.forcePasswordChange);
  };

  const signOut = async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  };

  const refresh = async () => {
    if (!hasRefreshToken()) return;
    await loadMe(user?.forcePasswordChange ?? false);
  };

  return (
    <AuthContext.Provider value={{ loading, user, login, signOut, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
