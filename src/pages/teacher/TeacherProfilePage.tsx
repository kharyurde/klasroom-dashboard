import { useState } from "react";
import { useTeacherData } from "../../lib/useTeacherData";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Button, Badge } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { Save, Mail, Phone, GraduationCap } from "lucide-react";

export function TeacherProfilePage() {
  const data = useTeacherData();
  const { refresh } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ full_name: "", phone: "", qualification: "" });
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (data.loading) return null;
  if (!loaded && data.teacher) {
    setForm({ full_name: data.teacher.full_name, phone: data.teacher.phone ?? "", qualification: data.teacher.qualification ?? "" });
    setLoaded(true);
  }

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("teachers").update({
      full_name: form.full_name, phone: form.phone || null, qualification: form.qualification || null,
    }).eq("id", data.teacher!.id);
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Profile updated" });
    await refresh();
  };

  const t = data.teacher;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Profile</h1>
        <p className="text-sm text-ink-500 mt-0.5">Your teacher profile at {data.school?.name}.</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-brand-100 text-brand-700 text-xl font-bold">
            {t?.full_name?.[0] ?? "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink-900 truncate">{t?.full_name}</p>
            <p className="text-xs text-ink-500">{t?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone={t?.status === "active" ? "brand" : "gold"}>{t?.status}</Badge>
              <span className="text-xs text-ink-400">Joined {formatDate(t?.created_at ?? null)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="text-base font-semibold text-ink-900">Edit profile</h2>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="label">Qualification</label>
            <input className="input" placeholder="B.Ed Mathematics" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
          </div>
        </div>
        <Button onClick={save} loading={saving} className="w-full"><Save className="h-4 w-4" /> Save profile</Button>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-ink-900 mb-3">School information</h2>
        <div className="space-y-2 text-sm">
          <Row icon={<Mail className="h-4 w-4" />} label="School email" value={t?.email} />
          <Row icon={<Phone className="h-4 w-4" />} label="Phone" value={t?.phone} />
          <Row icon={<GraduationCap className="h-4 w-4" />} label="Qualification" value={t?.qualification} />
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink-50 text-ink-500">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-500">{label}</p>
        <p className="text-sm font-medium text-ink-900 truncate">{value || "—"}</p>
      </div>
    </div>
  );
}
