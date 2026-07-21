import { useState } from "react";
import { Link, useRouter } from "../lib/router";
import { useAuth } from "../lib/auth";
import { Logo, Avatar, Spinner } from "./ui";
import { useToast } from "../lib/toast";
import {
  LayoutDashboard, Building2, CreditCard, GraduationCap, Settings,
  LogOut, Menu, X, Shield,
} from "lucide-react";
import type { ReactNode } from "react";

export function PlatformPortalShell({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const toast = useToast();

  const nav = [
    { to: "/platform", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/platform/schools", label: "Schools", icon: Building2 },
    { to: "/platform/payments", label: "Payments", icon: CreditCard },
    { to: "/platform/students", label: "Students", icon: GraduationCap },
    { to: "/platform/settings", label: "Settings", icon: Settings },
  ];

  const isActive = (to: string, exact?: boolean) =>
    exact ? route.path === to : route.path === to || route.path.startsWith(to + "/");

  const handleSignOut = async () => {
    await signOut();
    toast({ kind: "info", title: "Signed out" });
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-40 glass border-b border-ink-100">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-ink-600" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link to="/platform"><Logo withText /></Link>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-semibold text-white">
              <Shield className="h-3 w-3" /> Platform
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Avatar name={(user?.profile as any)?.full_name ?? user?.email ?? "Admin"} size={32} />
            <button onClick={handleSignOut} className="text-ink-400 hover:text-rose-600 transition" aria-label="Sign out">
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`fixed lg:sticky top-16 z-30 h-[calc(100vh-4rem)] w-64 shrink-0 bg-white border-r border-ink-100 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <nav className="p-3 space-y-1">
            {nav.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive(n.to, n.exact) ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900"}`}>
                <n.icon className="h-4.5 w-4.5" />
                <span>{n.label}</span>
              </Link>
            ))}
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
