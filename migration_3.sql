-- migration_3.sql: Atomic Ledger Voiding

CREATE OR REPLACE FUNCTION rpc_void_ledger_entry(
  p_ledger_id UUID,
  p_created_by TEXT
) RETURNS VOID AS $$
DECLARE
  v_entry RECORD;
  v_batch_stock INTEGER;
BEGIN
  -- 1. Ambil entri aslinya
  SELECT * INTO v_entry FROM stock_ledger WHERE id = p_ledger_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ledger entry not found';
  END IF;

  -- 2. Pastikan hanya bisa membatalkan INBOUND (Maklon) atau MANUAL_OUT
  IF v_entry.reference_type NOT IN ('INBOUND', 'MANUAL_OUT') THEN
    RAISE EXCEPTION 'Only INBOUND or MANUAL_OUT can be voided via this function';
  END IF;

  -- 3. Cek apakah sudah pernah di-void (Anti Double-Void)
  IF EXISTS (SELECT 1 FROM stock_ledger WHERE reference_type = 'VOID' AND reference_id = p_ledger_id) THEN
    RAISE EXCEPTION 'Transaction is already voided';
  END IF;

  -- 4. Jika membatalkan INBOUND, pastikan stok batch masih cukup
  --    (Barang masuk yang sudah terjual tidak bisa ditarik/dibatalkan!)
  IF v_entry.movement_type = 'INBOUND' THEN
    SELECT COALESCE(SUM(quantity), 0) INTO v_batch_stock 
    FROM stock_ledger 
    WHERE batch_id = v_entry.batch_id;

    IF v_batch_stock < v_entry.quantity THEN
      RAISE EXCEPTION 'Cannot void INBOUND: Stock from this batch has already been consumed (Remaining: %, Needed: %)', v_batch_stock, v_entry.quantity;
    END IF;
  END IF;

  -- 5. Buat Compensating Entry (Jurnal Balikan)
  -- Quantity akan dibalik (jika aslinya positif, jadi negatif, dan sebaliknya)
  INSERT INTO stock_ledger (
    product_id, batch_id, movement_type, channel, quantity, reference_type, reference_id, notes, created_by
  ) VALUES (
    v_entry.product_id, v_entry.batch_id, v_entry.movement_type, v_entry.channel, -v_entry.quantity, 'VOID', p_ledger_id, 'Void of transaction ' || p_ledger_id, p_created_by
  );

  -- Note: Karena sistem menggunakan Append-Only ledger (current stock dihitung dari SUM(quantity)),
  -- kita tidak perlu melakukan UPDATE pada tabel batches. Kalkulasi stok akan otomatis seimbang!

END;
$$ LANGUAGE plpgsql;
