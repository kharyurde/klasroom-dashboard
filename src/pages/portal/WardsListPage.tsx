import { useRouter, Link } from "../../lib/router";
import { useParentData } from "../../lib/useParentData";
import { Avatar, Badge, EmptyState, Spinner } from "../../components/ui";
import { formatDate } from "../../lib/format";
import { Plus, Users, FileText, GraduationCap, ArrowRight, Droplet, HeartPulse } from "lucide-react";


function ageFromDob(dob: string | null): string | null {
  if (!dob) return null;
  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  const hasHadBirthdayThisYear =
    now.getMonth() > birth.getMonth() ||
    (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
  if (!hasHadBirthdayThisYear) years -= 1;
  return years >= 0 ? `${years} yr${years === 1 ? "" : "s"} old` : null;
}

export function WardsListPage() {
  const data = useParentData();
  const { navigate } = useRouter();

  if (data.loading) {
    return (
      <div className="grid place-items-center py-24">
        <Spinner className="text-brand-600" size={32} />
      </div>
    );
  }

  const openWard = (wardId: string) => {
    data.setActiveWardId(wardId);
    navigate(`/portal?ward=${wardId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Your wards</h1>
          <p className="text-sm text-ink-500 mt-0.5">
            {data.wards.length} child{data.wards.length === 1 ? "" : "ren"} linked to your account
          </p>
        </div>
        <Link to="/portal/wards/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Ward
        </Link>
      </div>

      {data.contexts.length === 0 ? (
        <EmptyState
          icon={<Users className="h-7 w-7" />}
          title="No wards yet"
          description="Add your first child to start an application at any Klasroom school."
          action={
            <Link to="/portal/wards/new" className="btn-primary">
              <Plus className="h-4 w-4" /> Add your first ward
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.contexts.map(({ ward, applications, enrollments }) => {
            const age = ageFromDob(ward.date_of_birth);
            const activeEnrollment = enrollments.find((e) => e.status === "active");
            const activeApplication = applications.find(
              (a) => !["enrolled", "rejected", "withdrawn"].includes(a.status)
            );
            return (
              <button
                key={ward.id}
                onClick={() => openWard(ward.id)}
                className={`card card-hover text-left p-5 transition ${ward.id === data.activeWardId ? "ring-2 ring-brand-500" : ""
                  }`}
              >
                <div className="flex items-start gap-3">
                  <Avatar name={`${ward.first_name} ${ward.last_name}`} src={ward.photo_url} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold text-ink-900 truncate">
                      {ward.first_name} {ward.last_name}
                    </p>
                    <p className="text-xs text-ink-500 mt-0.5">
                      {age ?? "DOB not set"}
                      {ward.gender && <> · {ward.gender[0].toUpperCase()}{ward.gender.slice(1)}</>}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-ink-300 shrink-0 mt-1" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {activeEnrollment ? (
                    <Badge tone="brand">
                      <GraduationCap className="h-3 w-3" /> {activeEnrollment.school?.name ?? "Enrolled"}
                    </Badge>
                  ) : activeApplication ? (
                    <Badge tone="ocean">
                      <FileText className="h-3 w-3" /> Application in progress
                    </Badge>
                  ) : (
                    <Badge tone="neutral">No active application</Badge>
                  )}
                  {ward.blood_group && (
                    <Badge tone="rose">
                      <Droplet className="h-3 w-3" /> {ward.blood_group}
                    </Badge>
                  )}
                </div>

                {ward.medical_notes && (
                  <p className="mt-3 flex items-start gap-1.5 text-xs text-ink-500">
                    <HeartPulse className="h-3.5 w-3.5 mt-0.5 shrink-0 text-ink-400" />
                    <span className="line-clamp-2">{ward.medical_notes}</span>
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-ink-100 flex items-center justify-between text-xs text-ink-500">
                  <span>Added {formatDate(ward.created_at)}</span>
                  <span>
                    {applications.length} app{applications.length === 1 ? "" : "s"} · {enrollments.length} enrolled
                  </span>
                </div>
              </button>
            );
          })}

          <Link
            to="/portal/wards/new"
            className="card border-2 border-dashed border-ink-200 bg-transparent shadow-none p-5 flex flex-col items-center justify-center gap-2 text-center hover:border-brand-300 hover:bg-brand-50/40 transition"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand-100 text-brand-700">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-semibold text-ink-800">Add another ward</p>
          </Link>
        </div>
      )}
    </div>
  );
}