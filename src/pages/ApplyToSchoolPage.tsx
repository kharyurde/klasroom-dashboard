import { useEffect, useState } from "react";
import { Link, useRouter } from "../lib/router";
import { supabase } from "../lib/supabase";
import { apiGet } from "../lib/apiClient";
import { useAuth } from "../lib/auth";
import { useToast } from "../lib/toast";
import { Button, Spinner, Badge, EmptyState } from "../components/ui";
import { processLegacyPayment as processPayment } from "../lib/legacyPayments"; // TODO(migration): see legacyPayments.ts
import { notifyParent } from "../lib/notify";
import { formatMoney, formatLongDate } from "../lib/format";
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle, CreditCard, Building2, User, Lock } from "lucide-react";
import type { School, ClassLevel, AcademicSession, Ward } from "../lib/types";

type ApiEnvelope<T> = { success: boolean; statusCode: number; message: string; data: T; errors: unknown; timestamp: string };

export function ApplyToSchoolPage() {
  const { user, loading: authLoading } = useAuth();
  const { route, navigate } = useRouter();
  const toast = useToast();
  const slug = route.segments[1]; // /apply/:slug
  const [school, setSchool] = useState<School | null>(null);
  const [classes, setClasses] = useState<ClassLevel[]>([]);
  const [sessions, setSessions] = useState<AcademicSession[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWard, setSelectedWard] = useState<string>("");
  const [classId, setClassId] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingApp, setExistingApp] = useState<{ id: string; status: string } | null>(null);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: s } = await supabase.from("schools").select("*").eq("slug", slug).maybeSingle();
      if (!s) { setLoading(false); return; }
      setSchool(s as School);
      const [c, sess] = await Promise.all([
        supabase.from("classes").select("*").eq("school_id", s.id).order("level"),
        supabase.from("academic_sessions").select("*").eq("school_id", s.id).order("is_current", { ascending: false }),
      ]);
      setClasses((c.data as ClassLevel[]) ?? []);
      setSessions((sess.data as AcademicSession[]) ?? []);
      const current = (sess.data as AcademicSession[])?.find((x) => x.is_current);
      if (current) setSessionId(current.id);
      if (user && user.userType === "parent") {
        // Wards are fetched through the authenticated Express API (not a direct
        // Supabase call) — the browser's Supabase client has no session since
        // auth is handled by our own JWTs, so a direct query here is rejected
        // by RLS with a 401.
        try {
          const wardsRes = await apiGet<ApiEnvelope<Ward[]>>("/api/parent/wards");
          const w = wardsRes.data ?? [];
          setWards(w);
          const preWard = route.query.get("ward");
          if (preWard && w.some((x) => x.id === preWard)) setSelectedWard(preWard);
          else if (w.length === 1) setSelectedWard(w[0].id);
        } catch (err) {
          console.error(err);
          setWards([]);
        }
      }
      setLoading(false);
    })();
  }, [slug, user, route.query]);

  // Not logged in (or logged in as a non-parent) -> send straight to login,
  // preserving this page as the ?next= destination so they land back here
  // once authenticated.
  useEffect(() => {
    if (authLoading) return;
    if (!user || user.userType !== "parent") {
      navigate(`/login?next=${encodeURIComponent(route.path)}`);
    }
  }, [authLoading, user, route.path, navigate]);

  if (loading || authLoading || !user || user.userType !== "parent") {
    return <div className="min-h-screen grid place-items-center"><Spinner className="text-brand-600" size={32} /></div>;
  }
  if (!school) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <EmptyState icon={<Building2 className="h-7 w-7" />} title="School not found" description="This school isn't on Klasroom yet."
          action={<Link to="/apply" className="btn-primary">Browse schools</Link>} />
      </div>
    );
  }
  if (!user.emailConfirmed) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <EmptyState icon={<Lock className="h-7 w-7" />} title="Verify your email" description="You need to verify your email before applying."
          action={<Link to="/verify-email" className="btn-primary">Verify email</Link>} />
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedWard) { setError("Please select a child."); return; }
    if (!classId) { setError("Please select a class."); return; }

    // Check for existing active application for this ward+school
    const { data: existing } = await supabase
      .from("applications")
      .select("id,status")
      .eq("ward_id", selectedWard)
      .eq("school_id", school.id)
      .not("status", "in", '("rejected","withdrawn","enrolled")')
      .maybeSingle();
    if (existing) {
      setExistingApp(existing as { id: string; status: string });
      return;
    }

    const cls = classes.find((c) => c.id === classId);
    const sess = sessions.find((s) => s.id === sessionId);
    setSubmitting(true);
    const { data, error: err } = await supabase
      .from("applications")
      .insert({
        ward_id: selectedWard,
        school_id: school.id,
        parent_id: user.id,
        applying_for_class_id: classId,
        applying_for_class_name: cls?.name ?? null,
        session_id: sessionId || null,
        session_name: sess?.name ?? null,
        status: "draft",
      })
      .select()
      .single();
    setSubmitting(false);
    if (err) { setError(err.message); return; }

    // Pay the application fee
    await payApplicationFee(data.id, selectedWard);
  };

  const payApplicationFee = async (applicationId: string, wardId: string) => {
    const ward = wards.find((w) => w.id === wardId)!;
    setPaying(true);
    try {
      await processPayment({
        school: { id: school.id, currency: school.currency, name: school.name, application_fee: school.application_fee, assessment_fee: school.assessment_fee, acceptance_fee: school.acceptance_fee },
        ward, type: "application_fee", amount: school.application_fee, applicationId,
      });
      // Mark application submitted
      await supabase.from("applications").update({ status: "submitted", updated_at: new Date().toISOString() }).eq("id", applicationId);
      await supabase.from("application_stages").insert({ application_id: applicationId, stage: "submitted", note: "Application fee paid and submitted to school.", actor_type: "parent", actor_id: user!.id });
      await notifyParent(user!.id, "Application submitted", `Your application to ${school.name} has been submitted.`, "application", `/portal/applications/${applicationId}`);
      setPaying(false);
      toast({ kind: "success", title: "Application submitted", message: `${school.name} will review your application.` });
      navigate(`/portal/applications/${applicationId}`);
    } catch (e) {
      setPaying(false);
      setError((e as Error).message);
    }
  };

  if (existingApp) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="card p-8 max-w-md text-center">
          <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-gold-100 text-gold-700">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-ink-950">Application already exists</h1>
          <p className="mt-2 text-sm text-ink-500">This child already has an active application to {school.name}. You can continue from where you left off.</p>
          <Link to={`/portal/applications/${existingApp.id}`} className="btn-primary mt-6 w-full justify-center">
            View application <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-40 glass border-b border-ink-100">
        <div className="container-page flex h-16 items-center justify-between">
          <Link to="/apply" className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900">
            <ArrowLeft className="h-4 w-4" /> All schools
          </Link>
          <Link to="/portal" className="btn-ghost text-sm">Portal</Link>
        </div>
      </header>

      <div className="container-page py-8 max-w-2xl">
        {/* School header */}
        <div className="card overflow-hidden mb-6">
          <div className="h-24 bg-gradient-to-br from-brand-700 to-brand-900 relative">
            <div className="absolute -bottom-6 left-6 h-14 w-14 rounded-2xl bg-white shadow-lift grid place-items-center text-2xl font-extrabold text-brand-700 ring-1 ring-ink-100">
              {school.name[0]?.toUpperCase()}
            </div>
          </div>
          <div className="pt-8 px-6 pb-5">
            <h1 className="text-xl font-bold text-ink-950">{school.name}</h1>
            {school.tagline && <p className="text-sm text-brand-700 font-medium">{school.tagline}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="brand">Application fee: {formatMoney(school.application_fee, school.currency)}</Badge>
              <Badge tone="ocean">Assessment: {formatMoney(school.assessment_fee, school.currency)}</Badge>
              <Badge tone="gold">Acceptance: {formatMoney(school.acceptance_fee, school.currency)}</Badge>
            </div>
          </div>
        </div>

        {wards.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="grid h-14 w-14 mx-auto place-items-center rounded-2xl bg-brand-100 text-brand-700">
              <User className="h-7 w-7" />
            </div>
            <h2 className="mt-4 text-lg font-bold text-ink-950">Add a child first</h2>
            <p className="mt-1.5 text-sm text-ink-500">You need to register a ward before applying.</p>
            <Link to={`/portal/wards/new?next=/apply/${slug}`} className="btn-primary mt-5">
              <User className="h-4 w-4" /> Add a ward
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="card p-6 space-y-5">
            <h2 className="text-base font-semibold text-ink-900">Application details</h2>
            {error && (
              <div className="rounded-xl bg-rose-50 ring-1 ring-rose-100 p-3 flex items-start gap-2 text-sm text-rose-700">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="ward" className="label mb-0">
                  Select child
                </label>

                <Link
                  to={`/portal/wards/new?next=/apply/${slug}`}
                  className="text-sm font-medium text-brand-700 hover:underline"
                >
                  + Add child
                </Link>
              </div>

              <select
                id="ward"
                className="input"
                required
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
              >
                <option value="">Choose a child...</option>

                {wards.map((w) => (
                  <option key={w.id} value={w.id}>
                    {`${w.first_name} ${w.last_name} • DOB: ${formatLongDate(
                      w.date_of_birth
                    )}`}
                  </option>
                ))}
              </select>

              {selectedWard && (
                <div className="mt-3 rounded-xl border border-brand-100 bg-brand-50 p-4">
                  {(() => {
                    const ward = wards.find((w) => w.id === selectedWard);

                    if (!ward) return null;

                    return (
                      <div className="flex items-center gap-3">
                        <div className="grid h-12 w-12 place-items-center rounded-full bg-brand-100 text-brand-700 font-semibold text-lg">
                          {ward.first_name[0]}
                          {ward.last_name[0]}
                        </div>

                        <div>
                          <p className="font-semibold text-ink-900">
                            {ward.first_name} {ward.last_name}
                          </p>

                          <p className="text-sm text-ink-500">
                            Date of Birth: {formatLongDate(ward.date_of_birth)}
                          </p>

                          {ward.gender && (
                            <p className="text-sm text-ink-500">
                              Gender:{" "}
                              {ward.gender.charAt(0).toUpperCase() +
                                ward.gender.slice(1)}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div>
              <label className="label">Class applying for</label>
              <select className="input" required value={classId} onChange={(e) => setClassId(e.target.value)}>
                <option value="">Select a class…</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div>
              <label className="label">Academic session</label>
              <select className="input" value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
                <option value="">Select session…</option>
                {sessions.map((s) => <option key={s.id} value={s.id}>{s.name}{s.is_current ? " (current)" : ""}</option>)}
              </select>
            </div>

            <div className="rounded-xl bg-ink-50 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-brand-600" />
                  <span className="text-sm font-semibold text-ink-900">Application fee</span>
                </div>
                <span className="text-lg font-bold text-ink-950">{formatMoney(school.application_fee, school.currency)}</span>
              </div>
              <p className="mt-2 text-xs text-ink-500">This fee is required to submit your application to {school.name}. You'll pay securely via the school's payment processor.</p>
            </div>

            <Button type="submit" loading={submitting || paying} className="w-full">
              {paying ? "Processing payment…" : submitting ? "Submitting…" : <>Pay {formatMoney(school.application_fee, school.currency)} & submit <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <p className="text-center text-xs text-ink-400">By submitting, you confirm the information is accurate. The school will review your application.</p>
          </form>
        )}
      </div>
    </div>
  );
}