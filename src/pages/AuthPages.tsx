import { useEffect, useState } from "react";
import { Link, useRouter } from "../lib/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Logo, Button } from "../components/ui";
import { Mail, Lock, User, Phone, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

export function ParentRegisterPage() {
  const { navigate } = useRouter();
  const toast = useToast();
  const { user } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.userType === "parent") navigate("/verify-email");
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: form.email.trim().toLowerCase(),
      password: form.password,
      options: {
        data: { user_type: "parent", full_name: form.full_name.trim(), phone: form.phone.trim() },
        emailRedirectTo: window.location.origin + "#/verify-email",
      },
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.user && !data.session) {
      toast({ kind: "success", title: "Account created", message: "Check your email for a verification link." });
      navigate("/verify-email?email=" + encodeURIComponent(form.email.trim().toLowerCase()));
    } else if (data.session) {
      toast({ kind: "success", title: "Welcome to Klasroom" });
      navigate("/portal");
    }
  };

  return (
    <AuthShell title="Create your parent account" subtitle="One login for all your children across every Klasroom school.">
      <form onSubmit={submit} className="space-y-4">
        {error && <FieldError>{error}</FieldError>}
        <Field label="Full name" icon={<User className="h-4 w-4" />}>
          <input className="input pl-10" placeholder="Adeola Okafor" required value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </Field>
        <Field label="Email address" icon={<Mail className="h-4 w-4" />}>
          <input type="email" className="input pl-10" placeholder="you@email.com" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Phone (optional)" icon={<Phone className="h-4 w-4" />}>
          <input className="input pl-10" placeholder="+234 801 234 5678" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" icon={<Lock className="h-4 w-4" />}>
            <input type="password" className="input pl-10" placeholder="••••••••" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>
          <Field label="Confirm" icon={<Lock className="h-4 w-4" />}>
            <input type="password" className="input pl-10" placeholder="••••••••" required value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </Field>
        </div>
        <Button type="submit" loading={loading} className="w-full">
          Create account <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
        </p>
        <p className="text-center text-xs text-ink-400">
          By creating an account you agree to Klasroom's terms. Parents never pay Klasroom — only school fees via the school's processor.
        </p>
      </form>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const { route, navigate } = useRouter();
  const { user, refresh } = useAuth();
  const email = route.query.get("email") || user?.email || "";
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (user?.emailConfirmed && user.userType === "parent") {
      navigate("/portal");
    }
  }, [user, navigate]);

  const resend = async () => {
    if (!email) {
      navigate("/register");
      return;
    }
    setResending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email, options: { emailRedirectTo: window.location.origin + "#/verify-email" } });
    setResending(false);
    if (error) toast({ kind: "error", title: "Could not resend", message: error.message });
    else toast({ kind: "success", title: "Email sent", message: "Check your inbox for the verification link." });
  };

  const checkNow = async () => {
    setChecking(true);
    await refresh();
    setChecking(false);
    if (user?.emailConfirmed) navigate("/portal");
  };

  return (
    <AuthShell title="Verify your email" subtitle="We sent a verification link to your inbox.">
      <div className="space-y-5">
        <div className="card bg-brand-50 ring-1 ring-brand-100 p-4 flex items-start gap-3">
          <Mail className="h-5 w-5 text-brand-700 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-brand-900">Check your email</p>
            <p className="text-brand-800/80 mt-0.5">
              {email ? <>Click the link we sent to <span className="font-semibold">{email}</span>.</> : "Click the link we sent to your inbox."}
            </p>
          </div>
        </div>
        <div className="card p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-brand-600 mt-0.5 shrink-0" />
          <div className="text-sm text-ink-700">
            <p className="font-semibold">Already verified?</p>
            <p className="text-ink-500 mt-0.5">If you've clicked the link, sign in to continue.</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={checkNow} loading={checking} className="w-full">
            I've verified — continue
          </Button>
          <Button variant="secondary" onClick={resend} loading={resending} className="w-full">
            Resend verification email
          </Button>
        </div>
        <p className="text-center text-sm text-ink-500">
          Wrong email?{" "}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">Start over</Link>
        </p>
      </div>
    </AuthShell>
  );
}

export function LoginPage() {
  const { navigate } = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      if (!user.emailConfirmed && user.userType === "parent") navigate("/verify-email?email=" + encodeURIComponent(user.email));
      else if (user.userType === "parent") navigate("/portal");
      else if (user.userType === "school_admin") navigate("/admin");
    }
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    const meta = (data.user?.user_metadata ?? {}) as Record<string, string>;
    const ut = meta.user_type || "parent";
    toast({ kind: "success", title: "Signed in" });
    if (ut === "school_admin") navigate("/admin");
    else if (!data.user?.email_confirmed_at) navigate("/verify-email?email=" + encodeURIComponent(form.email.trim().toLowerCase()));
    else navigate("/portal");
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your Klasroom account.">
      <form onSubmit={submit} className="space-y-4">
        {error && <FieldError>{error}</FieldError>}
        <Field label="Email address" icon={<Mail className="h-4 w-4" />}>
          <input type="email" className="input pl-10" placeholder="you@email.com" required value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password" icon={<Lock className="h-4 w-4" />}>
          <input type="password" className="input pl-10" placeholder="••••••••" required value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        <Button type="submit" loading={loading} className="w-full">
          Sign in <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="flex items-center justify-between text-sm">
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">Create parent account</Link>
          <Link to="/schools/register" className="text-ink-500 hover:text-ink-800">Register a school</Link>
        </div>
      </form>
    </AuthShell>
  );
}

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-800 to-ink-950 p-12 text-white relative overflow-hidden">
        <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute bottom-0 -left-24 h-80 w-80 rounded-full bg-ocean-500/20 blur-3xl" />
        <Link to="/" className="relative"><Logo size={40} withText /></Link>
        <div className="relative">
          <h2 className="text-3xl font-extrabold leading-tight text-balance">From application to admission — handled.</h2>
          <p className="mt-4 text-brand-100 max-w-md">One parent login. Every child. Every Klasroom school. Track payments, results, attendance, and more.</p>
          <div className="mt-8 space-y-3">
            {["Apply to any Klasroom school", "Pay fees online, get PDF receipts", "Track the full admission pipeline", "Results, attendance & requests"].map((t) => (
              <div key={t} className="flex items-center gap-2.5 text-sm text-brand-50">
                <CheckCircle2 className="h-4 w-4 text-brand-300" /> {t}
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-xs text-brand-200">© {new Date().getFullYear()} 937 Limited · Klasroom</p>
      </div>
      <div className="flex flex-col justify-center px-6 py-10 sm:px-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="lg:hidden mb-8"><Link to="/"><Logo withText /></Link></div>
          <h1 className="text-2xl font-extrabold text-ink-950">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400">{icon}</span>
        {children}
      </div>
    </div>
  );
}

function FieldError({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-rose-50 ring-1 ring-rose-100 p-3 flex items-start gap-2 text-sm text-rose-700 animate-slide-up">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{children}</span>
    </div>
  );
}