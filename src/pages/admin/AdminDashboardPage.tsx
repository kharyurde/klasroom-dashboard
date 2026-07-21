import { Link } from "../../lib/router";
import { useAdminData } from "../../lib/useAdminData";
import { Badge, EmptyState } from "../../components/ui";
import { STAGE_META } from "../../lib/status";
import { formatMoney, formatDate, relativeTime } from "../../lib/format";
import {
  FileText, CreditCard, GraduationCap, Users, MessageSquare, ArrowRight,
  TrendingUp, Clock, Building2,
} from "lucide-react";

export function AdminDashboardPage() {
  const data = useAdminData();
  if (data.loading) return null;

  const pending = data.applications.filter((a) => ["submitted", "under_review"].includes(a.status));
  const enrolled = data.enrollments.filter((e) => e.status === "active");
  const totalRevenue = data.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const recentApps = data.applications.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Dashboard</h1>
        <p className="text-sm text-ink-500 mt-0.5">{data.school?.name} · {data.school?.city}, {data.school?.state}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<FileText />} tone="ocean" label="Pending applications" value={pending.length} sub="awaiting review" link="/admin/applications" />
        <Stat icon={<GraduationCap />} tone="brand" label="Enrolled students" value={enrolled.length} sub="active this session" link="/admin/students" />
        <Stat icon={<CreditCard />} tone="gold" label="Total revenue" value={formatMoney(totalRevenue, data.school?.currency ?? "NGN")} sub={`${data.payments.filter(p => p.status === "paid").length} payments`} link="/admin/payments" />
        <Stat icon={<Users />} tone="rose" label="Open items" value={data.complaints.filter(c => c.status === "open").length + data.requests.filter(r => r.status === "pending").length} sub="complaints + requests" link="/admin/complaints" />
      </div>

      {pending.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-gold-600" />
              <h2 className="text-base font-semibold text-ink-900">Awaiting your review</h2>
            </div>
            <Link to="/admin/applications" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-ink-100">
            {pending.slice(0, 4).map((a) => (
              <Link key={a.id} to={`/admin/applications/${a.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50 transition">
                <div className="h-10 w-10 rounded-full bg-brand-100 text-brand-700 grid place-items-center text-sm font-semibold shrink-0">
                  {a.ward?.first_name?.[0]}{a.ward?.last_name?.[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{a.ward?.first_name} {a.ward?.last_name}</p>
                  <p className="text-xs text-ink-500">{a.applying_for_class_name} · {a.parent?.email}</p>
                </div>
                <Badge tone="gold">{STAGE_META[a.status].short}</Badge>
                <ArrowRight className="h-4 w-4 text-ink-300" />
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">Recent applications</h2>
          </div>
          {recentApps.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">No applications yet.</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {recentApps.map((a) => (
                <Link key={a.id} to={`/admin/applications/${a.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink-900 truncate">{a.ward?.first_name} {a.ward?.last_name}</p>
                    <p className="text-xs text-ink-500">{a.applying_for_class_name} · {relativeTime(a.created_at)}</p>
                  </div>
                  <Badge tone={STAGE_META[a.status].tone}>{STAGE_META[a.status].short}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">Quick actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            <QuickAction to="/admin/applications" icon={<FileText className="h-5 w-5" />} label="Review applications" count={pending.length} />
            <QuickAction to="/admin/classes" icon={<Building2 className="h-5 w-5" />} label="Classes & fees" count={data.classes.length} />
            <QuickAction to="/admin/students" icon={<GraduationCap className="h-5 w-5" />} label="Students" count={enrolled.length} />
            <QuickAction to="/admin/settings" icon={<TrendingUp className="h-5 w-5" />} label="School settings" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, tone, label, value, sub, link }: { icon: React.ReactNode; tone: "ocean" | "brand" | "gold" | "rose"; label: string; value: string | number; sub: string; link: string }) {
  const tones = { ocean: "bg-ocean-100 text-ocean-700", brand: "bg-brand-100 text-brand-700", gold: "bg-gold-100 text-gold-700", rose: "bg-rose-100 text-rose-700" };
  return (
    <Link to={link} className="card card-hover p-5 block">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-xl font-extrabold text-ink-950 truncate">{value}</p>
          <p className="text-xs text-ink-500">{label}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-400 truncate">{sub}</p>
    </Link>
  );
}

function QuickAction({ to, icon, label, count }: { to: string; icon: React.ReactNode; label: string; count?: number }) {
  return (
    <Link to={to} className="rounded-xl ring-1 ring-ink-100 p-4 hover:bg-ink-50 hover:ring-brand-200 transition flex flex-col gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700">{icon}</div>
      <p className="text-sm font-semibold text-ink-900">{label}</p>
      {count != null && <p className="text-xs text-ink-500">{count} total</p>}
    </Link>
  );
}
