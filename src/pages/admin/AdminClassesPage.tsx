import { useAdminData } from "../../lib/useAdminData";
import { useToast } from "../../lib/toast";
import { supabase } from "../../lib/supabase";
import { Badge, Button, EmptyState, Modal } from "../../components/ui";
import { formatMoney } from "../../lib/format";
import { Building2, Plus, Pencil, Trash2, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import type { ClassLevel, FeeStructure } from "../../lib/types";

export function AdminClassesPage() {
  const data = useAdminData();
  const toast = useToast();
  const [fees, setFees] = useState<FeeStructure[]>([]);
  const [classModal, setClassModal] = useState(false);
  const [feeModal, setFeeModal] = useState(false);
  const [editClass, setEditClass] = useState<ClassLevel | null>(null);
  const [classForm, setClassForm] = useState({ name: "", level: "", capacity: "30" });
  const [feeForm, setFeeForm] = useState({ name: "", amount: "", term: "", mandatory: true, classId: "" });
  const [saving, setSaving] = useState(false);

  const loadFees = async () => {
    if (!data.school) return;
    const { data: f } = await supabase.from("fee_structures").select("*").eq("school_id", data.school.id).order("created_at", { ascending: false });
    setFees((f as FeeStructure[]) ?? []);
  };

  useEffect(() => { loadFees(); }, [data.school]);

  const saveClass = async () => {
    if (!data.school || !classForm.name) { toast({ kind: "error", title: "Name required" }); return; }
    setSaving(true);
    if (editClass) {
      const { error } = await supabase.from("classes").update({ name: classForm.name, level: classForm.level ? Number(classForm.level) : null, capacity: Number(classForm.capacity) || 30 }).eq("id", editClass.id);
      if (error) toast({ kind: "error", title: "Error", message: error.message });
      else toast({ kind: "success", title: "Class updated" });
    } else {
      const { error } = await supabase.from("classes").insert({ school_id: data.school.id, name: classForm.name, level: classForm.level ? Number(classForm.level) : null, capacity: Number(classForm.capacity) || 30 });
      if (error) toast({ kind: "error", title: "Error", message: error.message });
      else toast({ kind: "success", title: "Class added" });
    }
    setSaving(false);
    setClassModal(false); setEditClass(null); setClassForm({ name: "", level: "", capacity: "30" });
    data.reload();
  };

  const saveFee = async () => {
    if (!data.school || !feeForm.name || !feeForm.amount) { toast({ kind: "error", title: "Name and amount required" }); return; }
    setSaving(true);
    const { error } = await supabase.from("fee_structures").insert({
      school_id: data.school.id,
      class_id: feeForm.classId || null,
      name: feeForm.name, amount: Number(feeForm.amount),
      currency: data.school.currency, term: feeForm.term || null,
      mandatory: feeForm.mandatory,
    });
    setSaving(false);
    if (error) { toast({ kind: "error", title: "Error", message: error.message }); return; }
    toast({ kind: "success", title: "Fee added" });
    setFeeModal(false); setFeeForm({ name: "", amount: "", term: "", mandatory: true, classId: "" });
    loadFees();
  };

  const deleteFee = async (id: string) => {
    const { error } = await supabase.from("fee_structures").delete().eq("id", id);
    if (error) toast({ kind: "error", title: "Error", message: error.message });
    else { toast({ kind: "success", title: "Fee removed" }); loadFees(); }
  };

  if (data.loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-950">Classes & Fees</h1>
          <p className="text-sm text-ink-500 mt-0.5">Manage classes and fee structures for {data.school?.name}.</p>
        </div>
      </div>

      {/* Classes */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">Classes ({data.classes.length})</h2>
          <Button variant="secondary" className="text-xs" onClick={() => { setEditClass(null); setClassForm({ name: "", level: "", capacity: "30" }); setClassModal(true); }}>
            <Plus className="h-3.5 w-3.5" /> Add class
          </Button>
        </div>
        {data.classes.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">No classes yet. Add one to let parents apply.</div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
            {data.classes.map((c) => (
              <div key={c.id} className="rounded-xl ring-1 ring-ink-100 p-4">
                <div className="flex items-center justify-between">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-100 text-brand-700">
                    <Building2 className="h-4 w-4" />
                  </div>
                  <button onClick={() => { setEditClass(c); setClassForm({ name: c.name, level: c.level?.toString() ?? "", capacity: c.capacity?.toString() ?? "30" }); setClassModal(true); }}
                    className="text-ink-400 hover:text-brand-600"><Pencil className="h-4 w-4" /></button>
                </div>
                <p className="mt-3 text-sm font-semibold text-ink-900">{c.name}</p>
                <p className="text-xs text-ink-500">Level {c.level ?? "—"} · Capacity {c.capacity ?? "—"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fees */}
      <div className="card">
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h2 className="text-base font-semibold text-ink-900">Fee structures ({fees.length})</h2>
          <Button variant="secondary" className="text-xs" onClick={() => { setFeeForm({ name: "", amount: "", term: "", mandatory: true, classId: "" }); setFeeModal(true); }}>
            <Plus className="h-3.5 w-3.5" /> Add fee
          </Button>
        </div>
        {fees.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-500">No fee structures yet. Add mandatory fees that parents pay during enrollment.</div>
        ) : (
          <div className="divide-y divide-ink-100">
            {fees.map((f) => {
              const cls = data.classes.find((c) => c.id === f.class_id);
              return (
                <div key={f.id} className="flex items-center gap-3 p-4">
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-gold-100 text-gold-700"><CreditCard className="h-4 w-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-900">{f.name}</p>
                    <p className="text-xs text-ink-500">{cls ? cls.name : "All classes"} · {f.term ?? "—"}{f.mandatory ? " · Mandatory" : ""}</p>
                  </div>
                  <span className="text-sm font-bold text-ink-950">{formatMoney(f.amount, f.currency)}</span>
                  <button onClick={() => deleteFee(f.id)} className="text-ink-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Class modal */}
      <Modal open={classModal} onClose={() => setClassModal(false)} title={editClass ? "Edit class" : "Add class"}>
        <div className="space-y-4">
          <div>
            <label className="label">Class name</label>
            <input className="input" placeholder="e.g. JSS 1" value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Level</label>
              <input type="number" className="input" placeholder="7" value={classForm.level} onChange={(e) => setClassForm({ ...classForm, level: e.target.value })} />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input type="number" className="input" value={classForm.capacity} onChange={(e) => setClassForm({ ...classForm, capacity: e.target.value })} />
            </div>
          </div>
          <Button onClick={saveClass} loading={saving} className="w-full">{editClass ? "Update" : "Add"} class</Button>
        </div>
      </Modal>

      {/* Fee modal */}
      <Modal open={feeModal} onClose={() => setFeeModal(false)} title="Add fee structure">
        <div className="space-y-4">
          <div>
            <label className="label">Fee name</label>
            <input className="input" placeholder="e.g. Tuition (Term 1)" value={feeForm.name} onChange={(e) => setFeeForm({ ...feeForm, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Amount (NGN)</label>
              <input type="number" className="input" placeholder="350000" value={feeForm.amount} onChange={(e) => setFeeForm({ ...feeForm, amount: e.target.value })} />
            </div>
            <div>
              <label className="label">Term (optional)</label>
              <input className="input" placeholder="First Term" value={feeForm.term} onChange={(e) => setFeeForm({ ...feeForm, term: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Applies to class (optional)</label>
            <select className="input" value={feeForm.classId} onChange={(e) => setFeeForm({ ...feeForm, classId: e.target.value })}>
              <option value="">All classes</option>
              {data.classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" checked={feeForm.mandatory} onChange={(e) => setFeeForm({ ...feeForm, mandatory: e.target.checked })} className="rounded" />
            Mandatory (parents must pay during enrollment)
          </label>
          <Button onClick={saveFee} loading={saving} className="w-full">Add fee</Button>
        </div>
      </Modal>
    </div>
  );
}
