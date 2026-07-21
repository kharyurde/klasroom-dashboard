import { useAdminData } from "../../lib/useAdminData";
import { useToast } from "../../lib/toast";
import { supabase } from "../../lib/supabase";
import { notifyParent } from "../../lib/notify";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { formatDate, relativeTime } from "../../lib/format";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import type { Complaint } from "../../lib/types";

export function AdminComplaintsPage() {
  const data = useAdminData();
  const toast = useToast();
  const [active, setActive] = useState<Complaint | null>(null);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<"open" | "in_progress" | "resolved" | "closed">("open");
  const [saving, setSaving] = useState(false);

  const respond = async () => {
    if (!active) return;
    setSaving(true);
    const { error } = await supabase.from("complaints").update({
      school_response: response, status, responded_at: new Date().toISOString(),
    }).eq("id", active.id);
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    if (response) await notifyParent(active.parent_id, "School responded to your complaint", `Subject: ${active.subject}. Status: ${status}.`, "complaint", `/portal/complaints`);
    toast({ kind: "success", title: "Response sent" });
    setActive(null); setResponse(""); setStatus("open");
    data.reload();
  };

  if (data.loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Complaints</h1>
        <p className="text-sm text-ink-500 mt-0.5">Complaints, teacher reports, and issues from parents.</p>
      </div>

      {data.complaints.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-7 w-7" />} title="No complaints" description="Parent complaints and reports will appear here." />
      ) : (
        <div className="space-y-3">
          {data.complaints.map((c) => (
            <div key={c.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink-900">{c.subject}</p>
                    <Badge tone="ocean">{c.category.replace("_", " ")}</Badge>
                    <Badge tone={c.status === "resolved" || c.status === "closed" ? "brand" : c.status === "in_progress" ? "gold" : "rose"}>{c.status.replace("_", " ")}</Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">{relativeTime(c.created_at)}</p>
                  <p className="text-sm text-ink-700 mt-3 whitespace-pre-wrap">{c.message}</p>
                  {c.school_response && (
                    <div className="mt-3 rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3">
                      <p className="text-xs font-semibold text-brand-800">Your response</p>
                      <p className="text-sm text-brand-900 mt-1 whitespace-pre-wrap">{c.school_response}</p>
                      <p className="text-[10px] text-brand-600 mt-1">{formatDate(c.responded_at)}</p>
                    </div>
                  )}
                </div>
                <Button variant="secondary" className="text-xs shrink-0" onClick={() => { setActive(c); setResponse(c.school_response ?? ""); setStatus(c.status); }}>
                  {c.school_response ? "Update" : "Respond"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!active} onClose={() => setActive(null)} title="Respond to complaint" size="md">
        {active && (
          <div className="space-y-4">
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="text-sm font-semibold text-ink-900">{active.subject}</p>
              <p className="text-xs text-ink-500 mt-1">{active.message}</p>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="open">Open</option>
                <option value="in_progress">In progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div>
              <label className="label">Response</label>
              <textarea className="input min-h-28" placeholder="Write your response to the parent…" value={response} onChange={(e) => setResponse(e.target.value)} />
            </div>
            <Button onClick={respond} loading={saving} className="w-full"><Send className="h-4 w-4" /> Send response</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
