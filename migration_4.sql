-- migration_4.sql: Core SQL Bug Fixes & Real-time Delta Opname

-- ------------------------------------------------------------
-- 1. rpc_complete_opname (HOTFIX)
-- Fixes: Real-time Delta calculation & Removes invalid 'batches.current_qty' updates
-- ------------------------------------------------------------
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
  -- Lock opname
  SELECT * INTO v_opname FROM stock_opname WHERE id = p_opname_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opname not found';
  END IF;

  IF v_opname.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Opname already completed';
  END IF;

  FOR v_item IN SELECT * FROM stock_opname_items WHERE opname_id = p_opname_id LOOP
    IF v_item.physical_qty IS NOT NULL THEN
      -- Get REAL-TIME stock for THIS BATCH specifically from the append-only ledger
      SELECT COALESCE(SUM(quantity), 0) INTO v_real_system_qty 
      FROM stock_ledger 
      WHERE batch_id = v_item.batch_id;
      
      v_real_delta := v_item.physical_qty - v_real_system_qty;
      
      IF v_real_delta != 0 THEN
        -- Insert compensating OPNAME_ADJUST entry
        INSERT INTO stock_ledger (
          product_id, batch_id, movement_type, channel, quantity, reference_type, reference_id, notes, created_by
        ) VALUES (
          v_item.product_id, v_item.batch_id, 'OPNAME_ADJUST', 'OFFLINE', v_real_delta, 'OPNAME', p_opname_id, 'Koreksi stok opname', p_created_by
        );
      END IF;
      
      -- Memperbarui system_qty ke nilai real-time. 
      -- Karena kolom `difference` bersifat GENERATED ALWAYS AS (COALESCE(physical_qty, 0) - system_qty),
      -- maka otomatis database akan menghitung ulang `difference` sesuai real-time delta yang benar.
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


-- ------------------------------------------------------------
-- 2. rpc_inspect_return (HOTFIX)
-- Fixes: Removes invalid 'batches.current_qty' updates
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_inspect_return(
  p_return_id UUID,
  p_condition TEXT,
  p_batch_id UUID,
  p_notes TEXT,
  p_created_by TEXT
) RETURNS VOID AS $$
DECLARE
  v_return RECORD;
  v_ledger_id UUID;
BEGIN
  -- Lock return
  SELECT * INTO v_return FROM returns WHERE id = p_return_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Return not found';
  END IF;

  IF v_return.status != 'PENDING_INSPECTION' THEN
    RAISE EXCEPTION 'Return already inspected';
  END IF;

  v_ledger_id := NULL;

  IF p_condition = 'RESELLABLE' THEN
    IF p_batch_id IS NULL THEN
      RAISE EXCEPTION 'Batch ID required for resellable return';
    END IF;

    -- Insert into ledger (stok otomatis bertambah dari penjumlahan ledger)
    INSERT INTO stock_ledger (
      product_id, batch_id, movement_type, channel, quantity, reference_type, reference_id, return_condition, notes, created_by
    ) VALUES (
      v_return.product_id, p_batch_id, 'RETURN_IN', v_return.marketplace, v_return.qty, 'RETURN', p_return_id, 'RESELLABLE', COALESCE(p_notes, 'Retur layak jual — stok dikembalikan'), p_created_by
    ) RETURNING id INTO v_ledger_id;

    -- Dihapus: UPDATE batches SET current_qty = current_qty + v_return.qty ... (Kolom tidak ada)
  END IF;

  -- Update return
  -- Konversi eksplisit p_condition menjadi enum return_condition
  UPDATE returns 
  SET condition = p_condition::return_condition, status = 'INSPECTED', ledger_id = v_ledger_id, inspected_at = NOW(), notes = p_notes, updated_at = NOW() 
  WHERE id = p_return_id;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------
-- 3. rpc_cancel_order (HOTFIX)
-- Fixes: Removes invalid 'batches.current_qty' updates
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION rpc_cancel_order(
  p_order_id UUID
) RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
BEGIN
  -- Lock order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status = 'CANCELLED' THEN
    RETURN;
  END IF;

  -- Only reverse stock if it was deducted
  IF v_order.stock_deducted THEN
    FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
      -- If batch_id is null, it means no stock was deducted for this item.
      IF v_item.batch_id IS NOT NULL THEN
        -- Revert the deduction via INBOUND entry
        INSERT INTO stock_ledger (
          product_id, batch_id, movement_type, channel, quantity, reference_type, reference_id, notes, created_by
        ) VALUES (
          v_item.product_id, v_item.batch_id, 'INBOUND', v_order.marketplace, v_item.qty, 'ORDER', p_order_id, 'Stock reversal for cancelled order', 'marketplace-processor'
        );
        
        -- Dihapus: UPDATE batches SET current_qty = current_qty + v_item.qty ... (Kolom tidak ada)
      END IF;
    END LOOP;
  END IF;

  UPDATE orders 
  SET status = 'CANCELLED', updated_at = NOW() 
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;
