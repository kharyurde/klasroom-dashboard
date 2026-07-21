import { useEffect, useState } from "react";
import { Link, useRouter } from "../lib/router";
import { useAuth } from "../lib/auth";
import { useParentData } from "../lib/useParentData";
import { Logo, Avatar, Badge, Spinner } from "./ui";
import { useToast } from "../lib/toast";
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  GraduationCap,
  MessageSquare,
  ClipboardList,
  Bell,
  LogOut,
  ChevronDown,
  Plus,
  Users,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";

export function ParentPortalShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const data = useParentData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const toast = useToast();

  if (data.loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-ink-50">
        <Spinner className="text-brand-600" size={32} />
      </div>
    );
  }

  const nav = [
    { to: "/portal", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/portal/applications", label: "Applications", icon: FileText },
    { to: "/portal/payments", label: "Payments", icon: CreditCard },
    { to: "/portal/results", label: "Results", icon: GraduationCap },
    { to: "/portal/attendance", label: "Attendance", icon: Users },
    { to: "/portal/complaints", label: "Complaints", icon: MessageSquare },
    { to: "/portal/requests", label: "Requests", icon: ClipboardList },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? route.path === to : route.path === to || route.path.startsWith(to + "/");

  const activeWard = data.activeWard;
  const unread = data.notifications.filter((n) => !n.read).length;

  const handleSignOut = async () => {
    await signOut();
    toast({ kind: "info", title: "Signed out" });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-ink-50">
      {/* Top bar */}
      <header className="sticky top-0 z-40 glass border-b border-ink-100">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-ink-600"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/portal"><Logo withText /></Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Ward switcher (Zoho-style) */}
            <div className="relative">
              <button
                onClick={() => setSwitcherOpen((v) => !v)}
                className="flex items-center gap-2 rounded-xl bg-white ring-1 ring-ink-200 px-2.5 py-2 hover:bg-ink-50 transition"
              >
                {activeWard ? (
                  <>
                    <Avatar name={`${activeWard.first_name} ${activeWard.last_name}`} src={activeWard.photo_url} size={28} />
                    <div className="hidden sm:block text-left leading-none">
                      <p className="text-xs font-semibold text-ink-900">{activeWard.first_name} {activeWard.last_name}</p>
                      <p className="text-[10px] text-ink-500">
                        {data.activeContext?.applications.length ?? 0} app · {data.activeContext?.enrollments.length ?? 0} enrolled
                      </p>
                    </div>
                  </>
                ) : (
                  <span className="text-xs font-medium text-ink-600">No ward selected</span>
                )}
                <ChevronDown className="h-4 w-4 text-ink-400" />
              </button>
              {switcherOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSwitcherOpen(false)} />
                  <div className="absolute right-0 mt-2 w-72 z-20 card p-2 animate-scale-in">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">Switch ward</p>
                    {data.contexts.length === 0 ? (
                      <p className="px-3 py-3 text-sm text-ink-500">No wards yet. Add your first child.</p>
                    ) : (
                      data.contexts.map((c) => (
                        <button
                          key={c.ward.id}
                          onClick={() => {
                            data.setActiveWardId(c.ward.id);
                            setSwitcherOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-ink-50 transition ${
                            c.ward.id === data.activeWardId ? "bg-brand-50" : ""
                          }`}
                        >
                          <Avatar name={`${c.ward.first_name} ${c.ward.last_name}`} src={c.ward.photo_url} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-ink-900 truncate">{c.ward.first_name} {c.ward.last_name}</p>
                            <p className="text-xs text-ink-500 truncate">
                              {c.enrollments.length > 0
                                ? c.enrollments.map((e) => e.school?.name).join(", ")
                                : c.applications.length > 0
                                ? `${c.applications.length} application${c.applications.length > 1 ? "s" : ""}`
                                : "No applications yet"}
                            </p>
                          </div>
                          {c.ward.id === data.activeWardId && <ChevronRight className="h-4 w-4 text-brand-600" />}
                        </button>
                      ))
                    )}
                    <div className="border-t border-ink-100 mt-1 pt-1">
                      <Link
                        to="/portal/wards/new"
                        onClick={() => setSwitcherOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
                      >
                        <Plus className="h-4 w-4" /> Add a new ward
                      </Link>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative grid h-10 w-10 place-items-center rounded-xl bg-white ring-1 ring-ink-200 hover:bg-ink-50 transition"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-ink-600" />
                {unread > 0 && (
                  <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-600 text-[10px] font-bold text-white px-1">
                    {unread}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 mt-2 w-80 z-20 card p-2 animate-scale-in max-h-96 overflow-y-auto scrollbar-thin">
                    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-ink-400">Notifications</p>
                    {data.notifications.length === 0 ? (
                      <p className="px-3 py-4 text-sm text-ink-500 text-center">No notifications yet.</p>
                    ) : (
                      data.notifications.map((n) => (
                        <div key={n.id} className={`rounded-lg px-3 py-2.5 ${n.read ? "" : "bg-brand-50"}`}>
                          <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                          <p className="text-xs text-ink-600 mt-0.5">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

            {/* User menu */}
            <div className="flex items-center gap-2">
              <Avatar name={user?.profile && "full_name" in user.profile ? user.profile.full_name : user?.email ?? "Parent"} size={32} />
              <button onClick={handleSignOut} className="text-ink-400 hover:text-rose-600 transition" aria-label="Sign out">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 shrink-0 bg-white border-r border-ink-100 transition-transform lg:translate-x-0 ${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <nav className="p-3 space-y-1">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive(n.to, n.exact)
                    ? "bg-brand-50 text-brand-800 ring-1 ring-brand-100"
                    : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"
                }`}
              >
                <n.icon className="h-4.5 w-4.5" />
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="p-3 mt-auto">
            <Link to="/portal/wards/new" className="btn-primary w-full justify-center text-xs">
              <Plus className="h-4 w-4" /> Add new ward
            </Link>
          </div>
        </aside>

        {menuOpen && (
          <div className="fixed inset-0 top-16 z-20 bg-ink-950/30 lg:hidden" onClick={() => setMenuOpen(false)} />
        )}

        {/* Main */}
        <main className="flex-1 min-w-0">
          <div className="container-page py-6 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
