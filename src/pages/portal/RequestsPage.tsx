import { Link } from "../../lib/router";
import { useParentData } from "../../lib/useParentData";
import { useAuth } from "../../lib/auth";
import { useToast } from "../../lib/toast";
import { supabase } from "../../lib/supabase";
import { EmptyState, Badge, Button, Modal } from "../../components/ui";
import { REQUEST_TYPES } from "../../lib/status";
import { relativeTime, formatDate } from "../../lib/format";
import { ClipboardList, Plus, Send } from "lucide-react";
import { useEffect, useState } from "react";
import type { RequestRow } from "../../lib/types";

export function RequestsPage() {
  const data = useParentData();
  const { user } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState<(RequestRow & { school?: { name: string } })[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "transcript", details: "", schoolId: "", wardId: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data: r } = await supabase.from("requests").select("*").eq("parent_id", user.id).order("created_at", { ascending: false });
    const schoolMap = new Map(data.allSchools.map((s) => [s.id, { name: s.name }]));
    setRequests(((r as RequestRow[]) ?? []).map((x) => ({ ...x, school: schoolMap.get(x.school_id) })));
  };

  useEffect(() => { load(); }, [user, data.allSchools]);

  const submit = async () => {
    if (!user || !form.schoolId || !form.details) {
      toast({ kind: "error", title: "Please fill all fields" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("requests").insert({
      parent_id: user.id,
      ward_id: form.wardId || null,
      school_id: form.schoolId,
      type: form.type as RequestRow["type"],
      details: form.details,
    });
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Could not submit", message: error.message }); return; }
    toast({ kind: "success", title: "Request submitted", message: "The school will respond." });
    setOpen(false);
    setForm({ type: "transcript", details: "", schoolId: "", wardId: "" });
    load();
  };

  if (data.loading) return null;

  const parentSchools = Array.from(new Set(
    data.contexts.flatMap((c) => [...c.applications, ...c.enrollments].map((x) => x.school).filter(Boolean))
  )) as { id: string; name: string }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Requests</h1>
          <p className="text-sm text-ink-500 mt-0.5">Request transcripts, transfer certificates, ID cards and more.</p>
        </div>
        {parentSchools.length > 0 && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New request</Button>}
      </div>

      {parentSchools.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="No schools yet" description="Apply to a school first to make requests." />
      ) : requests.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="No requests" description="You haven't made any requests yet."
          action={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New request</Button>} />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink-900">{r.type.replace(/_/g, " ")}</p>
                    <Badge tone={r.status === "fulfilled" || r.status === "approved" ? "brand" : r.status === "rejected" ? "rose" : "gold"}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">{r.school?.name} · {relativeTime(r.created_at)}</p>
                  <p className="text-sm text-ink-700 mt-3 whitespace-pre-wrap">{r.details}</p>
                  {r.school_response && (
                    <div className="mt-3 rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3">
                      <p className="text-xs font-semibold text-brand-800">School response</p>
                      <p className="text-sm text-brand-900 mt-1 whitespace-pre-wrap">{r.school_response}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal open={true} onClose={() => setOpen(false)} title="New request" size="md">
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
              <label className="label">Request type</label>
              <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {REQUEST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Details</label>
              <textarea className="input min-h-28" placeholder="Provide details for your request…" value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} />
            </div>
            <Button onClick={submit} loading={saving} className="w-full"><Send className="h-4 w-4" /> Submit request</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
