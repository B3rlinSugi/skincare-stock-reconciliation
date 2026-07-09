# Business Rules & Operational Procedures

This document outlines the strict business rules hardcoded into the system to prevent fraud, human error, and stock discrepancies.

## 1. FEFO (First Expired, First Out) Allocation
When a product leaves the warehouse (Outbound / Sold), the system autonomously decides which physical batch the items should be deducted from.

**Rule:** 
- The system queries all active batches for the given `product_id` where `current_qty > 0`.
- It sorts them by `expiry_date ASC`.
- It deducts the requested quantity iteratively. If the oldest batch does not have enough stock, it zeroes out the oldest batch and deducts the remainder from the second oldest batch.
- **Warehouse Staff Must Follow the Screen:** The UI instructs the packer exactly which `Batch Code` to pull from the shelf.

## 2. Returns Inspection & Quarantine
E-commerce platforms (Shopee/TikTok) often have high return rates due to failed deliveries (COD).

**Rule:**
- Returned items do NOT immediately re-enter sellable stock.
- They are processed via the `Returns` workflow.
- **Condition: RESELLABLE** -> Generates an `INBOUND` (Channel: RETURN) transaction, adding stock back to the system.
- **Condition: DAMAGED** -> Stock is considered lost/written off. No positive ledger transaction is made. It is kept for financial accounting purposes only.

## 3. Stocktake (Opname) Logic
Physical counting is required periodically to align system data with reality.

**Rule:**
- Operator inputs the *Physical Count* (e.g., 95).
- The system checks the *Expected Count* at that exact moment (e.g., 100).
- The Delta is `-5`.
- The system appends an `OPNAME_ADJUSTMENT` transaction for `-5`.
- This ensures that if a web order of `-2` arrives during the 5 minutes the operator was counting, the final stock correctly resolves to 93 (`100 (initial) - 5 (opname) - 2 (web order) = 93`), rather than violently overriding the stock to 95 and losing the web order data.

## 4. Voiding Transactions (Anti-Tampering)
Operators cannot delete mistakes. If an inbound of 100 units was a typo (should be 10), they cannot edit the "100" to "10".

**Rule:**
- Operator clicks "Void" on the transaction of +100.
- The system creates a NEW transaction: `SYSTEM_CORRECTION` of -100.
- The original transaction is marked `is_voided = TRUE` and linked to the correction.
- The operator then creates a fresh inbound of +10.
- Result: Full audit trail is preserved for the finance team.
