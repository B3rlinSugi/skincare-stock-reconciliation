# Database Schema & Data Models

The database is built on PostgreSQL 15 via Supabase. It relies heavily on UUID primary keys, foreign key constraints, and database-level functions to ensure data integrity.

## Core Tables

### 1. `products`
The master list of all skincare items.
- `id` (UUID, PK)
- `sku` (VARCHAR, UNIQUE, Indexed)
- `name` (VARCHAR)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)

### 2. `batches`
Tracks specific production runs for FEFO (First Expired, First Out) management.
- `id` (UUID, PK)
- `product_id` (UUID, FK -> products.id)
- `batch_code` (VARCHAR)
- `expiry_date` (DATE)
- `created_at` (TIMESTAMPTZ)
*(Unique constraint on product_id + batch_code)*

### 3. `stock_ledger`
The heart of the application. An immutable, append-only ledger of all movements.
- `id` (UUID, PK)
- `product_id` (UUID, FK -> products.id)
- `batch_id` (UUID, FK -> batches.id, Nullable)
- `movement_type` (ENUM: INBOUND, OUTBOUND, RETURN, OPNAME_ADJUSTMENT, SYSTEM_CORRECTION)
- `quantity` (INTEGER) - Positive for additions, negative for deductions.
- `channel` (VARCHAR) - e.g., 'MANUAL', 'SHOPEE', 'TIKTOK', 'WAREHOUSE'.
- `reference_id` (VARCHAR) - e.g., Order ID or Return ID.
- `created_at` (TIMESTAMPTZ)
- `is_voided` (BOOLEAN) - Indicates if this specific transaction has been logically reversed.
- `voided_by` (UUID, Nullable) - References the ledger row that negated this transaction.

### 4. `product_stock_summary`
An O(1) read-optimized table maintained strictly via database triggers.
- `product_id` (UUID, PK, FK -> products.id)
- `total_qty` (INTEGER)
- `last_updated` (TIMESTAMPTZ)

## Database Triggers & Functions

### `trg_update_stock_summary`
Fires `AFTER INSERT` on `stock_ledger`.
```sql
CREATE OR REPLACE FUNCTION update_stock_summary()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_stock_summary (product_id, total_qty)
  VALUES (NEW.product_id, NEW.quantity)
  ON CONFLICT (product_id)
  DO UPDATE SET 
    total_qty = product_stock_summary.total_qty + NEW.quantity,
    last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Stored Procedures
- `sp_void_transaction(p_ledger_id)`: Safely issues an inverse transaction to negate a mistake without deleting the original row.
