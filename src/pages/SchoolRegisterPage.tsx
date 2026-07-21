import { useEffect, useState } from "react";
import { Link, useRouter } from "../lib/router";
import { supabase } from "../lib/supabase";
import { useToast } from "../lib/toast";
import { useAuth } from "../lib/auth";
import { AuthShell } from "./AuthPages";
import { Button } from "../components/ui";
import { Building2, Mail, Lock, User, Phone, ArrowRight, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

export function SchoolRegisterPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    schoolName: "", tagline: "", city: "", state: "", address: "", phone: "", schoolEmail: "",
    applicationFee: "15000", assessmentFee: "20000", acceptanceFee: "75000",
    adminName: "", adminEmail: "", adminPhone: "", password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (user?.userType === "school_admin") navigate("/admin");
  }, [user, navigate]);

  const slugify = (s: string) =>
    s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password.length < 8) {
      setError("Admin password must be at least 8 characters.");
      return;
    }
    setLoading(true);

    // 1. Create the school row first (public insert allowed by RLS self-signup).
    const slug = slugify(form.schoolName) + "-" + Math.random().toString(36).slice(2, 6);
    const { data: school, error: schoolErr } = await supabase
      .from("schools")
      .insert({
        name: form.schoolName.trim(),
        slug,
        tagline: form.tagline.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        phone: form.phone.trim() || null,
        email: form.schoolEmail.trim().toLowerCase() || null,
        application_fee: Number(form.applicationFee) || 0,
        assessment_fee: Number(form.assessmentFee) || 0,
        acceptance_fee: Number(form.acceptanceFee) || 0,
        subscription_status: "trial",
        trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
      })
      .select()
      .single();

    if (schoolErr) {
      setLoading(false);
      setError(schoolErr.message);
      return;
    }

    // 2. Create the admin auth user with user_type=school_admin + school_id in metadata.
    const { data, error: authErr } = await supabase.auth.signUp({
      email: form.adminEmail.trim().toLowerCase(),
      password: form.password,
      options: {
        data: {
          user_type: "school_admin",
          school_id: school.id,
          full_name: form.adminName.trim(),
          role: "admin",
          phone: form.adminPhone.trim(),
        },
        emailRedirectTo: window.location.origin + "#/login",
      },
    });

    setLoading(false);
    if (authErr) {
      setError(authErr.message + " (Your school was created — please retry with a different admin email, or sign in if this account already exists.)");
      return;
    }

    // 3. Create a default academic session.
    await supabase.from("academic_sessions").insert({
      school_id: school.id,
      name: "2026/2027",
      start_date: "2026-09-01",
      end_date: "2027-07-31",
      is_current: true,
    });

    if (data.session) {
      toast({ kind: "success", title: "School onboarded", message: "Welcome to Klasroom." });
      navigate("/admin");
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <AuthShell title="School created" subtitle="Verify your email to access the admin portal.">
        <div className="space-y-5">
          <div className="card bg-brand-50 ring-1 ring-brand-100 p-5 flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-brand-700 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-brand-900">Almost there!</p>
              <p className="text-brand-800/80 mt-1">We created your school and an admin account. Check <span className="font-semibold">{form.adminEmail}</span> for a verification link, then sign in.</p>
            </div>
          </div>
          <Link to="/login" className="btn-primary w-full justify-center">
            Go to sign in <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Onboard your school" subtitle="Your school becomes a tenant on Klasroom — just like an organization in Zoho Books.">
      <form onSubmit={submit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-rose-50 ring-1 ring-rose-100 p-3 flex items-start gap-2 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <Section label="School details">
          <FieldRow label="School name" icon={<Building2 />}>
            <input className="input pl-10" placeholder="Crestfield International College" required value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })} />
          </FieldRow>
          <FieldRow label="Tagline (optional)">
            <input className="input" placeholder="Excellence in every child" value={form.tagline}
              onChange={(e) => setForm({ ...form, tagline: e.target.value })} />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="City">
              <input className="input" placeholder="Lekki" required value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </FieldRow>
            <FieldRow label="State">
              <input className="input" placeholder="Lagos" required value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </FieldRow>
          </div>
          <FieldRow label="Address">
            <input className="input" placeholder="12 Citadel Road" value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="School email" icon={<Mail />}>
              <input type="email" className="input pl-10" placeholder="admissions@school.edu" value={form.schoolEmail}
                onChange={(e) => setForm({ ...form, schoolEmail: e.target.value })} />
            </FieldRow>
            <FieldRow label="Phone" icon={<Phone />}>
              <input className="input pl-10" placeholder="+234 801 222 3333" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </FieldRow>
          </div>
        </Section>

        <Section label="Default fees (NGN)">
          <p className="text-xs text-ink-500 mb-3">You can change these anytime in settings. Parents pay these during the admission flow.</p>
          <div className="grid grid-cols-3 gap-3">
            <FieldRow label="Application fee">
              <input type="number" className="input" required value={form.applicationFee}
                onChange={(e) => setForm({ ...form, applicationFee: e.target.value })} />
            </FieldRow>
            <FieldRow label="Assessment fee">
              <input type="number" className="input" required value={form.assessmentFee}
                onChange={(e) => setForm({ ...form, assessmentFee: e.target.value })} />
            </FieldRow>
            <FieldRow label="Acceptance fee">
              <input type="number" className="input" required value={form.acceptanceFee}
                onChange={(e) => setForm({ ...form, acceptanceFee: e.target.value })} />
            </FieldRow>
          </div>
        </Section>

        <Section label="Admin account">
          <FieldRow label="Your name" icon={<User />}>
            <input className="input pl-10" placeholder="Dr. Funmi Ade" required value={form.adminName}
              onChange={(e) => setForm({ ...form, adminName: e.target.value })} />
          </FieldRow>
          <FieldRow label="Your email" icon={<Mail />}>
            <input type="email" className="input pl-10" placeholder="you@school.edu" required value={form.adminEmail}
              onChange={(e) => setForm({ ...form, adminEmail: e.target.value })} />
          </FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Phone" icon={<Phone />}>
              <input className="input pl-10" placeholder="+234 801 222 3333" value={form.adminPhone}
                onChange={(e) => setForm({ ...form, adminPhone: e.target.value })} />
            </FieldRow>
            <FieldRow label="Password" icon={<Lock />}>
              <input type="password" className="input pl-10" placeholder="••••••••" required value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </FieldRow>
          </div>
        </Section>

        <div className="card bg-brand-50 ring-1 ring-brand-100 p-3.5 flex items-center gap-2.5 text-xs text-brand-800">
          <Sparkles className="h-4 w-4 text-brand-600" />
          <span>14-day free trial. No card required. You'll connect your payment processor in settings to accept fees.</span>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Create school & admin account <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-sm text-ink-500">
          Already onboarded?{" "}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-semibold text-ink-900">{label}</p>
      {children}
    </div>
  );
}

function FieldRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>}
        {children}
      </div>
    </div>
  );
}