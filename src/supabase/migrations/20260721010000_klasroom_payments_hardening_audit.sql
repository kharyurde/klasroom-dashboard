/*
# Klasroom — Payment Hardening, Statement of Account, Reconciliation, Audit Log

## 1. Payments hardening
- Adds provider / provider_reference / idempotency_key / gateway_response / fee_charge_id
  to `payments` so a real gateway (Flutterwave/Paystack) webhook can update rows
  idempotently instead of the client marking itself "paid".
- `payment_webhook_events` logs every inbound webhook delivery, keyed uniquely on
  (provider, event_id) so a redelivered webhook is a no-op. RLS is enabled with NO
  policies — only the service-role key (used by the edge function) can touch it.

## 2. Statement of Account
- `fee_charges` — the "owed" side (debits): invoices/assessments raised against a ward.
- `ward_ledger` view — UNION of fee_charges (debit) and paid payments (credit),
  `security_invoker = true` so it inherits the caller's RLS automatically.
  The client computes the running balance from this ledger.

## 3. Reconciliation
- `bank_settlements` — settlement batches reported by the payment processor.
- `payment_reconciliations` — links a payment to a settlement (matched/unmatched/disputed).

## 4. Audit log
- `audit_logs` + `kr.audit_trigger()` (SECURITY DEFINER) attached to the tables that
  matter most for compliance: payments, fee_charges, applications, enrollments, wards,
  school_admins.
*/

-- =========================================================
-- 1. Payments hardening
-- =========================================================
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS provider_reference text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS fee_charge_id uuid,
  ADD COLUMN IF NOT EXISTS gateway_response jsonb,
  ADD COLUMN IF NOT EXISTS webhook_processed_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
  ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_provider_ref
  ON payments(provider, provider_reference) WHERE provider_reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('flutterwave', 'paystack')),
  event_id text NOT NULL,
  event_type text,
  payment_id uuid REFERENCES payments(id) ON DELETE SET NULL,
  payload jsonb NOT NULL,
  signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  processed_at timestamptz,
  error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, event_id)
);
ALTER TABLE payment_webhook_events ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: only the service-role key (edge function) can read/write.

-- =========================================================
-- 2. Statement of Account
-- =========================================================
CREATE TABLE IF NOT EXISTS fee_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  ward_id uuid NOT NULL REFERENCES wards(id) ON DELETE CASCADE,
  enrollment_id uuid REFERENCES enrollments(id) ON DELETE SET NULL,
  fee_structure_id uuid REFERENCES fee_structures(id) ON DELETE SET NULL,
  session_id uuid REFERENCES academic_sessions(id) ON DELETE SET NULL,
  term text,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  waived_amount numeric(12,2) NOT NULL DEFAULT 0,
  waiver_reason text,
  currency text NOT NULL DEFAULT 'NGN',
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partial','paid','waived','overdue','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE fee_charges ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_fee_charges_ward ON fee_charges(ward_id);
CREATE INDEX IF NOT EXISTS idx_fee_charges_school ON fee_charges(school_id);

DO $$ BEGIN
  ALTER TABLE payments ADD CONSTRAINT payments_fee_charge_id_fkey
    FOREIGN KEY (fee_charge_id) REFERENCES fee_charges(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "fee_charges_select_owner" ON fee_charges;
CREATE POLICY "fee_charges_select_owner" ON fee_charges FOR SELECT
  TO authenticated USING (kr.parent_owns_ward(ward_id) OR kr.school_admin_of(school_id) OR kr.is_platform_admin());

DROP POLICY IF EXISTS "fee_charges_insert_school" ON fee_charges;
CREATE POLICY "fee_charges_insert_school" ON fee_charges FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "fee_charges_update_school" ON fee_charges;
CREATE POLICY "fee_charges_update_school" ON fee_charges FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));

DROP POLICY IF EXISTS "fee_charges_delete_school" ON fee_charges;
CREATE POLICY "fee_charges_delete_school" ON fee_charges FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

CREATE OR REPLACE VIEW ward_ledger WITH (security_invoker = true) AS
  SELECT
    fc.id, fc.school_id, fc.ward_id, 'charge'::text AS entry_type,
    fc.description, fc.amount AS debit, 0::numeric(12,2) AS credit,
    fc.currency, fc.created_at AS entry_date, fc.status
  FROM fee_charges fc
  UNION ALL
  SELECT
    p.id, p.school_id, p.ward_id, 'payment'::text AS entry_type,
    COALESCE(p.description, 'Payment') AS description, 0::numeric(12,2) AS debit, p.amount AS credit,
    p.currency, COALESCE(p.paid_at, p.created_at) AS entry_date, p.status
  FROM payments p
  WHERE p.status = 'paid';

-- =========================================================
-- 3. Reconciliation
-- =========================================================
CREATE TABLE IF NOT EXISTS bank_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  provider text NOT NULL,
  settlement_reference text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  settled_at timestamptz NOT NULL,
  raw_payload jsonb,
  status text NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched','matched','partial','disputed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, settlement_reference)
);
ALTER TABLE bank_settlements ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS payment_reconciliations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid NOT NULL UNIQUE REFERENCES payments(id) ON DELETE CASCADE,
  settlement_id uuid REFERENCES bank_settlements(id) ON DELETE SET NULL,
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched','matched','disputed')),
  variance numeric(12,2) NOT NULL DEFAULT 0,
  matched_at timestamptz,
  matched_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE payment_reconciliations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_recon_school ON payment_reconciliations(school_id);
CREATE INDEX IF NOT EXISTS idx_recon_payment ON payment_reconciliations(payment_id);

DROP POLICY IF EXISTS "settlements_select" ON bank_settlements;
CREATE POLICY "settlements_select" ON bank_settlements FOR SELECT
  TO authenticated USING (kr.school_admin_of(school_id) OR kr.is_platform_admin());
DROP POLICY IF EXISTS "settlements_insert_platform" ON bank_settlements;
CREATE POLICY "settlements_insert_platform" ON bank_settlements FOR INSERT
  TO authenticated WITH CHECK (kr.is_platform_admin());
DROP POLICY IF EXISTS "settlements_update_platform" ON bank_settlements;
CREATE POLICY "settlements_update_platform" ON bank_settlements FOR UPDATE
  TO authenticated USING (kr.is_platform_admin()) WITH CHECK (kr.is_platform_admin());
DROP POLICY IF EXISTS "settlements_delete_platform" ON bank_settlements;
CREATE POLICY "settlements_delete_platform" ON bank_settlements FOR DELETE
  TO authenticated USING (kr.is_platform_admin());

DROP POLICY IF EXISTS "recon_select" ON payment_reconciliations;
CREATE POLICY "recon_select" ON payment_reconciliations FOR SELECT
  TO authenticated USING (kr.school_admin_of(school_id) OR kr.is_platform_admin());
DROP POLICY IF EXISTS "recon_insert" ON payment_reconciliations;
CREATE POLICY "recon_insert" ON payment_reconciliations FOR INSERT
  TO authenticated WITH CHECK (kr.is_platform_admin() OR kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "recon_update" ON payment_reconciliations;
CREATE POLICY "recon_update" ON payment_reconciliations FOR UPDATE
  TO authenticated USING (kr.is_platform_admin() OR kr.school_admin_of(school_id))
  WITH CHECK (kr.is_platform_admin() OR kr.school_admin_of(school_id));

-- =========================================================
-- 4. Audit log
-- =========================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role text,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  table_name text NOT NULL,
  record_id uuid,
  school_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_logs_school ON audit_logs(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);

DROP POLICY IF EXISTS "audit_logs_select_school_admin" ON audit_logs;
CREATE POLICY "audit_logs_select_school_admin" ON audit_logs FOR SELECT
  TO authenticated USING (kr.school_admin_of(school_id) OR kr.is_platform_admin());
-- No insert/update/delete policy for regular clients: only kr.audit_trigger() (SECURITY DEFINER) writes here.

CREATE OR REPLACE FUNCTION kr.audit_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_school_id uuid;
  v_actor_role text;
BEGIN
  BEGIN
    v_school_id := COALESCE(
      CASE WHEN TG_OP = 'DELETE' THEN (to_jsonb(OLD)->>'school_id')::uuid ELSE (to_jsonb(NEW)->>'school_id')::uuid END,
      NULL
    );
  EXCEPTION WHEN OTHERS THEN
    v_school_id := NULL;
  END;

  SELECT COALESCE(
    (SELECT 'school_admin' FROM school_admins WHERE id = auth.uid()),
    (SELECT 'platform_admin' FROM platform_admins WHERE id = auth.uid()),
    (SELECT 'parent' FROM parent_profiles WHERE id = auth.uid()),
    (CASE WHEN auth.uid() IS NULL THEN 'system' END)
  ) INTO v_actor_role;

  INSERT INTO audit_logs (actor_id, actor_role, action, table_name, record_id, school_id, old_data, new_data)
  VALUES (
    auth.uid(), v_actor_role, TG_OP, TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    v_school_id,
    CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_payments ON payments;
CREATE TRIGGER trg_audit_payments AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION kr.audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_fee_charges ON fee_charges;
CREATE TRIGGER trg_audit_fee_charges AFTER INSERT OR UPDATE OR DELETE ON fee_charges
  FOR EACH ROW EXECUTE FUNCTION kr.audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_applications ON applications;
CREATE TRIGGER trg_audit_applications AFTER INSERT OR UPDATE OR DELETE ON applications
  FOR EACH ROW EXECUTE FUNCTION kr.audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_enrollments ON enrollments;
CREATE TRIGGER trg_audit_enrollments AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION kr.audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_wards ON wards;
CREATE TRIGGER trg_audit_wards AFTER INSERT OR UPDATE OR DELETE ON wards
  FOR EACH ROW EXECUTE FUNCTION kr.audit_trigger();

DROP TRIGGER IF EXISTS trg_audit_school_admins ON school_admins;
CREATE TRIGGER trg_audit_school_admins AFTER INSERT OR UPDATE OR DELETE ON school_admins
  FOR EACH ROW EXECUTE FUNCTION kr.audit_trigger();
