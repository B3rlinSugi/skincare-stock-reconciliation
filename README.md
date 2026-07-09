<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/hexagon.svg" alt="Logo" width="80" height="80">
  <h1 align="center">Skincare Stock Reconciliation System</h1>
  <p align="center">
    <strong>Enterprise-Grade Append-Only Warehouse Management System</strong>
  </p>
  <p align="center">
    A robust, fraud-proof stock management system engineered for high-volume Skincare brands, featuring real-time reconciliation, FEFO allocation, and immutable ledger architecture.
  </p>

  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
    <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" alt="Framer Motion" />
  </p>
</div>

<hr />

## 📖 Project Overview

Managing physical warehouse inventory in the fast-paced e-commerce environment (TikTok Shop, Shopee) often leads to discrepancies between systemic data and physical stock. This project solves the **"Ghost Stock"** and **"Data Tampering"** problems by moving away from traditional CRUD (Create-Read-Update-Delete) stock management into an **Append-Only Ledger Architecture**.

### The Business Problem
1. **Data Leakage & Fraud:** Warehouse operators manually overriding stock quantities `(UPDATE products SET qty = 100)` to hide missing items.
2. **Expiry Management Chaos:** Sending nearly expired products to end customers due to the lack of strict batch management.
3. **Reconciliation Nightmares:** Unexplained deltas between physical Stock Opname (Stocktake) and system counts.
4. **Returns Mismanagement:** Damaged goods from TikTok/Shopee returns accidentally being mixed back into the resellable inventory.

---

## ✨ Key Features

- **Immutable Stock Ledger:** Every single movement (Inbound, Outbound, Adjustments) is recorded as a transactional row. The current stock is purely a materialized derivation `SUM(quantity)` of the ledger. You cannot edit stock; you can only append a new movement.
- **Strict FEFO (First Expired, First Out) Allocation:** The system tracks inventory by specific *Batch Codes* and *Expiry Dates*. When items are sold, the system autonomously deducts from the batch closest to expiration.
- **Atomic Voiding:** Mistakes happen. Instead of deleting an erroneous entry (which destroys the audit trail), the system issues an inverse ledger transaction (Void) wrapped in PostgreSQL transactions.
- **Delta-Aware Stock Opname:** When performing a physical stocktake, the system calculates the delta against the *exact* ledger state at the time of calculation, preventing concurrency race conditions if an order comes in during the physical count.
- **Returns Inspection Workflow:** Returned orders are quarantined until an operator classifies them as `RESELLABLE` (goes back to stock) or `DAMAGED` / `LOST` (written off).
- **Premium User Interface:** Inspired by Linear and Apple, featuring OLED Dark Mode, Framer Motion spring physics, bento-grid dashboards, and animated interactions.

---

## 🏗️ Architecture Overview

The application utilizes a Serverless Monolith architecture heavily leveraging PostgreSQL capabilities.

- **Frontend:** Next.js 14 App Router (React Server Components for data fetching, Client Components for interactive UI).
- **Styling:** Custom UI components with pure CSS modules utilizing modern CSS variables for a strict design system.
- **Database:** Supabase (PostgreSQL 15).
- **Performance Layer:** Database Triggers and O(1) Summary Tables. We avoid heavy `SUM()` aggregations on page load by maintaining asynchronous trigger-based summary tables (`product_stock_summary`), capable of handling millions of ledger rows with sub-10ms query times.

For detailed architecture diagrams, refer to the [ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## 🛠️ Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 14 (App Router) | Server-side rendering, routing, API endpoints |
| **Language** | TypeScript | End-to-end type safety |
| **Database** | PostgreSQL (Supabase) | Primary datastore, RLS, Triggers, Functions |
| **Auth** | Supabase Auth | Secure session management & SSR integration |
| **Animations** | Framer Motion | Fluid spring physics and layout animations |
| **Icons** | Lucide React | Consistent, scalable SVG iconography |
| **Deployment** | Vercel | Global edge delivery and CI/CD |

---

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18.17+
- A Supabase Project (Free tier is sufficient)
- Git

### 1. Clone the repository
```bash
git clone https://github.com/B3rlinSugi/skincare-stock-reconciliation.git
cd skincare-stock-reconciliation
```

### 2. Environment Setup
Copy the example environment file and fill in your Supabase credentials:
```bash
cp .env.example .env.local
```
Fill `.env.local` with:
```env
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=ey...
SUPABASE_SERVICE_ROLE_KEY=ey...
```

### 3. Database Migration
Run the SQL scripts located in the root directory in your Supabase SQL Editor in the following exact order:
1. `schema.sql`
2. `migration_1.sql` (Seed Data)
3. `migration_2.sql` (Core Procedures)
4. `migration_3.sql` (Void Procedures)
5. `migration_4.sql` (Opname Concurrency Fixes)
6. `migration_5.sql` (O(1) Summary Tables & Triggers)

### 4. Install Dependencies & Run
```bash
npm install
npm run dev
```
Access the application at `http://localhost:3000`.

---

## 📂 Project Structure & Documentation

Detailed engineering documentation can be found in the `/docs` directory:
- 🏛️ [**Architecture & Data Flow**](docs/ARCHITECTURE.md)
- 🗄️ [**Database Schema & Indexes**](docs/DATABASE_SCHEMA.md)
- 📜 [**Business Rules (FEFO, Opname)**](docs/BUSINESS_RULES.md)
- 🔌 [**Future API / Webhook Design**](docs/API_DESIGN.md)

---

## ☁️ Deployment (Vercel)

1. Push this repository to your GitHub.
2. Go to [Vercel](https://vercel.com) and import the repository.
3. Ensure the Framework Preset is `Next.js`.
4. Add the 3 environment variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
5. Click **Deploy**.

---

## 🔮 Future Improvements
- **Marketplace Webhooks:** Native bidirectional sync with Shopee Open Platform and TikTok Shop Partner API for zero-touch order deductions.
- **Event Sourcing:** Migrating the PostgreSQL Append-Only ledger to a true Event Sourcing architecture (e.g., Apache Kafka) for multi-warehouse scaling.
- **Hardware Integrations:** IoT scales for weight-based reconciliation and automated dimensioning.

---

## 👨‍💻 Author

**Berlin Sugiyanto**  
Senior Software Engineer / Product Architect  
*[GitHub Profile](https://github.com/B3rlinSugi)*

---

<div align="center">
  <sub>Built with precision and extreme attention to detail.</sub>
</div>
