import { useAuth } from "../../lib/auth";
import { Badge } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { Shield, Mail, Building2 } from "lucide-react";

export function PlatformSettingsPage() {
  const { user } = useAuth();
  const admin = user?.profile as any;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-extrabold text-ink-950">Settings</h1>
        <p className="text-sm text-ink-500 mt-0.5">937 Limited platform administration account.</p>
      </div>

      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-ink-900 text-white">
            <Shield className="h-8 w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold text-ink-900 truncate">{admin?.full_name ?? "Platform Admin"}</p>
            <p className="text-xs text-ink-500">{user?.email}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge tone="ink">{admin?.role ?? "admin"}</Badge>
              <span className="text-xs text-ink-400">Since {formatDate(admin?.created_at ?? null)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-base font-semibold text-ink-900 mb-3">Account information</h2>
        <div className="space-y-3 text-sm">
          <Row icon={<Mail className="h-4 w-4" />} label="Email" value={user?.email} />
          <Row icon={<Shield className="h-4 w-4" />} label="Role" value={admin?.role} />
          <Row icon={<Building2 className="h-4 w-4" />} label="Platform" value="Klasroom by 937 Limited" />
        </div>
      </div>

      <div className="card p-5 bg-ink-50">
        <p className="text-xs text-ink-500">
          This is a super-admin account with visibility into all schools, payments, students, and teachers on the Klasroom platform.
          Contact your engineering team to manage additional platform admins or change platform configuration.
        </p>
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
