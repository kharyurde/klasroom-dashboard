import { useEffect, useState } from "react";
import { Link, useRouter } from "../../lib/router";
import { useParentData } from "../../lib/useParentData";
import { EmptyState, Badge } from "../../components/ui";
import { formatMoney, formatDate, relativeTime } from "../../lib/format";
import { STAGE_META, PIPELINE_ORDER, stageIndex } from "../../lib/status";
import {
  Plus, FileText, CreditCard, GraduationCap, Users, ArrowRight,
  CheckCircle2, TrendingUp, Calendar,
} from "lucide-react";
import type { Ward, Application, School } from "../../lib/types";

export function ParentDashboardPage() {
  const data = useParentData();
  const { navigate } = useRouter();

  if (data.loading) return null;

  if (data.wards.length === 0) {
    return (
      <EmptyState
        icon={<Users className="h-7 w-7" />}
        title="Welcome! Add your first child to begin."
        description="You need at least one ward to start an application. One parent account manages all your children across every Klasroom school."
        action={
          <Link to="/portal/wards/new" className="btn-primary">
            <Plus className="h-4 w-4" /> Add your first ward
          </Link>
        }
      />
    );
  }

  const activeWard = data.activeWard;
  const ctx = data.activeContext;
  if (!activeWard || !ctx) {
    return (
      <EmptyState
        icon={<Users className="h-7 w-7" />}
        title="Select a ward"
        description="Pick a child from the switcher above, or add a new one."
        action={<Link to="/portal/wards/new" className="btn-primary"><Plus className="h-4 w-4" /> Add ward</Link>}
      />
    );
  }

  const activeApp = ctx.applications.find((a) => !["enrolled", "rejected", "withdrawn"].includes(a.status));
  const enrolled = ctx.enrollments.find((e) => e.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Dashboard</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            Managing <span className="font-semibold text-ink-700">{activeWard.first_name} {activeWard.last_name}</span>
            {ctx.enrollments.length > 0 && <> · {ctx.enrollments.length} enrolled</>}
            {ctx.applications.length > 0 && <> · {ctx.applications.length} application{ctx.applications.length > 1 ? "s" : ""}</>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/apply" className="btn-secondary"><FileText className="h-4 w-4" /> New application</Link>
          <Link to="/portal/wards/new" className="btn-primary"><Plus className="h-4 w-4" /> Add ward</Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<FileText />} tone="ocean" label="Applications" value={ctx.applications.length} sub={`${ctx.applications.filter(a => !["enrolled","rejected","withdrawn"].includes(a.status)).length} active`} />
        <StatCard icon={<GraduationCap />} tone="brand" label="Enrolled" value={ctx.enrollments.length} sub={enrolled ? enrolled.school?.name ?? "—" : "none yet"} />
        <StatCard icon={<CreditCard />} tone="gold" label="Payments" value={ctx.applications.length} sub="across all schools" />
        <StatCard icon={<TrendingUp />} tone="rose" label="Wards" value={data.wards.length} sub="across all schools" />
      </div>

      {/* Active application pipeline */}
      {activeApp ? (
        <ActivePipelineCard ward={activeWard} application={activeApp} school={activeApp.school} />
      ) : enrolled ? (
        <EnrolledCard ward={activeWard} enrollment={enrolled} school={enrolled.school} />
      ) : (
        <EmptyState
          icon={<FileText className="h-7 w-7" />}
          title="No active application"
          description={`${activeWard.first_name} has no application in progress. Apply to a Klasroom school to get started.`}
          action={<Link to="/apply" className="btn-primary"><Plus className="h-4 w-4" /> Start an application</Link>}
        />
      )}

      {/* Recent applications list */}
      {ctx.applications.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">All applications</h2>
            <Link to="/portal/applications" className="text-sm font-medium text-brand-700 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-ink-100">
            {ctx.applications.slice(0, 4).map((a) => {
              const meta = STAGE_META[a.status];
              return (
                <button
                  key={a.id}
                  onClick={() => navigate(`/portal/applications/${a.id}`)}
                  className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50 transition text-left"
                >
                  <div className="h-10 w-10 rounded-xl bg-ink-50 grid place-items-center text-sm font-bold text-ink-700 shrink-0">
                    {a.school?.name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900 truncate">{a.school?.name}</p>
                    <p className="text-xs text-ink-500">{a.applying_for_class_name} · {formatDate(a.created_at)}</p>
                  </div>
                  <Badge tone={meta.tone}>{meta.short}</Badge>
                  <ArrowRight className="h-4 w-4 text-ink-300" />
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, tone, label, value, sub }: { icon: React.ReactNode; tone: "ocean" | "brand" | "gold" | "rose"; label: string; value: number; sub: string }) {
  const tones = {
    ocean: "bg-ocean-100 text-ocean-700",
    brand: "bg-brand-100 text-brand-700",
    gold: "bg-gold-100 text-gold-700",
    rose: "bg-rose-100 text-rose-700",
  };
  return (
    <div className="card p-5">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div>
        <div>
          <p className="text-2xl font-extrabold text-ink-950">{value}</p>
          <p className="text-xs text-ink-500">{label}</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-400 truncate">{sub}</p>
    </div>
  );
}

function ActivePipelineCard({ ward, application, school }: { ward: Ward; application: Application; school?: School }) {
  const meta = STAGE_META[application.status];
  const idx = stageIndex(application.status);
  const progress = Math.round((idx / (PIPELINE_ORDER.length - 1)) * 100);

  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-brand-200">Active application</p>
            <h2 className="text-xl font-bold mt-1">{school?.name}</h2>
            <p className="text-sm text-brand-100 mt-0.5">{application.applying_for_class_name} · {application.session_name}</p>
          </div>
          <Badge tone={meta.tone} className="!bg-white/20 !text-white">{meta.label}</Badge>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-xs text-brand-100 mb-1.5">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-50 text-brand-700 shrink-0">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">{meta.label}</p>
            <p className="text-xs text-ink-500 mt-0.5">{meta.description}</p>
          </div>
        </div>
        <Link to={`/portal/applications/${application.id}`} className="btn-primary w-full justify-center">
          Continue application <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function EnrolledCard({ ward, enrollment, school }: { ward: Ward; enrollment: { registration_number: string | null; class?: { name: string } | null; school?: School }; school?: School }) {
  return (
    <div className="card overflow-hidden">
      <div className="bg-gradient-to-br from-brand-700 to-brand-900 p-5 text-white flex items-center gap-4">
        <div className="h-14 w-14 rounded-2xl bg-white/15 grid place-items-center">
          <GraduationCap className="h-7 w-7" />
        </div>
        <div className="flex-1">
          <p className="text-xs uppercase tracking-wider text-brand-200">Enrolled</p>
          <h2 className="text-xl font-bold">{ward.first_name} {ward.last_name}</h2>
          <p className="text-sm text-brand-100">{school?.name} · {enrollment.class?.name ?? "—"}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-brand-200">Reg. No.</p>
          <p className="font-bold tracking-tight">{enrollment.registration_number ?? "—"}</p>
        </div>
      </div>
      <div className="p-5 grid sm:grid-cols-3 gap-3">
        <Link to="/portal/results" className="card card-hover p-4 text-center hover:ring-brand-200">
          <GraduationCap className="h-6 w-6 text-brand-600 mx-auto" />
          <p className="text-sm font-semibold mt-2">Results</p>
        </Link>
        <Link to="/portal/attendance" className="card card-hover p-4 text-center hover:ring-brand-200">
          <Calendar className="h-6 w-6 text-brand-600 mx-auto" />
          <p className="text-sm font-semibold mt-2">Attendance</p>
        </Link>
        <Link to="/portal/payments" className="card card-hover p-4 text-center hover:ring-brand-200">
          <CreditCard className="h-6 w-6 text-brand-600 mx-auto" />
          <p className="text-sm font-semibold mt-2">Payments</p>
        </Link>
      </div>
    </div>
  );
}
