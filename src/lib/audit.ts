import { supabase } from "./supabase";
import type { AuditLog } from "./types";

export type { AuditLog };

export type AuditedTable = "payments" | "fee_charges" | "applications" | "enrollments" | "wards" | "school_admins";

export async function fetchAuditLogs(
  schoolId: string,
  opts?: { table?: AuditedTable; limit?: number },
): Promise<AuditLog[]> {
  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.table) query = query.eq("table_name", opts.table);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as AuditLog[]) ?? [];
}

/** A one-line human summary of what changed, without dumping the raw JSON diff. */
export function summarizeChange(log: AuditLog): string {
  if (log.action === "INSERT") return "Created record";
  if (log.action === "DELETE") return "Deleted record";
  if (!log.old_data || !log.new_data) return "Updated record";
  const changed = Object.keys(log.new_data).filter((key) => {
    if (key === "updated_at") return false;
    return JSON.stringify(log.new_data![key]) !== JSON.stringify(log.old_data![key]);
  });
  if (changed.length === 0) return "Updated record";
  if (changed.length <= 3) return `Changed ${changed.map(prettyField).join(", ")}`;
  return `Changed ${changed.length} fields`;
}

function prettyField(key: string): string {
  return key.replace(/_/g, " ");
}

export const AUDIT_TABLE_LABELS: Record<AuditedTable, string> = {
  payments: "Payments",
  fee_charges: "Fee charges",
  applications: "Applications",
  enrollments: "Enrollments",
  wards: "Wards",
  school_admins: "Staff accounts",
};
