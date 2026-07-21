import { Link } from "../../lib/router";
import { useParentData } from "../../lib/useParentData";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { supabase } from "../../lib/supabase";
import { notifyParent } from "../../lib/notify";
import { EmptyState, Badge, Button, Modal } from "../../components/ui";
import { COMPLAINT_CATEGORIES } from "../../lib/status";
import { formatDate, relativeTime } from "../../lib/format";
import { MessageSquare, Plus, Send, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import type { Complaint } from "../../lib/types";

export function ComplaintsPage() {
  const data = useParentData();
  const { user } = useAuth();
  const toast = useToast();
  const [complaints, setComplaints] = useState<(Complaint & { school?: { name: string } })[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "complaint", message: "", schoolId: "", wardId: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: c } = await supabase.from("complaints").select("*").eq("parent_id", user.id).order("created_at", { ascending: false });
    const schoolMap = new Map(data.allSchools.map((s) => [s.id, { name: s.name }]));
    setComplaints(((c as Complaint[]) ?? []).map((x) => ({ ...x, school: schoolMap.get(x.school_id) })));
  };

  useEffect(() => { load(); }, [user, data.allSchools]);

  const submit = async () => {
    if (!user || !form.schoolId || !form.subject || !form.message) {
      toast({ kind: "error", title: "Please fill all fields" });
      return;
    }
    setSaving(true);
    const ward = data.wards.find((w) => w.id === form.wardId);
    const { error } = await supabase.from("complaints").insert({
      parent_id: user.id,
      ward_id: form.wardId || null,
      school_id: form.schoolId,
      subject: form.subject,
      category: form.category as Complaint["category"],
      message: form.message,
    });
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Could not send", message: error.message }); return; }
    toast({ kind: "success", title: "Sent", message: "Your complaint has been sent to the school." });
    setOpen(false);
    setForm({ subject: "", category: "complaint", message: "", schoolId: "", wardId: "" });
    load();
  };

  if (data.loading) return null;

  // Schools the parent has interacted with (from applications/enrollments)
  const parentSchools = Array.from(new Set(
    data.contexts.flatMap((c) => [...c.applications, ...c.enrollments].map((x) => x.school).filter(Boolean))
  )) as { id: string; name: string }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Complaints & reports</h1>
          <p className="text-sm text-ink-500 mt-0.5">Send a complaint, report a teacher, or raise an issue with a school.</p>
        </div>
        {parentSchools.length > 0 && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New</Button>}
      </div>

      {parentSchools.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-7 w-7" />} title="No schools yet" description="Apply to a school first, then you can send complaints to them." />
      ) : complaints.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-7 w-7" />} title="No complaints" description="You haven't sent any complaints yet."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New complaint</Button>} />
      ) : (
        <div className="space-y-3">
          {complaints.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink-900">{c.subject}</p>
                    <Badge tone="ocean">{c.category.replace("_", " ")}</Badge>
                    <Badge tone={c.status === "resolved" || c.status === "closed" ? "brand" : c.status === "in_progress" ? "gold" : "rose"}>{c.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">{c.school?.name} · {relativeTime(c.created_at)}</p>
                  <p className="text-sm text-ink-700 mt-3 whitespace-pre-wrap">{c.message}</p>
                  {c.school_response && (
                    <div className="mt-3 rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3">
                      <p className="text-xs font-semibold text-brand-800">School response</p>
                      <p className="text-sm text-brand-900 mt-1 whitespace-pre-wrap">{c.school_response}</p>
                      <p className="text-[10px] text-brand-600 mt-1">{formatDate(c.responded_at)}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal open={true} onClose={() => setOpen(false)} title="New complaint" size="md">
          <div className="space-y-4">
            <div>
              <label className="label">School</label>
              <select className="input" value={form.schoolId} onChange={(e) => setForm({ ...form, schoolId: e.target.value })}>
                <option value="">Select school…</option>
                {parentSchools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Ward (optional)</label>
              <select className="input" value={form.wardId} onChange={(e) => setForm({ ...form, wardId: e.target.value })}>
                <option value="">—</option>
                {data.wards.map((w) => <option key={w.id} value={w.id}>{w.first_name} {w.last_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {COMPLAINT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Subject</label>
              <input className="input" placeholder="Brief subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea className="input min-h-28" placeholder="Describe the issue…" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <Button onClick={submit} loading={saving} className="w-full"><Send className="h-4 w-4" /> Send to school</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
