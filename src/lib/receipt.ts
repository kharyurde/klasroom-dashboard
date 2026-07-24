import type { Payment, School, Ward } from "./types";
import type { ApiPayment } from "./paymentsApi";
import { formatMoney, formatDateTime } from "./format";

/**
 * Generates a printable receipt document in a new window.
 * The user can then "Save as PDF" via the browser print dialog (works on desktop and mobile).
 * Also returns an HTML string for in-app preview.
 */
export function receiptHtml(payment: Payment, school: School, ward: Ward): string {
  const rows: [string, string][] = [
    ["Receipt No.", payment.reference ?? payment.id.slice(0, 8).toUpperCase()],
    ["Date Paid", formatDateTime(payment.paid_at ?? payment.created_at)],
    ["Payment For", `${ward.first_name} ${ward.last_name}`],
    ["Fee Type", prettyType(payment.type)],
    ["Description", payment.description ?? "—"],
    ["Method", payment.method ?? "card"],
    ["Status", payment.status.toUpperCase()],
  ];

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Receipt ${payment.reference ?? payment.id}</title>
<style>
  * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; box-sizing: border-box; }
  body { margin:0; color:#1f2530; background:#f6f7f9; }
  .wrap { max-width: 720px; margin: 24px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(15,23,42,.08); }
  .head { background: linear-gradient(135deg,#0f6953,#105445); color:#fff; padding:28px 32px; }
  .head .brand { font-size:20px; font-weight:800; letter-spacing:-.01em; }
  .head .sub { font-size:11px; text-transform:uppercase; letter-spacing:.18em; opacity:.7; margin-top:2px; }
  .head .title { margin-top:18px; font-size:14px; opacity:.9; }
  .head .amt { font-size:34px; font-weight:800; margin-top:4px; }
  .school { padding:20px 32px; border-bottom:1px solid #eceef2; }
  .school .name { font-weight:700; font-size:15px; }
  .school .meta { color:#66778f; font-size:12px; margin-top:4px; }
  .rows { padding:8px 32px 20px; }
  .row { display:flex; justify-content:space-between; gap:16px; padding:10px 0; border-bottom:1px dashed #eceef2; font-size:13px; }
  .row .k { color:#66778f; }
  .row .v { font-weight:600; text-align:right; }
  .foot { padding:16px 32px 28px; color:#8595ac; font-size:11px; text-align:center; }
  .actions { text-align:center; padding:0 32px 28px; }
  .btn { background:#0f6953; color:#fff; border:none; padding:10px 20px; border-radius:10px; font-weight:600; cursor:pointer; font-size:13px; }
  @media print { body { background:#fff; } .wrap { box-shadow:none; margin:0; max-width:100%; } .actions { display:none; } }
</style></head>
<body>
  <div class="wrap">
    <div class="head">
      <div class="brand">Klasroom</div>
      <div class="sub">by 937 Limited</div>
      <div class="title">PAYMENT RECEIPT</div>
      <div class="amt">${formatMoney(payment.amount, payment.currency)}</div>
    </div>
    <div class="school">
      <div class="name">${esc(school.name)}</div>
      <div class="meta">${[school.address, school.city, school.state].filter(Boolean).join(", ")}</div>
      <div class="meta">${esc(school.email ?? "")} ${school.phone ? "· " + esc(school.phone) : ""}</div>
    </div>
    <div class="rows">
      ${rows.map(([k, v]) => `<div class="row"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`).join("")}
    </div>
    <div class="actions">
      <button class="btn" onclick="window.print()">Download / Print PDF</button>
    </div>
    <div class="foot">This is a system-generated receipt from Klasroom. Keep this for your records.</div>
  </div>
</body></html>`;
}

export function downloadReceipt(payment: Payment, school: School, ward: Ward) {
  const html = receiptHtml(payment, school, ward);
  openOrDownload(html, payment.reference ?? payment.id);
}

/**
 * Same receipt template, built from the Express API's payment shape (no ward object
 * needed — the API's `description` already reads like "Application fee for Jane Doe").
 * Used by pages migrated to fetch payments via the API instead of Supabase directly.
 */
export function downloadApiReceipt(payment: ApiPayment, schoolName: string, schoolContact?: { address?: string | null; email?: string | null; phone?: string | null }) {
  const rows: [string, string][] = [
    ["Receipt No.", payment.reference],
    ["Date Paid", formatDateTime(payment.paid_at ?? payment.created_at)],
    ["Payment For", payment.description ?? prettyType(payment.type)],
    ["Fee Type", prettyType(payment.type)],
    ["Provider", payment.provider ? payment.provider[0].toUpperCase() + payment.provider.slice(1) : "—"],
    ["Status", payment.status.toUpperCase()],
  ];

  const html = `<!doctype html><html><head><meta charset="utf-8"/>
<title>Receipt ${payment.reference}</title>
<style>
  * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; box-sizing: border-box; }
  body { margin:0; color:#1f2530; background:#f6f7f9; }
  .wrap { max-width: 720px; margin: 24px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(15,23,42,.08); }
  .head { background: linear-gradient(135deg,#0f6953,#105445); color:#fff; padding:28px 32px; }
  .head .brand { font-size:20px; font-weight:800; letter-spacing:-.01em; }
  .head .sub { font-size:11px; text-transform:uppercase; letter-spacing:.18em; opacity:.7; margin-top:2px; }
  .head .title { margin-top:18px; font-size:14px; opacity:.9; }
  .head .amt { font-size:34px; font-weight:800; margin-top:4px; }
  .school { padding:20px 32px; border-bottom:1px solid #eceef2; }
  .school .name { font-weight:700; font-size:15px; }
  .school .meta { color:#66778f; font-size:12px; margin-top:4px; }
  .rows { padding:8px 32px 20px; }
  .row { display:flex; justify-content:space-between; gap:16px; padding:10px 0; border-bottom:1px dashed #eceef2; font-size:13px; }
  .row .k { color:#66778f; }
  .row .v { font-weight:600; text-align:right; }
  .foot { padding:16px 32px 28px; color:#8595ac; font-size:11px; text-align:center; }
  .actions { text-align:center; padding:0 32px 28px; }
  .btn { background:#0f6953; color:#fff; border:none; padding:10px 20px; border-radius:10px; font-weight:600; cursor:pointer; font-size:13px; }
  @media print { body { background:#fff; } .wrap { box-shadow:none; margin:0; max-width:100%; } .actions { display:none; } }
</style></head>
<body>
  <div class="wrap">
    <div class="head">
      <div class="brand">Klasroom</div>
      <div class="sub">by 937 Limited</div>
      <div class="title">PAYMENT RECEIPT</div>
      <div class="amt">${formatMoney(payment.amount, payment.currency)}</div>
    </div>
    <div class="school">
      <div class="name">${esc(schoolName)}</div>
      <div class="meta">${esc(schoolContact?.address ?? "")}</div>
      <div class="meta">${esc(schoolContact?.email ?? "")} ${schoolContact?.phone ? "· " + esc(schoolContact.phone) : ""}</div>
    </div>
    <div class="rows">
      ${rows.map(([k, v]) => `<div class="row"><span class="k">${k}</span><span class="v">${esc(v)}</span></div>`).join("")}
    </div>
    <div class="actions">
      <button class="btn" onclick="window.print()">Download / Print PDF</button>
    </div>
    <div class="foot">This is a system-generated receipt from Klasroom. Keep this for your records.</div>
  </div>
</body></html>`;

  openOrDownload(html, payment.reference);
}

function openOrDownload(html: string, filenameHint: string) {
  const w = window.open("", "_blank");
  if (!w) {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${filenameHint}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

export function prettyType(type: string): string {
  return type
    .split("_")
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

function esc(s: string): string {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}