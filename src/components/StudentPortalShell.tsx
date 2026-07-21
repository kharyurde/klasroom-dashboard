import { useState } from "react";
import { Link, useRouter } from "../lib/router";
import { useAuth } from "../lib/auth";
import { useStudentData } from "../lib/useStudentData";
import { Logo, Avatar, Spinner, Badge } from "./ui";
import { useToast } from "../lib/toast";
import {
  LayoutDashboard, ClipboardList, MonitorSmartphone, FileBarChart,
  CalendarDays, Sparkles, User as UserIcon, LogOut, Menu, X, Building2,
} from "lucide-react";
import type { ReactNode } from "react";

export function StudentPortalShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const data = useStudentData();
  const [menuOpen, setMenuOpen] = useState(false);
  const toast = useToast();

  if (data.loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-50">
        <Spinner className="text-brand-600" size={32} />
      </div>
    );
  }

  const nav = [
    { to: "/student", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/student/assignments", label: "Assignments", icon: ClipboardList },
    { to: "/student/exams", label: "CBT Exams", icon: MonitorSmartphone },
    { to: "/student/results", label: "Results", icon: FileBarChart },
    { to: "/student/calendar", label: "Calendar", icon: CalendarDays },
    { to: "/student/clubs", label: "Clubs", icon: Sparkles },
    { to: "/student/profile", label: "Profile", icon: UserIcon },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? route.path === to : route.path === to || route.path.startsWith(to + "/");

  const pendingAssign = data.assignments.filter((a) => !a.mySubmission && a.status === "published").length;
  const pendingExams = data.cbtExams.filter((c) => c.status === "active" && (!c.myAttempt || c.myAttempt.status === "in_progress")).length;

  const countFor = (to: string) => {
    if (to === "/student/assignments") return pendingAssign;
    if (to === "/student/exams") return pendingExams;
    return 0;
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ kind: "info", title: "Signed out" });
    navigate("/");
  };

  const student = user?.profile as any;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-40 glass border-b border-ink-100">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-ink-600" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/student"><Logo withText /></Link>
            {data.school && (
              <Badge tone="brand" className="hidden sm:inline-flex ml-2">
                <Building2 className="h-3 w-3" /> {data.school.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data.classLevel && <Badge tone="ocean" className="hidden sm:inline-flex">{data.classLevel.name}</Badge>}
            <Avatar name={student?.full_name ?? user?.email ?? "Student"} src={student?.photo_url} size={32} />
            <button onClick={handleSignOut} className="text-ink-400 hover:text-rose-600 transition" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 shrink-0 bg-white border-r border-ink-100 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <nav className="p-3 space-y-1">
            {nav.map((n) => {
              const count = countFor(n.to);
              return (
                <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive(n.to, n.exact) ? "bg-brand-50 text-brand-800 ring-1 ring-brand-100" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"}`}>
                  <n.icon className="h-4.5 w-4.5" />
                  <span className="flex-1">{n.label}</span>
                  {count > 0 && (
                    <span className="grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 text-[10px] font-bold text-white px-1">{count}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        {menuOpen && <div className="fixed inset-0 top-16 z-20 bg-ink-950/30 lg:hidden" onClick={() => setMenuOpen(false)} />}

        <main className="flex-1 min-w-0">
          <div className="container-page py-6 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
