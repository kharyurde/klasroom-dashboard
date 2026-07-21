import { useEffect, useState } from "react";
import { useAdminData } from "../../lib/useAdminData";
import { useToast } from "../../lib/toast";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { formatDate, genPassword } from "../../lib/format";
import type { Teacher, TeacherAssignmentLink, Subject, ClassLevel } from "../../lib/types";
import { UserCog, Plus, Trash2, Mail, Copy, BookOpen } from "lucide-react";

export function AdminTeachersPage() {
  const data = useAdminData();
  const toast = useToast();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [taLinks, setTaLinks] = useState<TeacherAssignmentLink[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState(false);
  const [assign, setAssign] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", qualification: "" });
  const [taForm, setTaForm] = useState({ subjectId: "", classId: "" });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  const load = async () => {
    if (!data.school) return;
    setLoading(true);
    const [tRes, taRes, sRes] = await Promise.all([
      supabase.from("teachers").select("*").eq("school_id", data.school.id).order("created_at", { ascending: false }),
      supabase.from("teacher_assignments").select("*").eq("school_id", data.school.id),
      supabase.from("subjects").select("*").eq("school_id", data.school.id),
    ]);
    setTeachers((tRes.data as Teacher[]) ?? []);
    setTaLinks((taRes.data as TeacherAssignmentLink[]) ?? []);
    setSubjects((sRes.data as Subject[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [data.school]);

  if (data.loading || loading) return null;

  const openInvite = () => {
    setForm({ full_name: "", email: "", phone: "", qualification: "" });
    setCreated(null);
    setInvite(true);
  };

  const save = async () => {
    if (!data.school || !form.full_name || !form.email) { toast({ kind: "error", title: "Name and email required" }); return; }
    setSaving(true);
    const password = genPassword(10);
    const { data: authData, error } = await supabase.auth.admin.createUser({
      email: form.email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { user_type: "teacher", school_id: data.school.id, full_name: form.full_name, phone: form.phone, qualification: form.qualification },
    });
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    setCreated({ email: form.email.trim().toLowerCase(), password });
    toast({ kind: "success", title: "Teacher account created" });
    load();
  };

  const setStatus = async (t: Teacher, status: Teacher["status"]) => {
    const { error } = await supabase.from("teachers").update({ status }).eq("id", t.id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: `Teacher ${status}` }); load(); }
  };

  const remove = async (t: Teacher) => {
    if (!confirm(`Remove ${t.full_name}? This deletes the teacher's account.`)) return;
    const { error } = await supabase.from("teachers").delete().eq("id", t.id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Teacher removed" }); load(); }
  };

  const openAssign = (t: Teacher) => {
    setAssign(t);
    setTaForm({ subjectId: "", classId: "" });
  };

  const saveAssignment = async () => {
    if (!assign || !taForm.subjectId || !taForm.classId || !data.school) { toast({ kind: "error", title: "Select subject and class" }); return; }
    setSaving(true);
    const { error } = await supabase.from("teacher_assignments").insert({
      teacher_id: assign.id, school_id: data.school.id, subject_id: taForm.subjectId, class_id: taForm.classId,
    });
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Assignment added" });
    setTaForm({ subjectId: "", classId: "" });
    load();
  };

  const removeAssignment = async (id: string) => {
    const { error } = await supabase.from("teacher_assignments").delete().eq("id", id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Teachers</h1>
          <p className="text-sm text-ink-500 mt-0.5">{teachers.length} teacher{teachers.length === 1 ? "" : "s"} at {data.school?.name}.</p>
        </div>
        <Button onClick={openInvite} className="text-xs"><Plus className="h-4 w-4" /> Invite teacher</Button>
      </div>

      {teachers.length === 0 ? (
        <EmptyState icon={<UserCog className="h-7 w-7" />} title="No teachers yet" description="Invite teachers to your school. They'll sign in with their school email." action={<Button onClick={openInvite} className="text-xs"><Plus className="h-4 w-4" /> Invite teacher</Button>} />
      ) : (
        <div className="space-y-3">
          {teachers.map((t) => {
            const links = taLinks.filter((l) => l.teacher_id === t.id);
            return (
              <div key={t.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 text-brand-700 font-semibold shrink-0">
                    {t.full_name?.[0] ?? "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900 truncate">{t.full_name}</p>
                    <p className="text-xs text-ink-500">{t.email} · Joined {formatDate(t.created_at)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <Badge tone={t.status === "active" ? "brand" : t.status === "suspended" ? "rose" : "gold"}>{t.status}</Badge>
                      <span className="text-xs text-ink-400">{links.length} assignment{links.length === 1 ? "" : "s"}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {links.map((l) => {
                        const subj = subjects.find((s) => s.id === l.subject_id);
                        const cls = data.classes.find((c) => c.id === l.class_id);
                        return (
                          <span key={l.id} className="inline-flex items-center gap-1 rounded-full bg-ink-50 px-2 py-0.5 text-[10px] font-medium text-ink-700">
                            {subj?.name ?? "—"} · {cls?.name ?? "—"}
                            <button onClick={() => removeAssignment(l.id)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-2.5 w-2.5" /></button>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="secondary" className="text-xs" onClick={() => openAssign(t)}><BookOpen className="h-3.5 w-3.5" /> Assign</Button>
                    {t.status === "active" ? (
                      <Button variant="secondary" className="text-xs" onClick={() => setStatus(t, "suspended")}>Suspend</Button>
                    ) : (
                      <Button variant="secondary" className="text-xs" onClick={() => setStatus(t, "active")}>Activate</Button>
                    )}
                    <button onClick={() => remove(t)} className="text-ink-400 hover:text-rose-600 p-1"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Invite modal */}
      <Modal open={invite} onClose={() => setInvite(false)} title="Invite teacher">
        {created ? (
          <div className="space-y-4">
            <div className="rounded-xl bg-brand-50 ring-1 ring-brand-100 p-4 space-y-2">
              <p className="text-sm font-semibold text-brand-900">Teacher account created</p>
              <p className="text-xs text-brand-800">Share these credentials with the teacher. They can sign in at the Klasroom login page.</p>
            </div>
            <CredRow icon={<Mail className="h-4 w-4" />} label="Email" value={created.email} />
            <CredRow icon={<Copy className="h-4 w-4" />} label="Temporary password" value={created.password} />
            <Button variant="secondary" className="w-full" onClick={() => setInvite(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label className="label">School email</label>
              <input type="email" className="input" placeholder="teacher@yourschool.edu" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Qualification</label>
                <input className="input" placeholder="B.Ed" value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} />
              </div>
            </div>
            <Button onClick={save} loading={saving} className="w-full">Create teacher account</Button>
          </div>
        )}
      </Modal>

      {/* Assign modal */}
      <Modal open={!!assign} onClose={() => setAssign(null)} title={`Assign class — ${assign?.full_name ?? ""}`}>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Subject</label>
              <select className="input" value={taForm.subjectId} onChange={(e) => setTaForm({ ...taForm, subjectId: e.target.value })}>
                <option value="">Select</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Class</label>
              <select className="input" value={taForm.classId} onChange={(e) => setTaForm({ ...taForm, classId: e.target.value })}>
                <option value="">Select</option>
                {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={saveAssignment} loading={saving} className="w-full">Add assignment</Button>
        </div>
      </Modal>
    </div>
  );
}

function CredRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const toast = useToast();
  const copy = () => { navigator.clipboard?.writeText(value); toast({ kind: "success", title: "Copied" }); };
  return (
    <div className="rounded-xl ring-1 ring-ink-100 p-3">
      <p className="text-xs text-ink-500">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-ink-400">{icon}</span>
        <p className="text-sm font-mono font-medium text-ink-900 flex-1 truncate">{value}</p>
        <button onClick={copy} className="text-ink-400 hover:text-brand-600"><Copy className="h-4 w-4" /></button>
      </div>
    </div>
  );
}
