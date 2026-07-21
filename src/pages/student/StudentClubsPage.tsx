import { useState } from "react";
import { useStudentData } from "../../lib/useStudentData";
import { useToast } from "../../lib/toast";
import { useAuth } from "../../lib/auth";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState } from "../../components/ui";
import { Sparkles, Users, Check, Calendar } from "lucide-react";

export function StudentClubsPage() {
  const data = useStudentData();
  const toast = useToast();
  const { user } = useAuth();
  const [joining, setJoining] = useState<string | null>(null);

  if (data.loading) return null;

  const join = async (clubId: string) => {
    if (!user) return;
    setJoining(clubId);
    const { error } = await supabase.from("club_members").insert({
      club_id: clubId, student_id: user.id, school_id: data.school!.id, role: "member",
    });
    setJoining(null);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Joined club!" });
    data.reload();
  };

  const leave = async (clubId: string) => {
    if (!user || !confirm("Leave this club?")) return;
    const { error } = await supabase.from("club_members").delete().eq("club_id", clubId).eq("student_id", user.id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Left club" }); data.reload(); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Clubs & Activities</h1>
        <p className="text-sm text-ink-500 mt-0.5">{data.myClubs.length} joined · {data.clubs.length} available at {data.school?.name}</p>
      </div>

      {data.myClubs.length > 0 && (
        <div className="card">
          <div className="border-b border-ink-100 px-5 py-4 flex items-center gap-2">
            <Check className="h-5 w-5 text-brand-600" />
            <h2 className="text-base font-semibold text-ink-900">My clubs ({data.myClubs.length})</h2>
          </div>
          <div className="divide-y divide-ink-100">
            {data.myClubs.map((c) => {
              const info = data.clubs.find((x) => x.id === c.id);
              return (
                <div key={c.id} className="flex items-start gap-3 px-5 py-4">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                    {c.description && <p className="text-xs text-ink-600 mt-1 line-clamp-2">{c.description}</p>}
                    <div className="mt-1 flex items-center gap-3 text-xs text-ink-500">
                      {c.meeting_day && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {c.meeting_day}{c.meeting_time ? ` · ${c.meeting_time}` : ""}</span>}
                      {info && <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {info.memberCount}</span>}
                    </div>
                  </div>
                  <Button variant="secondary" className="text-xs" onClick={() => leave(c.id)}>Leave</Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.clubs.length === 0 ? (
        <EmptyState icon={<Sparkles className="h-7 w-7" />} title="No clubs yet" description="Your school hasn't set up any clubs or societies yet." />
      ) : (
        <div className="card">
          <div className="border-b border-ink-100 px-5 py-4">
            <h2 className="text-base font-semibold text-ink-900">All clubs ({data.clubs.length})</h2>
          </div>
          <div className="divide-y divide-ink-100">
            {data.clubs.map((c) => (
              <div key={c.id} className="flex items-start gap-3 px-5 py-4">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-ocean-100 text-ocean-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{c.name}</p>
                  {c.description && <p className="text-xs text-ink-600 mt-1 line-clamp-2">{c.description}</p>}
                  <div className="mt-1 flex items-center gap-3 text-xs text-ink-500">
                    {c.meeting_day && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {c.meeting_day}{c.meeting_time ? ` · ${c.meeting_time}` : ""}</span>}
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.memberCount}</span>
                  </div>
                </div>
                {c.isMember ? (
                  <Badge tone="brand">Joined</Badge>
                ) : (
                  <Button onClick={() => join(c.id)} loading={joining === c.id} className="text-xs">Join</Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
