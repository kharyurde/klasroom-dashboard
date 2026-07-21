import { useState } from "react";
import { Link, useRouter } from "../../lib/router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { Button } from "../../components/ui";
import { ArrowLeft, ArrowRight, User, AlertTriangle } from "lucide-react";

export function WardFormPage() {
  const { user } = useAuth();
  const { route, navigate } = useRouter();
  const toast = useToast();
  const next = route.query.get("next");
  const [form, setForm] = useState({
    first_name: "", last_name: "", date_of_birth: "", gender: "male",
    blood_group: "", medical_notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!user) return;
    setLoading(true);
    const { data, error: err } = await supabase
      .from("wards")
      .insert({
        parent_id: user.id,
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        date_of_birth: form.date_of_birth || null,
        gender: form.gender as "male" | "female" | "other",
        blood_group: form.blood_group || null,
        medical_notes: form.medical_notes || null,
      })
      .select()
      .single();
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    toast({ kind: "success", title: "Ward added", message: `${form.first_name} ${form.last_name} added to your account.` });
    if (next) {
      navigate(next + (next.includes("?") ? "&" : "?") + "ward=" + data.id);
    } else {
      navigate("/portal?ward=" + data.id);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/portal" className="inline-flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to portal
      </Link>
      <div className="card p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-700">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-ink-950">Add a ward</h1>
            <p className="text-sm text-ink-500">Tell us about your child. You can apply to any school after this.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-xl bg-rose-50 ring-1 ring-rose-100 p-3 flex items-start gap-2 text-sm text-rose-700">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" /> <span>{error}</span>
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">First name</label>
              <input className="input" placeholder="Tunde" required value={form.first_name}
                onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
            </div>
            <div>
              <label className="label">Last name</label>
              <input className="input" placeholder="Okafor" required value={form.last_name}
                onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Date of birth</label>
              <input type="date" className="input" required value={form.date_of_birth}
                onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
            <div>
              <label className="label">Gender</label>
              <select className="input" value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Blood group (optional)</label>
              <select className="input" value={form.blood_group}
                onChange={(e) => setForm({ ...form, blood_group: e.target.value })}>
                <option value="">Unknown</option>
                {["O+","O-","A+","A-","B+","B-","AB+","AB-"].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Medical notes (optional)</label>
              <input className="input" placeholder="Allergies, conditions…" value={form.medical_notes}
                onChange={(e) => setForm({ ...form, medical_notes: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" loading={loading} className="flex-1">
              {next ? "Continue to application" : "Save ward"} <ArrowRight className="h-4 w-4" />
            </Button>
            <Link to="/portal" className="btn-secondary">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
