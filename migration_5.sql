-- migration_5.sql: Database Scalability (Summary Tables & Triggers)
-- Replaces slow dynamic SUM() views with O(1) Summary Tables

-- 1. Create Summary Tables
CREATE TABLE IF NOT EXISTS product_stock_summary (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  total_qty INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_stock_summary (
  batch_id UUID PRIMARY KEY REFERENCES batches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  total_qty INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Backfill Data from existing Ledger
INSERT INTO product_stock_summary (product_id, total_qty)
SELECT product_id, SUM(quantity) 
FROM stock_ledger 
GROUP BY product_id
ON CONFLICT (product_id) DO UPDATE 
SET total_qty = EXCLUDED.total_qty, updated_at = NOW();

INSERT INTO batch_stock_summary (batch_id, product_id, total_qty)
SELECT batch_id, product_id, SUM(quantity) 
FROM stock_ledger 
WHERE batch_id IS NOT NULL 
GROUP BY batch_id, product_id
ON CONFLICT (batch_id) DO UPDATE 
SET total_qty = EXCLUDED.total_qty, updated_at = NOW();

-- 3. Create Trigger Function
CREATE OR REPLACE FUNCTION trg_update_stock_summary_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- Update product summary
  INSERT INTO product_stock_summary (product_id, total_qty)
  VALUES (NEW.product_id, NEW.quantity)
  ON CONFLICT (product_id) 
  DO UPDATE SET total_qty = product_stock_summary.total_qty + EXCLUDED.total_qty, updated_at = NOW();

  -- Update batch summary if batch_id is present
  IF NEW.batch_id IS NOT NULL THEN
    INSERT INTO batch_stock_summary (batch_id, product_id, total_qty)
    VALUES (NEW.batch_id, NEW.product_id, NEW.quantity)
    ON CONFLICT (batch_id)
    DO UPDATE SET total_qty = batch_stock_summary.total_qty + EXCLUDED.total_qty, updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Attach Trigger to stock_ledger
DROP TRIGGER IF EXISTS trg_stock_ledger_insert ON stock_ledger;
CREATE TRIGGER trg_stock_ledger_insert
AFTER INSERT ON stock_ledger
FOR EACH ROW
EXECUTE FUNCTION trg_update_stock_summary_fn();

-- 5. Redefine Views to use Summary Tables (O(1) read time)
CREATE OR REPLACE VIEW v_current_stock AS
SELECT
  p.id           AS product_id,
  p.sku,
  p.name         AS product_name,
  b.id           AS batch_id,
  b.batch_code,
  b.expiry_date,
  COALESCE(bs.total_qty, 0)::bigint AS current_qty
FROM products p
LEFT JOIN batches b ON b.product_id = p.id
LEFT JOIN batch_stock_summary bs ON bs.batch_id = b.id
WHERE p.is_active = true;

CREATE OR REPLACE VIEW v_product_stock_total AS
SELECT
  p.id    AS product_id,
  p.sku,
  p.name  AS product_name,
  COALESCE(ps.total_qty, 0)::bigint AS total_qty
FROM products p
LEFT JOIN product_stock_summary ps ON ps.product_id = p.id
WHERE p.is_active = true;

-- Important Fix for rpc_complete_opname (migration_4.sql)
-- Karena rpc_complete_opname di migration_4.sql membaca dari `stock_ledger` untuk Real-Time Delta,
-- Kita harus memastikannya baca dari `batch_stock_summary` agar lebih cepat!
CREATE OR REPLACE FUNCTION rpc_complete_opname(
  p_opname_id UUID,
  p_created_by TEXT
) RETURNS VOID AS $$
DECLARE
  v_opname RECORD;
  v_item RECORD;
  v_real_system_qty INTEGER;
  v_real_delta INTEGER;
BEGIN
  SELECT * INTO v_opname FROM stock_opname WHERE id = p_opname_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Opname not found'; END IF;
  IF v_opname.status = 'COMPLETED' THEN RAISE EXCEPTION 'Opname already completed'; END IF;

  FOR v_item IN SELECT * FROM stock_opname_items WHERE opname_id = p_opname_id LOOP
    IF v_item.physical_qty IS NOT NULL THEN
      -- Get REAL-TIME stock for THIS BATCH specifically from the new O(1) summary table
      SELECT COALESCE(total_qty, 0) INTO v_real_system_qty 
      FROM batch_stock_summary 
      WHERE batch_id = v_item.batch_id;
      
      v_real_delta := v_item.physical_qty - v_real_system_qty;
      
      IF v_real_delta != 0 THEN
        INSERT INTO stock_ledger (
          product_id, batch_id, movement_type, channel, quantity, reference_type, reference_id, notes, created_by
        ) VALUES (
          v_item.product_id, v_item.batch_id, 'OPNAME_ADJUST', 'OFFLINE', v_real_delta, 'OPNAME', p_opname_id, 'Koreksi stok opname', p_created_by
        );
      END IF;
      
      UPDATE stock_opname_items 
      SET system_qty = v_real_system_qty
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  UPDATE stock_opname 
  SET status = 'COMPLETED', completed_at = NOW() 
  WHERE id = p_opname_id;
END;
$$ LANGUAGE plpgsql;
