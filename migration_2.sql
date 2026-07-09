-- migration_2.sql: ACID RPCs for Transactions

-- 1. rpc_process_order_fefo
CREATE OR REPLACE FUNCTION rpc_process_order_fefo(
  p_order_id UUID,
  p_new_status TEXT
) RETURNS VOID AS $$
DECLARE
  v_order RECORD;
  v_item RECORD;
  v_allocations JSON;
  v_first_batch_id UUID;
  v_first_ledger_id UUID;
BEGIN
  -- Lock order
  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.stock_deducted THEN
    -- Idempotent
    RETURN;
  END IF;

  -- Loop through order items
  FOR v_item IN SELECT * FROM order_items WHERE order_id = p_order_id LOOP
    -- Delegate FEFO deduction to existing RPC
    SELECT rpc_allocate_and_deduct_fefo(
      v_item.product_id,
      v_item.qty,
      v_order.marketplace,
      'ORDER',
      p_order_id,
      NULL,
      'marketplace-processor'
    ) INTO v_allocations;
    
    -- v_allocations is a json array. For simplicity, we just save the first allocated batch into order_items
    -- If multiple batches are used, this is a limitation of our PoC schema.
    IF json_array_length(v_allocations) > 0 THEN
      v_first_batch_id := (v_allocations->0->>'batch_id')::UUID;
      v_first_ledger_id := (v_allocations->0->>'ledger_id')::UUID;
      
      UPDATE order_items 
      SET batch_id = v_first_batch_id, ledger_id = v_first_ledger_id 
      WHERE id = v_item.id;
    END IF;
  END LOOP;

  -- Update order status
  UPDATE orders 
  SET status = p_new_status, stock_deducted = true, updated_at = NOW() 
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;


-- 2. rpc_cancel_order
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
      -- In a full implementation, we'd need to reverse all batches that were allocated.
      -- Since we only saved one batch_id per order_item in our simplified schema, we'll reverse the total qty to that batch.
      -- If batch_id is null, it means no stock was deducted for this item.
      IF v_item.batch_id IS NOT NULL THEN
        INSERT INTO stock_ledger (
          product_id, batch_id, movement_type, channel, quantity, reference_type, reference_id, notes, created_by
        ) VALUES (
          v_item.product_id, v_item.batch_id, 'INBOUND', v_order.marketplace, v_item.qty, 'ORDER', p_order_id, 'Stock reversal for cancelled order', 'marketplace-processor'
        );
        
        UPDATE batches 
        SET current_qty = current_qty + v_item.qty, updated_at = NOW() 
        WHERE id = v_item.batch_id;
      END IF;
    END LOOP;
  END IF;

  UPDATE orders 
  SET status = 'CANCELLED', updated_at = NOW() 
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;


-- 3. rpc_inspect_return
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

    -- Insert into ledger
    INSERT INTO stock_ledger (
      product_id, batch_id, movement_type, channel, quantity, reference_type, reference_id, return_condition, notes, created_by
    ) VALUES (
      v_return.product_id, p_batch_id, 'RETURN_IN', v_return.marketplace, v_return.qty, 'RETURN', p_return_id, 'RESELLABLE', COALESCE(p_notes, 'Retur layak jual — stok dikembalikan'), p_created_by
    ) RETURNING id INTO v_ledger_id;

    -- Increase batch qty
    UPDATE batches 
    SET current_qty = current_qty + v_return.qty, updated_at = NOW() 
    WHERE id = p_batch_id;
  END IF;

  -- Update return
  UPDATE returns 
  SET condition = p_condition, status = 'INSPECTED', ledger_id = v_ledger_id, inspected_at = NOW(), notes = p_notes, updated_at = NOW() 
  WHERE id = p_return_id;
END;
$$ LANGUAGE plpgsql;


-- 4. rpc_complete_opname
CREATE OR REPLACE FUNCTION rpc_complete_opname(
  p_opname_id UUID,
  p_created_by TEXT
) RETURNS VOID AS $$
DECLARE
  v_opname RECORD;
  v_item RECORD;
  v_current_qty INTEGER;
  v_delta INTEGER;
  v_batch_id UUID;
BEGIN
  SELECT * INTO v_opname FROM stock_opname WHERE id = p_opname_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Opname not found';
  END IF;

  IF v_opname.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Opname already completed';
  END IF;

  FOR v_item IN SELECT * FROM stock_opname_items WHERE opname_id = p_opname_id LOOP
    IF v_item.physical_qty IS NOT NULL THEN
      -- Get real-time stock
      SELECT COALESCE(SUM(current_qty), 0) INTO v_current_qty FROM batches WHERE product_id = v_item.product_id;
      v_delta := v_item.physical_qty - v_current_qty;
      
      IF v_delta != 0 THEN
        -- We need a batch to adjust. In a real system, you'd adjust specific batches.
        -- For this PoC, we take the most recently updated active batch, or just the first batch.
        SELECT id INTO v_batch_id FROM batches WHERE product_id = v_item.product_id ORDER BY current_qty DESC LIMIT 1;
        
        IF v_batch_id IS NOT NULL THEN
          INSERT INTO stock_ledger (
            product_id, batch_id, movement_type, quantity, reference_type, reference_id, notes, created_by
          ) VALUES (
            v_item.product_id, v_batch_id, 'ADJUSTMENT', v_delta, 'OPNAME', p_opname_id, 'Penyesuaian stok opname', p_created_by
          );
          
          UPDATE batches 
          SET current_qty = current_qty + v_delta, updated_at = NOW() 
          WHERE id = v_batch_id;
          
          -- Save the difference recorded
          UPDATE stock_opname_items 
          SET difference = v_delta, system_qty = v_current_qty 
          WHERE id = v_item.id;
        END IF;
      ELSE
        UPDATE stock_opname_items 
        SET difference = 0, system_qty = v_current_qty 
        WHERE id = v_item.id;
      END IF;
    END IF;
  END LOOP;

  UPDATE stock_opname 
  SET status = 'COMPLETED', updated_at = NOW() 
  WHERE id = p_opname_id;
END;
$$ LANGUAGE plpgsql;
