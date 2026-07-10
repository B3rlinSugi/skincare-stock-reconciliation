-- migration_6.sql: Master Data (Categories, Suppliers) & Audit Logs

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create suppliers table
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Update products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id),
  ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES suppliers(id),
  ADD COLUMN IF NOT EXISTS min_stock_threshold INTEGER DEFAULT 100,
  ADD COLUMN IF NOT EXISTS price DECIMAL(15,2) DEFAULT 0.00;

-- 4. Set up RLS for categories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON categories FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow read for anon" ON categories FOR SELECT TO anon USING (true);

-- 5. Set up RLS for suppliers
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for authenticated" ON suppliers FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow read for anon" ON suppliers FOR SELECT TO anon USING (true);

-- 6. Insert default categories for testing
INSERT INTO categories (name, description) VALUES
('Skincare', 'Perawatan wajah dan kulit'),
('Bodycare', 'Perawatan tubuh'),
('Haircare', 'Perawatan rambut')
ON CONFLICT (name) DO NOTHING;
