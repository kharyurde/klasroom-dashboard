import { useEffect, useState } from "react";
import { Link, useRouter } from "../lib/router";
import * as authApi from "../lib/authApi";
import { ApiError } from "../lib/apiClient";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Logo, Button } from "../components/ui";
import { Mail, Lock, User, Phone, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";

export function ParentRegisterPage() {
  const { navigate } = useRouter();
  const toast = useToast();
  const { user } = useAuth();

  const [form, setForm] = useState({
    salutation: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirm: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.userType === "parent") navigate("/portal");
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  if (form.password !== form.confirm) {
    setError("Passwords do not match.");
    return;
  }

  setLoading(true);
  try {
    await authApi.registerParent({
      salutation: form.salutation || undefined,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      password: form.password,
      phone: form.phone.trim() || undefined,
    });

    toast({
      kind: "success",
      title: "Account created",
      message: "Check your email for a verification link."
    });

    navigate("/verify-email?email=" + encodeURIComponent(form.email.trim().toLowerCase()));
  } catch (err) {
    if (err instanceof ApiError && err.details && typeof err.details === "object") {
      const fieldErrors = err.details as Record<string, string[] | undefined>;
      const firstMessage = Object.values(fieldErrors).flat().find(Boolean);
      setError(firstMessage ?? err.message);
    } else {
      setError(err instanceof Error ? err.message : "Registration failed");
    }
  } finally {
    setLoading(false);
  }
};
  return (
    <AuthShell title="Create your parent account" subtitle="One login for all your children across every Klasroom school.">
      <form onSubmit={submit} className="space-y-4">
        {error && <FieldError>{error}</FieldError>}

        <div className="grid grid-cols-3 gap-3">
          <Field label="Title" icon={<User className="h-4 w-4" />}>
            <select
              className="input pl-10"
              value={form.salutation}
              onChange={(e) => setForm({ ...form, salutation: e.target.value })}
            >
              <option value="">Title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Ms">Ms</option>
            </select>
          </Field>

          <Field label="First Name" icon={<User className="h-4 w-4" />}>
            <input
              className="input pl-10"
              placeholder="Adeola"
              required
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>

          <Field label="Last Name" icon={<User className="h-4 w-4" />}>
            <input
              className="input pl-10"
              placeholder="Okafor"
              required
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Email address" icon={<Mail className="h-4 w-4" />}>
          <input
            type="email"
            className="input pl-10"
            placeholder="you@email.com"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>

        <Field label="Phone (optional)" icon={<Phone className="h-4 w-4" />}>
          <input
            className="input pl-10"
            placeholder="+234 801 234 5678"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Password" icon={<Lock className="h-4 w-4" />}>
            <input
              type="password"
              className="input pl-10"
              placeholder="••••••••"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="mt-1 text-xs text-ink-500">
              8+ characters, with an uppercase letter, a lowercase letter, and a number.
            </p>
          </Field>
          <Field label="Confirm Password" icon={<Lock className="h-4 w-4" />}>
            <input
              type="password"
              className="input pl-10"
              placeholder="••••••••"
              required
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
            />
          </Field>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Create account <ArrowRight className="h-4 w-4" />
        </Button>

        <p className="text-center text-sm text-ink-500">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-700 hover:underline">Sign in</Link>
        </p>
      </form>
    </AuthShell>
  );
}

export function VerifyEmailPage() {
  const { route, navigate } = useRouter();
  const { user } = useAuth();
  const toast = useToast();

  const email = route.query.get("email") || user?.email || "";
  const token = route.query.get("token");

  const [verifying, setVerifying] = useState(Boolean(token));
  const [verified, setVerified] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  // Handle token from email link
  useEffect(() => {
    if (!token) return;

    const verifyToken = async () => {
      try {
        await authApi.verifyEmail(token);
        setVerified(true);

        toast({
          kind: "success",
          title: "Email verified successfully!",
          message: "Logging you in automatically..."
        });

        // Auto redirect to parent portal
        setTimeout(() => {
          navigate("/portal");
        }, 1800);
      } catch (e) {
        setVerifyError(e instanceof Error ? e.message : "This verification link is invalid or has expired.");
      } finally {
        setVerifying(false);
      }
    };

    verifyToken();
  }, [token, navigate, toast]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && user.userType === "parent") {
      navigate("/portal");
    }
  }, [user, navigate]);

  const resend = async () => {
    if (!email) {
      navigate("/register");
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerification(email);
      toast({ 
        kind: "success", 
        title: "Email sent", 
        message: "Check your inbox for the new verification link." 
      });
    } catch (e) {
      toast({ 
        kind: "error", 
        title: "Failed to resend", 
        message: e instanceof Error ? e.message : "Please try again." 
      });
    } finally {
      setResending(false);
    }
  };

  // When token is present (from email link)
  if (token) {
    return (
      <AuthShell title="Verify your email" subtitle="Confirming your account...">
        <div className="space-y-5">
          {verifying ? (
            <div className="card p-8 text-center">
              <div className="animate-spin h-8 w-8 border-4 border-brand-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-ink-600">Verifying your email...</p>
            </div>
          ) : verified ? (
            <div className="card bg-brand-50 ring-1 ring-brand-100 p-8 text-center">
              <CheckCircle2 className="h-16 w-16 text-brand-600 mx-auto mb-4" />
              <p className="text-2xl font-semibold text-brand-900">Email Verified Successfully!</p>
              <p className="text-brand-700 mt-2">Logging you in automatically...</p>
            </div>
          ) : (
            <div className="card bg-rose-50 ring-1 ring-rose-100 p-6">
              <AlertTriangle className="h-8 w-8 text-rose-600 mx-auto mb-3" />
              <p className="font-semibold text-rose-900">Verification Failed</p>
              <p className="text-rose-700 mt-2">{verifyError}</p>
            </div>
          )}

          {!verified && (
            <Link to="/login" className="btn-primary w-full justify-center block text-center py-3">
              Go to Sign In <ArrowRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      </AuthShell>
    );
  }

  // Normal verification waiting page
  return (
    <AuthShell title="Verify your email" subtitle="We sent a verification link to your inbox.">
      <div className="space-y-5">
        <div className="card bg-brand-50 ring-1 ring-brand-100 p-6 flex items-start gap-4">
          <Mail className="h-6 w-6 text-brand-700 mt-0.5" />
          <div>
            <p className="font-semibold text-brand-900">Check your email</p>
            <p className="text-brand-800 mt-1">
              {email ? (
                <>Click the link we sent to <strong>{email}</strong></>
              ) : (
                "Click the verification link we sent to your inbox."
              )}
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={resend} loading={resending} className="w-full">
          Resend verification email
        </Button>

        <p className="text-center text-sm text-ink-500">
          Wrong email?{" "}
          <Link to="/register" className="font-semibold text-brand-700 hover:underline">
            Register again
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}


export function LoginPage() {
  const { navigate } = useRouter();
  const { user, login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) redirectForRole(user.userType, navigate);
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const authUser = await login(form.email.trim().toLowerCase(), form.password);
      toast({ kind: "success", title: "Signed in" });
      if (authUser.forcePasswordChange) {
        toast({ kind: "info", title: "Please change your password", message: "Your school administrator reset your password — set a new one soon." });
      }
      redirectForRole(authUser.userType, navigate);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
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

function redirectForRole(userType: authApi.UserRole, navigate: (path: string) => void): void {
  switch (userType) {
    case "platform_admin":
      navigate("/platform");
      return;
    case "school_admin":
    case "principal":
    case "vice_principal":
    case "accountant":
    case "staff":
      navigate("/admin");
      return;
    case "teacher":
      navigate("/teacher");
      return;
    case "student":
      navigate("/student");
      return;
    case "parent":
    default:
      navigate("/portal");
  }
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