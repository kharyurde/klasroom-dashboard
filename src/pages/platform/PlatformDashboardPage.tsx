import { Link } from "../../lib/router";
import { usePlatformData } from "../../lib/usePlatformData";
import { Badge, Spinner } from "../../components/ui";
import { formatMoney, formatDate, relativeTime } from "../../lib/format";
import {
  Building2, CreditCard, GraduationCap, Users, TrendingUp,
  ArrowRight, Activity,
} from "lucide-react";

export function PlatformDashboardPage() {
  const data = usePlatformData();
  if (data.loading) return <div className="grid place-items-center py-20"><Spinner className="text-brand-600" size={28} /></div>;

  const totalRevenue = data.payments.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
  const activeSchools = data.schools.filter((s) => s.subscription_status === "active" || s.subscription_status === "trial").length;
  const trialSchools = data.schools.filter((s) => s.subscription_status === "trial").length;
  const totalStudents = data.allStudents.length;
  const totalTeachers = data.allTeachers.length;
  const totalApps = data.allApplications.length;
  const pendingApps = data.allApplications.filter((a) => ["submitted", "under_review"].includes(a.status)).length;
  const recentPayments = data.payments.filter((p) => p.status === "paid").slice(0, 6);
  const recentSchools = data.schools.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Platform Overview</h1>
        <p className="text-sm text-ink-500 mt-0.5">937 Limited · Klasroom SaaS administration</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Building2 />} tone="ocean" label="Schools" value={data.schools.length} sub={`${activeSchools} active · ${trialSchools} on trial`} link="/platform/schools" />
        <Stat icon={<CreditCard />} tone="gold" label="Total revenue" value={formatMoney(totalRevenue)} sub={`${data.payments.filter(p => p.status === "paid").length} payments`} link="/platform/payments" />
        <Stat icon={<GraduationCap />} tone="brand" label="Students" value={totalStudents} sub={`${totalTeachers} teachers`} link="/platform/students" />
        <Stat icon={<Users />} tone="rose" label="Applications" value={totalApps} sub={`${pendingApps} pending review`} link="/platform/schools" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Schools list */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">Schools on platform</h2>
            <Link to="/platform/schools" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          {recentSchools.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">No schools yet.</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {recentSchools.map((s) => (
                <Link key={s.id} to="/platform/schools" className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700 text-sm font-bold">
                    {s.name?.[0] ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{s.name}</p>
                    <p className="text-xs text-ink-500">{s.city}, {s.state} · {s.studentCount} students</p>
                  </div>
                  <Badge tone={s.subscription_status === "active" ? "brand" : s.subscription_status === "trial" ? "gold" : "neutral"}>{s.subscription_status}</Badge>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent payments */}
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-brand-600" />
              <h2 className="text-base font-semibold text-ink-900">Recent payments</h2>
            </div>
            <Link to="/platform/payments" className="text-sm font-medium text-brand-700 hover:underline">All</Link>
          </div>
          {recentPayments.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-500">No payments yet.</div>
          ) : (
            <div className="divide-y divide-ink-100">
              {recentPayments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{p.description ?? p.type}</p>
                    <p className="text-xs text-ink-500">{relativeTime(p.created_at)}</p>
                  </div>
                  <span className="text-sm font-bold text-ink-950">{formatMoney(p.amount, p.currency)}</span>
                  <Badge tone="brand">paid</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trial schools alert */}
      {trialSchools > 0 && (
        <div className="card p-5 bg-gold-50 ring-gold-100">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-gold-700 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gold-900">{trialSchools} school{trialSchools === 1 ? "" : "s"} on trial</p>
              <p className="text-xs text-gold-800 mt-0.5">These schools are in their 14-day trial period. Help them connect payment processors to convert to paying customers.</p>
            </div>
            <Link to="/platform/schools" className="ml-auto text-sm font-medium text-gold-900 hover:underline">Review</Link>
          </div>
        </div>
      )}
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
