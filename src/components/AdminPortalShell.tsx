import { useEffect, useState } from "react";
import { Link, useRouter } from "../lib/router";
import { useAuth } from "../lib/auth";
import { useAdminData } from "../lib/useAdminData";
import { Logo, Avatar, Spinner, Badge } from "./ui";
import { useToast } from "../lib/toast";
import {
  LayoutDashboard, FileText, Users, CreditCard, Settings, LogOut,
  Menu, X, Building2, MessageSquare, ClipboardList, GraduationCap, UserCog, BookOpen,
} from "lucide-react";
import type { ReactNode } from "react";

export function AdminPortalShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const data = useAdminData();
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
    { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/admin/applications", label: "Applications", icon: FileText },
    { to: "/admin/students", label: "Students", icon: GraduationCap },
    { to: "/admin/teachers", label: "Teachers", icon: UserCog },
    { to: "/admin/classes", label: "Classes & Fees", icon: Building2 },
    { to: "/admin/academic", label: "Academic", icon: BookOpen },
    { to: "/admin/payments", label: "Payments", icon: CreditCard },
    { to: "/admin/complaints", label: "Complaints", icon: MessageSquare },
    { to: "/admin/requests", label: "Requests", icon: ClipboardList },
    { to: "/admin/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? route.path === to : route.path === to || route.path.startsWith(to + "/");

  const pendingApps = data.applications.filter((a) => ["submitted", "under_review"].includes(a.status)).length;
  const pendingComplaints = data.complaints.filter((c) => c.status === "open").length;
  const pendingRequests = data.requests.filter((r) => r.status === "pending").length;

  const countFor = (to: string) => {
    if (to === "/admin/applications") return pendingApps;
    if (to === "/admin/complaints") return pendingComplaints;
    if (to === "/admin/requests") return pendingRequests;
    return 0;
  };

  const handleSignOut = async () => {
    await signOut();
    toast({ kind: "info", title: "Signed out" });
    navigate("/");
  };

  const admin = user?.profile as any;

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-40 glass border-b border-ink-100">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-ink-600" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/admin"><Logo withText /></Link>
            {data.school && (
              <Badge tone="brand" className="hidden sm:inline-flex ml-2">
                <Building2 className="h-3 w-3" /> {data.school.name}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {data.school?.subscription_status === "trial" && (
              <Badge tone="gold" className="hidden sm:inline-flex">Trial</Badge>
            )}
            <Avatar name={admin?.full_name ?? user?.email ?? "Admin"} size={32} />
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
