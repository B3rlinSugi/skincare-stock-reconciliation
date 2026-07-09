// src/lib/types/index.ts
// Central type definitions — semua domain types ada di sini

export type MovementType = 'INBOUND' | 'OUTBOUND' | 'RETURN_IN' | 'OPNAME_ADJUST'

export type MovementChannel =
  | 'MAKLON'
  | 'SHOPEE'
  | 'TIKTOK'
  | 'OFFLINE'
  | 'BONUS'
  | 'PROMO'
  | 'SAMPLE'
  | 'DAMAGED'
  | 'EXPIRED'

export type ReturnCondition = 'RESELLABLE' | 'DAMAGED' | 'LOST'

export type OrderStatus =
  | 'PENDING'
  | 'SHIPPED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'

export type Marketplace = 'SHOPEE' | 'TIKTOK'

export type ReturnStatus = 'PENDING_INSPECTION' | 'INSPECTED' | 'CLAIMED'

export type OpnameStatus = 'DRAFT' | 'COUNTING' | 'COMPLETED'

export type EventStatus = 'PENDING' | 'PROCESSED' | 'FAILED'

// ─── Database Row Types ──────────────────────────────────────

export interface Product {
  id: string
  sku: string
  name: string
  unit: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Batch {
  id: string
  product_id: string
  batch_code: string
  qty_received: number
  expiry_date: string
  received_at: string
  notes: string | null
  created_at: string
}

export interface StockLedger {
  id: string
  product_id: string
  batch_id: string | null
  movement_type: MovementType
  channel: MovementChannel
  quantity: number
  reference_type: string | null
  reference_id: string | null
  return_condition: ReturnCondition | null
  notes: string | null
  created_by: string | null
  created_at: string
}

export interface Order {
  id: string
  marketplace: Marketplace
  external_order_id: string
  status: OrderStatus
  customer_name: string | null
  customer_address: string | null
  stock_deducted: boolean
  raw_payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  batch_id: string | null
  qty: number
  ledger_id: string | null
}

export interface Return {
  id: string
  order_id: string | null
  marketplace: Marketplace
  external_return_id: string | null
  product_id: string
  qty: number
  condition: ReturnCondition | null
  status: ReturnStatus
  tiktok_claim_deadline: string | null
  claim_submitted: boolean
  ledger_id: string | null
  inspected_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface StockOpname {
  id: string
  title: string
  status: OpnameStatus
  notes: string | null
  started_by: string | null
  started_at: string
  completed_at: string | null
}

export interface StockOpnameItem {
  id: string
  opname_id: string
  product_id: string
  batch_id: string
  system_qty: number
  physical_qty: number | null
  difference: number | null
  adjustment_ledger_id: string | null
  notes: string | null
}

export interface MarketplaceEvent {
  id: string
  marketplace: Marketplace
  event_type: string
  payload: Record<string, unknown>
  status: EventStatus
  source: string
  processed_at: string | null
  error_msg: string | null
  created_at: string
}

// ─── Engine / Business Logic Types ──────────────────────────

export interface LedgerEntryInput {
  product_id: string
  batch_id?: string
  movement_type: MovementType
  channel: MovementChannel
  quantity: number  // positive = masuk, negative = keluar
  reference_type?: string
  reference_id?: string
  return_condition?: ReturnCondition
  notes?: string
  created_by?: string
}

export interface BatchAllocation {
  batch_id: string
  batch_code: string
  expiry_date: string
  qty: number
}

export interface ProductStockSummary {
  product_id: string
  sku: string
  product_name: string
  total_qty: number
  batches: BatchStock[]
  has_expiring_soon: boolean
  earliest_expiry: string | null
}

export interface BatchStock {
  batch_id: string
  batch_code: string
  expiry_date: string
  current_qty: number
  is_expiring_soon: boolean // < 90 hari
  is_expired: boolean
}

export interface DrilldownReport {
  product_id: string
  product_name: string
  period_start: string
  period_end: string
  opening_stock: number
  closing_stock: number
  total_inbound: number
  total_outbound: number
  breakdown: MovementBreakdown[]
  ledger_entries: StockLedger[]
}

export interface MovementBreakdown {
  channel: MovementChannel
  movement_type: MovementType
  total_qty: number
  entry_count: number
}

export interface GapBreakdown {
  product_id: string
  system_stock: number
  physical_stock: number
  gap: number
  gap_sources: {
    cancelled_orders_not_restocked: number
    lost_returns: number
    bonus_promo_sample: number
    damaged_expired: number
    unexplained: number
  }
}

export interface DailyReconciliationReport {
  run_date: string
  total_products: number
  products_with_anomaly: number
  anomalies: AnomalyFlag[]
}

export interface AnomalyFlag {
  product_id: string
  product_name: string
  type: string
  description: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
}

export interface ConsistencyReport {
  is_consistent: boolean
  negative_stock_items: { product_id: string; batch_id: string; qty: number }[]
  orphan_references: string[]
}

// ─── Simulation Payload Types ────────────────────────────────

export interface SimOrderCreatedPayload {
  external_order_id: string
  marketplace: Marketplace
  customer_name: string
  items: { product_id: string; qty: number; bundle_sku?: string }[]
}

export interface SimOrderStatusPayload {
  external_order_id: string
  marketplace: Marketplace
  new_status: 'SHIPPED' | 'IN_TRANSIT' | 'CANCELLED' | 'DELIVERED'
}

export interface SimReturnRequestedPayload {
  external_order_id: string
  marketplace: Marketplace
  external_return_id: string
  items: { product_id: string; qty: number }[]
}
