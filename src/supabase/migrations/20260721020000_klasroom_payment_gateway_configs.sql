/*
# Klasroom — Payment Gateway Configuration (Paystack / Flutterwave)

Each school connects its own Paystack and/or Flutterwave account (per the "dedicated
payment keys / dedicated subaccount" multi-tenant requirement). Secret keys must never
reach a browser that isn't the owning school's admin — but the *public* key and provider
need to be readable by any parent paying a fee, to launch the provider's inline checkout.

- `payment_gateway_configs` — school admin / platform admin can manage their own row
  (insert/update/delete/select). Holds both public_key and secret_key.
- `public.get_active_gateway(school_id)` — SECURITY DEFINER RPC that returns ONLY
  provider/public_key/subaccount_code for the school's active gateway. Safe for any
  authenticated user (parents) to call; never exposes secret_key.
- Edge functions (`initiate-payment`, `verify-payment`, `payment-webhook`) use the
  service-role key, which bypasses RLS entirely, to read secret_key when talking to
  Paystack/Flutterwave.
*/

CREATE TABLE IF NOT EXISTS payment_gateway_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('paystack', 'flutterwave')),
  public_key text NOT NULL,
  secret_key text NOT NULL,
  subaccount_code text,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, provider)
);
ALTER TABLE payment_gateway_configs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_gateway_configs_school ON payment_gateway_configs(school_id);

-- Only one active gateway per school at a time (keeps checkout unambiguous).
CREATE UNIQUE INDEX IF NOT EXISTS idx_gateway_configs_one_active
  ON payment_gateway_configs(school_id) WHERE is_active;

DROP POLICY IF EXISTS "gateway_configs_select" ON payment_gateway_configs;
CREATE POLICY "gateway_configs_select" ON payment_gateway_configs FOR SELECT
  TO authenticated USING (kr.school_admin_of(school_id) OR kr.is_platform_admin());
DROP POLICY IF EXISTS "gateway_configs_insert" ON payment_gateway_configs;
CREATE POLICY "gateway_configs_insert" ON payment_gateway_configs FOR INSERT
  TO authenticated WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "gateway_configs_update" ON payment_gateway_configs;
CREATE POLICY "gateway_configs_update" ON payment_gateway_configs FOR UPDATE
  TO authenticated USING (kr.school_admin_of(school_id)) WITH CHECK (kr.school_admin_of(school_id));
DROP POLICY IF EXISTS "gateway_configs_delete" ON payment_gateway_configs;
CREATE POLICY "gateway_configs_delete" ON payment_gateway_configs FOR DELETE
  TO authenticated USING (kr.school_admin_of(school_id));

DROP TRIGGER IF EXISTS trg_audit_gateway_configs ON payment_gateway_configs;
CREATE TRIGGER trg_audit_gateway_configs AFTER INSERT OR UPDATE OR DELETE ON payment_gateway_configs
  FOR EACH ROW EXECUTE FUNCTION kr.audit_trigger();

CREATE OR REPLACE FUNCTION public.get_active_gateway(p_school_id uuid)
RETURNS TABLE (provider text, public_key text, subaccount_code text)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT provider, public_key, subaccount_code
  FROM payment_gateway_configs
  WHERE school_id = p_school_id AND is_active = true
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_active_gateway(uuid) TO authenticated, anon;
