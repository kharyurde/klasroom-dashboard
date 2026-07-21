import { useAdminData } from "../../lib/useAdminData";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Button, Badge } from "../../components/ui";
import { formatMoney, formatDate } from "../../lib/format";
import { Building2, CreditCard, Save, CheckCircle2, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminSettingsPage() {
  const data = useAdminData();
  const { refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    name: "", tagline: "", description: "", address: "", city: "", state: "",
    phone: "", email: "", website: "",
    application_fee: "", assessment_fee: "", acceptance_fee: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data.school) {
      const s = data.school;
      setForm({
        name: s.name, tagline: s.tagline ?? "", description: s.description ?? "",
        address: s.address ?? "", city: s.city ?? "", state: s.state ?? "",
        phone: s.phone ?? "", email: s.email ?? "", website: s.website ?? "",
        application_fee: s.application_fee.toString(), assessment_fee: s.assessment_fee.toString(), acceptance_fee: s.acceptance_fee.toString(),
      });
    }
  }, [data.school]);

  const save = async () => {
    if (!data.school) return;
    setSaving(true);
    const { error } = await supabase.from("schools").update({
      name: form.name, tagline: form.tagline || null, description: form.description || null,
      address: form.address || null, city: form.city || null, state: form.state || null,
      phone: form.phone || null, email: form.email || null, website: form.website || null,
      application_fee: Number(form.application_fee) || 0, assessment_fee: Number(form.assessment_fee) || 0,
      acceptance_fee: Number(form.acceptance_fee) || 0, updated_at: new Date().toISOString(),
    }).eq("id", data.school.id);
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Settings saved" });
    await data.reload();
    await refresh();
  };

  if (data.loading) return null;
  if (!data.school) return null;

  const s = data.school;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Settings</h1>
        <p className="text-sm text-ink-500 mt-0.5">Manage your school profile, fees, and payment processor.</p>
      </div>

      {/* Subscription status */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-gold-100 text-gold-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">Subscription</p>
              <p className="text-xs text-ink-500 capitalize">{s.subscription_status} plan</p>
            </div>
          </div>
          <Badge tone={s.subscription_status === "active" ? "brand" : "gold"} className="capitalize">{s.subscription_status}</Badge>
        </div>
        {s.trial_ends_at && (
          <p className="mt-3 text-xs text-ink-500">Trial ends {formatDate(s.trial_ends_at)}. Connect your payment processor to start accepting fees.</p>
        )}
      </div>

      {/* Payment processor */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <CreditCard className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-ink-900">Payment processor</p>
            <p className="text-xs text-ink-500">Parents pay fees through your connected account.</p>
          </div>
        </div>
        {s.stripe_account_id ? (
          <div className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3 flex items-center gap-2 text-sm text-brand-800">
            <CheckCircle2 className="h-4 w-4" /> Stripe account connected ({s.stripe_account_id})
          </div>
        ) : (
          <div className="rounded-xl bg-gold-50 ring-1 ring-gold-100 p-3 flex items-start gap-2 text-sm text-gold-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">No payment processor connected.</p>
              <p className="text-xs mt-0.5">Payments are currently simulated. Connect Stripe so fee payments land directly in your account.</p>
            </div>
          </div>
        )}
      </div>

      {/* Profile form */}
      <div className="card p-5 space-y-4">
        <h2 className="text-base font-semibold text-ink-900">School profile</h2>
        <Section label="School name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Section>
        <div className="grid sm:grid-cols-2 gap-4">
          <Section label="Tagline"><input className="input" value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} /></Section>
          <Section label="Website"><input className="input" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} /></Section>
        </div>
        <Section label="Description"><textarea className="input min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Section>
        <Section label="Address"><input className="input" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Section>
        <div className="grid sm:grid-cols-2 gap-4">
          <Section label="City"><input className="input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Section>
          <Section label="State"><input className="input" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></Section>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Section label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Section>
          <Section label="Email"><input className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Section>
        </div>
      </div>

      {/* Fees */}
      <div className="card p-5 space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Admission fees</h2>
        <p className="text-xs text-ink-500">These are charged during the admission flow. School fees are managed in Classes & Fees.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          <Section label="Application fee">
            <input type="number" className="input" value={form.application_fee} onChange={(e) => setForm({ ...form, application_fee: e.target.value })} />
            <p className="text-xs text-ink-400 mt-1">{formatMoney(Number(form.application_fee) || 0, s.currency)}</p>
          </Section>
          <Section label="Assessment fee">
            <input type="number" className="input" value={form.assessment_fee} onChange={(e) => setForm({ ...form, assessment_fee: e.target.value })} />
            <p className="text-xs text-ink-400 mt-1">{formatMoney(Number(form.assessment_fee) || 0, s.currency)}</p>
          </Section>
          <Section label="Acceptance fee">
            <input type="number" className="input" value={form.acceptance_fee} onChange={(e) => setForm({ ...form, acceptance_fee: e.target.value })} />
            <p className="text-xs text-ink-400 mt-1">{formatMoney(Number(form.acceptance_fee) || 0, s.currency)}</p>
          </Section>
        </div>
      </div>

      <Button onClick={save} loading={saving} className="w-full"><Save className="h-4 w-4" /> Save settings</Button>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
