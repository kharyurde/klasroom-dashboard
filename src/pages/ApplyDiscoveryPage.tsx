import { useEffect, useMemo, useState } from "react";
import { Link, useRouter } from "../lib/router";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { Logo, Button, Spinner, Badge, EmptyState } from "../components/ui";
import { Search, MapPin, ArrowRight, GraduationCap, Building2, CheckCircle2 } from "lucide-react";
import { formatMoney } from "../lib/format";
import type { School } from "../lib/types";

export function ApplyDiscoveryPage() {
  const { user } = useAuth();
  const { navigate } = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("schools")
      .select("*")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        setSchools((data as School[]) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return schools;
    return schools.filter((s) =>
      [s.name, s.city, s.state, s.tagline].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [schools, q]);

  const startApply = (school: School) => {
    if (!user || user.userType !== "parent") {
      navigate("/register?next=/apply/" + school.slug);
      return;
    }
    if (!user.emailConfirmed) {
      navigate("/verify-email?email=" + encodeURIComponent(user.email));
      return;
    }
    navigate("/apply/" + school.slug);
  };

  return (
    <div className="min-h-screen bg-ink-50">
      <header className="sticky top-0 z-40 glass border-b border-ink-100">
        <div className="container-page flex h-16 items-center justify-between">
          <Link to="/"><Logo withText /></Link>
          <div className="flex items-center gap-2">
            {user ? (
              <Link to={user.userType === "school_admin" ? "/admin" : "/portal"} className="btn-secondary">
                Go to portal
              </Link>
            ) : (
              <>
                <Link to="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
                <Link to="/register" className="btn-primary">Create account</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-ink-100 bg-white">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-brand-100/60 blur-3xl" />
        <div className="container-page py-14 relative">
          <div className="max-w-2xl">
            <Badge tone="brand" className="mb-4"><GraduationCap className="h-3.5 w-3.5" /> Find a Klasroom school</Badge>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink-950 text-balance">Apply to leading schools in minutes.</h1>
            <p className="mt-3 text-ink-600">Browse schools using Klasroom, pick a class, and start the application. One parent account works across every school here.</p>
          </div>
          <div className="mt-6 relative max-w-xl">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-400" />
            <input
              className="input pl-11 py-3 text-base shadow-soft"
              placeholder="Search by school name, city or state…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      </section>

      <main className="container-page py-10">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner className="text-brand-600" size={28} /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<Building2 className="h-7 w-7" />} title="No schools found" description="Try a different search term, or check back soon as more schools join Klasroom." />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s) => (
              <SchoolCard key={s.id} school={s} onApply={() => startApply(s)} />
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-ink-100 bg-white py-8 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} 937 Limited · Klasroom
      </footer>
    </div>
  );
}

function SchoolCard({ school, onApply }: { school: School; onApply: () => void }) {
  return (
    <div className="card card-hover overflow-hidden flex flex-col">
      <div className="h-28 bg-gradient-to-br from-brand-700 to-brand-900 relative">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "16px 16px" }} />
        <div className="absolute -bottom-6 left-5 h-14 w-14 rounded-2xl bg-white shadow-lift grid place-items-center text-2xl font-extrabold text-brand-700 ring-1 ring-ink-100">
          {school.name[0]?.toUpperCase()}
        </div>
      </div>
      <div className="p-5 pt-8 flex-1 flex flex-col">
        <h3 className="text-base font-semibold text-ink-900">{school.name}</h3>
        {school.tagline && <p className="text-xs text-brand-700 font-medium mt-0.5">{school.tagline}</p>}
        {school.description && <p className="mt-2 text-sm text-ink-500 line-clamp-2">{school.description}</p>}
        <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
          <MapPin className="h-3.5 w-3.5" />
          {[school.city, school.state].filter(Boolean).join(", ")}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <FeePill label="Apply" amount={school.application_fee} currency={school.currency} />
          <FeePill label="Assess" amount={school.assessment_fee} currency={school.currency} />
          <FeePill label="Accept" amount={school.acceptance_fee} currency={school.currency} />
        </div>
        <div className="mt-5 flex items-center justify-between">
          <span className="badge bg-brand-100 text-brand-700"><CheckCircle2 className="h-3 w-3" /> Accepting</span>
          <Button onClick={onApply} className="text-xs px-3 py-2">
            Apply <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function FeePill({ label, amount, currency }: { label: string; amount: number; currency: string }) {
  return (
    <div className="rounded-lg bg-ink-50 py-2">
      <p className="text-[10px] uppercase tracking-wider text-ink-400">{label}</p>
      <p className="text-xs font-bold text-ink-800">{formatMoney(amount, currency)}</p>
    </div>
  );
}
