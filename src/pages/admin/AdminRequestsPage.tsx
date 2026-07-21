import { useAdminData } from "../../lib/useAdminData";
import { useToast } from "../../lib/toast";
import { supabase } from "../../lib/supabase";
import { notifyParent } from "../../lib/notify";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { relativeTime } from "../../lib/format";
import { ClipboardList, Send } from "lucide-react";
import { useState } from "react";
import type { RequestRow } from "../../lib/types";

export function AdminRequestsPage() {
  const data = useAdminData();
  const toast = useToast();
  const [active, setActive] = useState<RequestRow | null>(null);
  const [response, setResponse] = useState("");
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "fulfilled">("pending");
  const [saving, setSaving] = useState(false);

  const respond = async () => {
    if (!active) return;
    setSaving(true);
    const { error } = await supabase.from("requests").update({
      school_response: response, status,
    }).eq("id", active.id);
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    if (response) await notifyParent(active.parent_id, "Request updated", `Your ${active.type.replace(/_/g, " ")} request is now ${status}.`, "request", `/portal/requests`);
    toast({ kind: "success", title: "Request updated" });
    setActive(null); setResponse(""); setStatus("pending");
    data.reload();
  };

  if (data.loading) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Requests</h1>
        <p className="text-sm text-ink-500 mt-0.5">Parent requests for transcripts, certificates, ID cards and more.</p>
      </div>

      {data.requests.length === 0 ? (
        <EmptyState icon={<ClipboardList className="h-7 w-7" />} title="No requests" description="Parent requests will appear here." />
      ) : (
        <div className="space-y-3">
          {data.requests.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-ink-900">{r.type.replace(/_/g, " ")}</p>
                    <Badge tone={r.status === "fulfilled" || r.status === "approved" ? "brand" : r.status === "rejected" ? "rose" : "gold"}>{r.status}</Badge>
                  </div>
                  <p className="text-xs text-ink-500 mt-1">{relativeTime(r.created_at)}</p>
                  <p className="text-sm text-ink-700 mt-3 whitespace-pre-wrap">{r.details}</p>
                  {r.school_response && (
                    <div className="mt-3 rounded-xl bg-brand-50 ring-1 ring-brand-100 p-3">
                      <p className="text-xs font-semibold text-brand-800">Your response</p>
                      <p className="text-sm text-brand-900 mt-1 whitespace-pre-wrap">{r.school_response}</p>
                    </div>
                  )}
                </div>
                <Button variant="secondary" className="text-xs shrink-0" onClick={() => { setActive(r); setResponse(r.school_response ?? ""); setStatus(r.status); }}>
                  {r.school_response ? "Update" : "Respond"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!active} onClose={() => setActive(null)} title="Respond to request" size="md">
        {active && (
          <div className="space-y-4">
            <div className="rounded-xl bg-ink-50 p-3">
              <p className="text-sm font-semibold text-ink-900">{active.type.replace(/_/g, " ")}</p>
              <p className="text-xs text-ink-500 mt-1">{active.details}</p>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>
            <div>
              <label className="label">Response</label>
              <textarea className="input min-h-28" placeholder="Write your response…" value={response} onChange={(e) => setResponse(e.target.value)} />
            </div>
            <Button onClick={respond} loading={saving} className="w-full"><Send className="h-4 w-4" /> Update request</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
