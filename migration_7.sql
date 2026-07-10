-- migration_7.sql: Audit Logs Table and Triggers

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  changed_by TEXT, -- For now, we capture string 'Warehouse Admin' or system
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Set up RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read for authenticated" ON audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read for anon" ON audit_logs FOR SELECT TO anon USING (true);
-- Note: Insert is done via SECURITY DEFINER triggers, so we don't need an INSERT policy for users.

-- 3. Generic Trigger Function for Audit Logging
CREATE OR REPLACE FUNCTION tf_audit_log()
RETURNS TRIGGER AS $$
DECLARE
  v_changed_by TEXT := 'System';
  v_old_data JSONB := NULL;
  v_new_data JSONB := NULL;
  v_record_id UUID;
BEGIN
  -- We assume all our tables have an 'id' column of type UUID.
  
  IF (TG_OP = 'DELETE') THEN
    v_record_id := OLD.id;
    v_old_data := to_jsonb(OLD);
  ELSIF (TG_OP = 'UPDATE') THEN
    v_record_id := NEW.id;
    v_old_data := to_jsonb(OLD);
    v_new_data := to_jsonb(NEW);
  ELSIF (TG_OP = 'INSERT') THEN
    v_record_id := NEW.id;
    v_new_data := to_jsonb(NEW);
  END IF;

  -- Insert the log
  INSERT INTO audit_logs (table_name, record_id, action, old_data, new_data, changed_by)
  VALUES (TG_TABLE_NAME::TEXT, v_record_id, TG_OP, v_old_data, v_new_data, v_changed_by);

  IF (TG_OP = 'DELETE') THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Attach triggers to critical tables
DROP TRIGGER IF EXISTS trg_audit_products ON products;
CREATE TRIGGER trg_audit_products
AFTER INSERT OR UPDATE OR DELETE ON products
FOR EACH ROW EXECUTE FUNCTION tf_audit_log();

DROP TRIGGER IF EXISTS trg_audit_orders ON orders;
CREATE TRIGGER trg_audit_orders
AFTER INSERT OR UPDATE OR DELETE ON orders
FOR EACH ROW EXECUTE FUNCTION tf_audit_log();

DROP TRIGGER IF EXISTS trg_audit_returns ON returns;
CREATE TRIGGER trg_audit_returns
AFTER INSERT OR UPDATE OR DELETE ON returns
FOR EACH ROW EXECUTE FUNCTION tf_audit_log();

DROP TRIGGER IF EXISTS trg_audit_stock_opname ON stock_opname;
CREATE TRIGGER trg_audit_stock_opname
AFTER INSERT OR UPDATE OR DELETE ON stock_opname
FOR EACH ROW EXECUTE FUNCTION tf_audit_log();
