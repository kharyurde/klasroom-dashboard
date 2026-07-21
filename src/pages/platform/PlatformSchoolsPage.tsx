import { useState } from "react";
import { usePlatformData } from "../../lib/usePlatformData";
import { Badge, Button, EmptyState, Modal, Spinner } from "../../components/ui";
import { formatMoney, formatDate } from "../../lib/format";
import { Building2, Search, Eye, MapPin } from "lucide-react";
import type { School } from "../../lib/types";

export function PlatformSchoolsPage() {
  const data = usePlatformData();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<(School & { admin?: any; enrollmentCount: number; teacherCount: number; studentCount: number }) | null>(null);

  if (data.loading) return <div className="grid place-items-center py-20"><Spinner className="text-brand-600" size={28} /></div>;

  const filtered = data.schools.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()) ||
    s.city?.toLowerCase().includes(query.toLowerCase()) ||
    s.state?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Schools</h1>
        <p className="text-sm text-ink-500 mt-0.5">{data.schools.length} schools on the Klasroom platform.</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-400" />
        <input className="input pl-10" placeholder="Search by name, city, or state…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<Building2 className="h-7 w-7" />} title="No schools found" description={query ? "Try a different search." : "No schools have registered yet."} />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div key={s.id} className="card p-5">
              <div className="flex items-start gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-100 text-brand-700 text-lg font-bold shrink-0">
                  {s.name?.[0] ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-900 truncate">{s.name}</p>
                  <p className="text-xs text-ink-500 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {s.city}, {s.state}</p>
                </div>
                <Badge tone={s.subscription_status === "active" ? "brand" : s.subscription_status === "trial" ? "gold" : "neutral"}>{s.subscription_status}</Badge>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-ink-50 py-2">
                  <p className="text-lg font-bold text-ink-950">{s.studentCount}</p>
                  <p className="text-[10px] text-ink-500">Students</p>
                </div>
                <div className="rounded-lg bg-ink-50 py-2">
                  <p className="text-lg font-bold text-ink-950">{s.teacherCount}</p>
                  <p className="text-[10px] text-ink-500">Teachers</p>
                </div>
                <div className="rounded-lg bg-ink-50 py-2">
                  <p className="text-lg font-bold text-ink-950">{s.enrollmentCount}</p>
                  <p className="text-[10px] text-ink-500">Enrollments</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-ink-500">
                <span>Admin: {s.admin?.full_name ?? "—"}</span>
                <Button variant="secondary" className="text-xs" onClick={() => setView(s)}><Eye className="h-3.5 w-3.5" /> View</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!view} onClose={() => setView(null)} title={view?.name} size="lg">
        {view && (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Info label="Subscription" value={view.subscription_status} />
              <Info label="Currency" value={view.currency} />
              <Info label="Admin" value={view.admin?.full_name ?? "—"} />
              <Info label="Admin email" value={view.admin?.email ?? "—"} />
              <Info label="City" value={view.city ?? "—"} />
              <Info label="State" value={view.state ?? "—"} />
              <Info label="School email" value={view.email ?? "—"} />
              <Info label="Phone" value={view.phone ?? "—"} />
              <Info label="Application fee" value={formatMoney(view.application_fee, view.currency)} />
              <Info label="Assessment fee" value={formatMoney(view.assessment_fee, view.currency)} />
              <Info label="Acceptance fee" value={formatMoney(view.acceptance_fee, view.currency)} />
              <Info label="Stripe connected" value={view.stripe_account_id ? "Yes" : "No"} />
              <Info label="Joined" value={formatDate(view.created_at)} />
              {view.trial_ends_at && <Info label="Trial ends" value={formatDate(view.trial_ends_at)} />}
            </div>
            {view.tagline && <p className="text-sm text-ink-600 italic">"{view.tagline}"</p>}
            {view.description && <p className="text-sm text-ink-600">{view.description}</p>}
            <div className="grid grid-cols-3 gap-2 text-center border-t border-ink-100 pt-4">
              <div><p className="text-2xl font-extrabold text-ink-950">{view.studentCount}</p><p className="text-xs text-ink-500">Students</p></div>
              <div><p className="text-2xl font-extrabold text-ink-950">{view.teacherCount}</p><p className="text-xs text-ink-500">Teachers</p></div>
              <div><p className="text-2xl font-extrabold text-ink-950">{view.enrollmentCount}</p><p className="text-xs text-ink-500">Enrollments</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-50 px-3 py-2">
      <p className="text-[10px] text-ink-500">{label}</p>
      <p className="text-sm font-medium text-ink-900 truncate">{value}</p>
    </div>
  );
}
