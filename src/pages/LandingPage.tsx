import { Link } from "../lib/router";
import { Logo } from "../components/ui";
import {
  GraduationCap,
  Building2,
  Users,
  ShieldCheck,
  CreditCard,
  FileText,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  School,
} from "lucide-react";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-ink-50">
      <Header />
      <Hero />
      <Stats />
      <Flow />
      <ForSchools />
      <ForParents />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-40 glass border-b border-ink-100">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/"><Logo withText /></Link>
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-600">
          <a href="#how-it-works" className="hover:text-ink-900 transition">How it works</a>
          <a href="#schools" className="hover:text-ink-900 transition">For schools</a>
          <a href="#parents" className="hover:text-ink-900 transition">For parents</a>
          <a href="#pricing" className="hover:text-ink-900 transition">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login" className="btn-ghost hidden sm:inline-flex">Sign in</Link>
          <Link to="/apply" className="btn-primary">
            Apply now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-32 -right-24 h-96 w-96 rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute top-40 -left-24 h-80 w-80 rounded-full bg-ocean-200/40 blur-3xl" />
      </div>
      <div className="container-page grid lg:grid-cols-2 gap-10 items-center py-16 lg:py-24">
        <div className="animate-slide-up">
          <span className="badge bg-brand-100 text-brand-700 mb-5">
            <Sparkles className="h-3.5 w-3.5" /> Multi-tenant SaaS for schools
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-ink-950 text-balance">
            From application to admission, <span className="text-brand-700">in one place.</span>
          </h1>
          <p className="mt-5 text-lg text-ink-600 max-w-xl">
            Klasroom is the modern school management platform by 937 Limited. Parents
            apply to any Klasroom school with one login. Schools review, assess, and
            enroll — with payments, documents, results, and communication built in.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/apply" className="btn-primary px-5 py-3 text-base">
              Find a school & apply <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/schools/register" className="btn-secondary px-5 py-3 text-base">
              <Building2 className="h-4 w-4" /> Onboard your school
            </Link>
          </div>
          <div className="mt-8 flex items-center gap-5 text-xs text-ink-500">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-brand-600" /> Secure payments</span>
            <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-brand-600" /> One parent login, many wards</span>
            <span className="inline-flex items-center gap-1.5"><School className="h-4 w-4 text-brand-600" /> Multiple schools</span>
          </div>
        </div>
        <div className="relative animate-scale-in">
          <div className="card p-5 rotate-1 hover:rotate-0 transition-transform duration-500">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-brand-700 text-white grid place-items-center font-bold">C</div>
                <div>
                  <p className="text-sm font-semibold">Crestfield International</p>
                  <p className="text-xs text-ink-500">Application · JSS 1</p>
                </div>
              </div>
              <span className="badge bg-brand-100 text-brand-700">Approved</span>
            </div>
            <div className="mt-4 space-y-2">
              {["Application submitted", "Application fee paid", "Assessment scheduled", "Entrance exam passed", "Documents approved", "School fees paid", "Enrolled · KLS/2026/A4R2"].map((s, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-brand-600" />
                  <span className={i === 6 ? "font-semibold text-brand-700" : "text-ink-700"}>{s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="absolute -bottom-5 -left-5 card p-4 -rotate-2 w-52 hidden sm:block">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-brand-600" />
              <p className="text-xs font-semibold">Receipt</p>
            </div>
            <p className="mt-2 text-2xl font-bold">₦75,000</p>
            <p className="text-xs text-ink-500">Acceptance fee · paid</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats = [
    { n: "3", l: "Schools onboarded" },
    { n: "1", l: "Parent login, many wards" },
    { n: "14", l: "Admission stages managed" },
    { n: "100%", l: "Paperless, from apply to enroll" },
  ];
  return (
    <section className="border-y border-ink-100 bg-white">
      <div className="container-page grid grid-cols-2 md:grid-cols-4 gap-6 py-10">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <p className="text-3xl font-extrabold text-brand-700">{s.n}</p>
            <p className="mt-1 text-xs text-ink-500">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Flow() {
  const steps = [
    { icon: Users, t: "Parent registers", d: "One account. Verify email, then log in to manage all your children across every Klasroom school." },
    { icon: FileText, t: "Apply to a school", d: "Pick a school, add your child's details and chosen class, pay the application fee." },
    { icon: CreditCard, t: "Assessment & exam", d: "On approval, pay the assessment fee. Sit the entrance exam on the scheduled date." },
    { icon: ShieldCheck, t: "Documents & acceptance", d: "Pass the exam, pay acceptance fee, upload clear documents for the school to review." },
    { icon: GraduationCap, t: "Enrolled", d: "Pay school fees, get a registration number and class. Track results, attendance, and more." },
  ];
  return (
    <section id="how-it-works" className="py-20">
      <div className="container-page">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-brand-700 uppercase tracking-wider">The journey</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink-950">Every step, handled.</h2>
          <p className="mt-3 text-ink-600">A complete pipeline from first click to first day of school — for parents and schools alike.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-5 gap-5">
          {steps.map((s, i) => (
            <div key={s.t} className="card card-hover p-5">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                  <s.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-bold text-ink-300">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-ink-900">{s.t}</h3>
              <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ForSchools() {
  const items = [
    { icon: Building2, t: "Multi-tenant, your brand", d: "Your school is a tenant with your logo, fees, classes, and sessions. Parents find you on /apply." },
    { icon: FileText, t: "Review applications", d: "Approve or reject applications. Schedule exams, record results, review documents." },
    { icon: CreditCard, t: "Your own payments", d: "Connect your payment processor account. Every fee payment lands in your account." },
    { icon: Users, t: "Student lifecycle", d: "Assign registration numbers and classes, record attendance, publish results, respond to parent requests." },
  ];
  return (
    <section id="schools" className="py-20 bg-white border-y border-ink-100">
      <div className="container-page grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-sm font-semibold text-brand-700 uppercase tracking-wider">For schools</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink-950">Run admissions like a modern SaaS.</h2>
          <p className="mt-3 text-ink-600">Join Klasroom and turn your admissions office paperless. Parents apply online, you review in a clean dashboard, and every payment is tracked end-to-end.</p>
          <div className="mt-8 space-y-5">
            {items.map((s) => (
              <div key={s.t} className="flex gap-4">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-ink-900">{s.t}</h3>
                  <p className="mt-0.5 text-sm text-ink-500">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/schools/register" className="btn-primary mt-8 px-5 py-3">
            <Building2 className="h-4 w-4" /> Register your school
          </Link>
        </div>
        <div className="card p-6 bg-gradient-to-br from-ink-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-lg bg-brand-700 text-white grid place-items-center font-bold">H</div>
              <div>
                <p className="text-sm font-semibold">Hilltop Academy</p>
                <p className="text-xs text-ink-500">Admin dashboard</p>
              </div>
            </div>
            <span className="badge bg-gold-100 text-gold-700">Trial</span>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3 text-center">
            {[["12", "New"], ["5", "Review"], ["38", "Enrolled"]].map(([n, l]) => (
              <div key={l} className="rounded-xl bg-white ring-1 ring-ink-100 p-3">
                <p className="text-xl font-bold text-ink-900">{n}</p>
                <p className="text-xs text-ink-500">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {["Tunde A. — JSS 1 — Pending review", "Mary O. — Primary 5 — Docs submitted", "Chika E. — Year 7 — Exam passed"].map((r, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-white ring-1 ring-ink-100 px-3 py-2.5">
                <span className="text-xs text-ink-700">{r}</span>
                <ArrowRight className="h-3.5 w-3.5 text-ink-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ForParents() {
  return (
    <section id="parents" className="py-20">
      <div className="container-page grid lg:grid-cols-2 gap-12 items-center">
        <div className="order-2 lg:order-1 card p-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-brand-100 text-brand-700 grid place-items-center font-semibold">AO</div>
            <div>
              <p className="text-sm font-semibold">Adeola Okafor</p>
              <p className="text-xs text-ink-500">2 children · 2 schools · 1 login</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            <div className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-4">
              <div className="flex justify-between">
                <p className="text-sm font-semibold text-brand-800">Tunde · Crestfield</p>
                <span className="badge bg-brand-100 text-brand-700">Enrolled</span>
              </div>
              <p className="text-xs text-ink-600 mt-1">JSS 1 · Reg No KLS/2026/A4R2</p>
            </div>
            <div className="rounded-xl bg-white ring-1 ring-ink-100 p-4">
              <div className="flex justify-between">
                <p className="text-sm font-semibold">Mary · Hilltop</p>
                <span className="badge bg-gold-100 text-gold-700">Docs review</span>
              </div>
              <p className="text-xs text-ink-600 mt-1">Primary 5 · awaiting document approval</p>
            </div>
          </div>
          <Link to="/portal" className="btn-secondary mt-5 w-full justify-center">
            Open parent portal <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="order-1 lg:order-2">
          <p className="text-sm font-semibold text-brand-700 uppercase tracking-wider">For parents</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink-950">One login. Every child. Every school.</h2>
          <p className="mt-3 text-ink-600">Just like switching organizations in your favorite SaaS tool — switch between your children across different Klasroom schools without ever logging in again.</p>
          <div className="mt-8 space-y-3">
            {[
              "Apply to any Klasroom school and track the full admission pipeline",
              "Pay application, assessment, acceptance, and school fees online",
              "Download receipts as PDF and keep a full payment history",
              "View results, attendance, and send complaints or requests",
              "Add more wards anytime — your account scales with your family",
            ].map((t) => (
              <div key={t} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand-600 shrink-0 mt-0.5" />
                <span className="text-sm text-ink-700">{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    { name: "Starter", price: "Free", per: "during trial", features: ["Up to 50 students", "Applications & admissions", "Payments & receipts", "Parent portal"], cta: "Start trial", to: "/schools/register", featured: false },
    { name: "Growth", price: "₦25,000", per: "per term", features: ["Up to 500 students", "Everything in Starter", "Results & attendance", "Custom fees & classes", "Email receipts"], cta: "Choose Growth", to: "/schools/register", featured: true },
    { name: "Enterprise", price: "Custom", per: "talk to us", features: ["Unlimited students", "Everything in Growth", "Multiple campuses", "Priority support", "Custom branding"], cta: "Contact sales", to: "/schools/register", featured: false },
  ];
  return (
    <section id="pricing" className="py-20 bg-white border-t border-ink-100">
      <div className="container-page">
        <div className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-brand-700 uppercase tracking-wider">Pricing</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-extrabold text-ink-950">Simple, per-term pricing for schools.</h2>
          <p className="mt-3 text-ink-600">Parents never pay Klasroom. Schools subscribe — just like Zoho Books, but for education.</p>
        </div>
        <div className="mt-12 grid md:grid-cols-3 gap-5 items-start">
          {plans.map((p) => (
            <div key={p.name} className={`card p-6 ${p.featured ? "ring-2 ring-brand-500 shadow-lift" : ""} relative`}>
              {p.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 badge bg-brand-600 text-white">Most popular</span>
              )}
              <p className="text-sm font-semibold text-ink-500">{p.name}</p>
              <p className="mt-3 text-3xl font-extrabold text-ink-950">{p.price}</p>
              <p className="text-xs text-ink-500">{p.per}</p>
              <ul className="mt-5 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-ink-700">
                    <CheckCircle2 className="h-4 w-4 text-brand-600 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Link to={p.to} className={`mt-6 w-full justify-center ${p.featured ? "btn-primary" : "btn-secondary"}`}>
                {p.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="py-20">
      <div className="container-page">
        <div className="rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-8 py-14 text-center text-white relative overflow-hidden">
          <div className="absolute -top-20 -right-10 h-60 w-60 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-brand-400/30 blur-2xl" />
          <h2 className="text-3xl sm:text-4xl font-extrabold relative">Ready to modernize admissions?</h2>
          <p className="mt-3 text-brand-100 max-w-xl mx-auto relative">Join Klasroom today. Parents apply in minutes, schools manage in a dashboard.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3 relative">
            <Link to="/apply" className="btn bg-white text-brand-800 hover:bg-brand-50 px-5 py-3">
              Apply to a school <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/schools/register" className="btn bg-brand-600 text-white hover:bg-brand-500 px-5 py-3 ring-1 ring-white/30">
              Onboard your school
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-100 bg-white">
      <div className="container-page py-10 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <Logo withText />
          <p className="mt-3 text-sm text-ink-500 max-w-sm">The modern school management platform. From application to admission — and everything after.</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">Product</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li><Link to="/apply" className="hover:text-ink-900">Find a school</Link></li>
            <li><Link to="/schools/register" className="hover:text-ink-900">Onboard a school</Link></li>
            <li><Link to="/login" className="hover:text-ink-900">Sign in</Link></li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-900">Company</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li>937 Limited</li>
            <li>Klasroom</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100 py-5 text-center text-xs text-ink-400">
        © {new Date().getFullYear()} 937 Limited. Klasroom product. All rights reserved.
      </div>
    </footer>
  );
}
