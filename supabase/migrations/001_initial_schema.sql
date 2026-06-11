-- =============================================
-- Raja Aksesoris - Database Migration
-- Initial Schema Setup
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================
-- MASTER DATA
-- =====================

-- Cabang/Branch
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  address TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Profiles (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'staff')),
  branch_id UUID REFERENCES branches(id),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Metode Pembayaran
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  mdr_rate DECIMAL(5,4) DEFAULT 0,
  settlement_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- PENJUALAN HARIAN
-- =====================

CREATE TABLE IF NOT EXISTS daily_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  sale_date DATE NOT NULL,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, sale_date, payment_method_id)
);

-- =====================
-- BANK RECONCILIATION
-- =====================

CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bank_mutations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  mutation_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_number TEXT,
  is_reconciled BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  sale_date DATE NOT NULL,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id),
  expected_amount DECIMAL(15,2) NOT NULL,
  mdr_amount DECIMAL(15,2) DEFAULT 0,
  expected_settlement DECIMAL(15,2) NOT NULL,
  actual_amount DECIMAL(15,2),
  settlement_date DATE,
  bank_mutation_id UUID REFERENCES bank_mutations(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'matched', 'discrepancy', 'resolved')),
  discrepancy_amount DECIMAL(15,2) DEFAULT 0,
  notes TEXT,
  reconciled_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- KAS KECIL / PETTY CASH
-- =====================

CREATE TABLE IF NOT EXISTS expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS petty_cash (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  transaction_date DATE NOT NULL,
  category_id UUID NOT NULL REFERENCES expense_categories(id),
  description TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('expense', 'topup')),
  receipt_url TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- PAYROLL
-- =====================

CREATE TABLE IF NOT EXISTS employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id),
  full_name TEXT NOT NULL,
  branch_id UUID NOT NULL REFERENCES branches(id),
  position TEXT,
  base_salary DECIMAL(15,2) NOT NULL DEFAULT 0,
  daily_meal_allowance DECIMAL(15,2) DEFAULT 0,
  join_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  working_days INTEGER NOT NULL,
  base_salary DECIMAL(15,2) NOT NULL,
  meal_allowance DECIMAL(15,2) NOT NULL,
  other_allowance DECIMAL(15,2) DEFAULT 0,
  deductions DECIMAL(15,2) DEFAULT 0,
  loan_deduction DECIMAL(15,2) DEFAULT 0,
  bonus DECIMAL(15,2) DEFAULT 0,
  target_commission DECIMAL(15,2) DEFAULT 0,
  brand_commission DECIMAL(15,2) DEFAULT 0,
  total_salary DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
  approved_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS employee_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  loan_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  remaining_amount DECIMAL(15,2) NOT NULL,
  monthly_deduction DECIMAL(15,2),
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paid_off')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- KOMISI SALES
-- =====================

CREATE TABLE IF NOT EXISTS sales_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  target_lower DECIMAL(15,2) NOT NULL,
  target_upper DECIMAL(15,2) NOT NULL,
  commission_rate_lower DECIMAL(5,4),
  commission_rate_upper DECIMAL(5,4),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, period_month, period_year)
);

CREATE TABLE IF NOT EXISTS brand_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_name TEXT NOT NULL,
  commission_rate DECIMAL(5,4) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS brand_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id),
  brand_commission_id UUID NOT NULL REFERENCES brand_commissions(id),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  total_sales DECIMAL(15,2) NOT NULL,
  commission_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- PnL
-- =====================

CREATE TABLE IF NOT EXISTS pnl_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'cogs', 'operating_expense', 'other_income', 'other_expense')),
  is_auto BOOLEAN DEFAULT false,
  source_module TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pnl_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id),
  period_month INTEGER NOT NULL,
  period_year INTEGER NOT NULL,
  category_id UUID NOT NULL REFERENCES pnl_categories(id),
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  notes TEXT,
  is_auto_calculated BOOLEAN DEFAULT false,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(branch_id, period_month, period_year, category_id)
);

-- =====================
-- AUDIT TRAIL
-- =====================

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================
-- SEED DATA
-- =====================

-- Insert 5 branches
INSERT INTO branches (name, address) VALUES
  ('Mojokerto', 'Mojokerto, Jawa Timur'),
  ('Jombang', 'Jombang, Jawa Timur'),
  ('Kediri', 'Kediri, Jawa Timur'),
  ('Mojoagung', 'Mojoagung, Jombang, Jawa Timur'),
  ('Tulungagung', 'Tulungagung, Jawa Timur')
ON CONFLICT (name) DO NOTHING;

-- Insert payment methods with MDR rates
INSERT INTO payment_methods (name, mdr_rate, settlement_days) VALUES
  ('Cash', 0, 0),
  ('Transfer Bank', 0, 1),
  ('QRIS', 0.007, 1),
  ('Debit', 0.006, 1),
  ('Kartu Kredit', 0.022, 2),
  ('Marketplace', 0.03, 3)
ON CONFLICT (name) DO NOTHING;

-- Insert expense categories
INSERT INTO expense_categories (name) VALUES
  ('Supplies / Perlengkapan'),
  ('Biaya Operasional'),
  ('Ongkos Kirim'),
  ('Transport Antar Cabang'),
  ('Perbaikan / Maintenance'),
  ('Makan Event'),
  ('Lain-lain')
ON CONFLICT (name) DO NOTHING;

-- Insert PnL categories
INSERT INTO pnl_categories (name, type, is_auto, source_module, sort_order) VALUES
  ('Omset Penjualan', 'revenue', true, 'daily_sales', 1),
  ('HPP / COGS', 'cogs', false, NULL, 2),
  ('Biaya Operasional (Kas Kecil)', 'operating_expense', true, 'petty_cash', 3),
  ('Gaji & Komisi Karyawan', 'operating_expense', true, 'payroll', 4),
  ('Sewa Toko', 'operating_expense', false, NULL, 5),
  ('Marketing / Iklan', 'operating_expense', false, NULL, 6),
  ('Penyusutan Aset', 'operating_expense', false, NULL, 7),
  ('Pendapatan Lain-lain', 'other_income', false, NULL, 8),
  ('Beban Lain-lain', 'other_expense', false, NULL, 9)
ON CONFLICT DO NOTHING;

-- =====================
-- ROW LEVEL SECURITY (RLS)
-- =====================

-- Enable RLS on all tables
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_mutations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE petty_cash ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE pnl_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function to get user branch
CREATE OR REPLACE FUNCTION get_user_branch()
RETURNS UUID AS $$
  SELECT branch_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- ========== PROFILES ==========
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Owner/Manager can view all profiles" ON profiles
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner can manage profiles" ON profiles
  FOR ALL USING (get_user_role() = 'owner');

-- ========== BRANCHES ==========
CREATE POLICY "Everyone can view branches" ON branches
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage branches" ON branches
  FOR ALL USING (get_user_role() = 'owner');

-- ========== PAYMENT METHODS ==========
CREATE POLICY "Everyone can view payment methods" ON payment_methods
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage payment methods" ON payment_methods
  FOR ALL USING (get_user_role() = 'owner');

-- ========== DAILY SALES ==========
CREATE POLICY "Owner/Manager can view all sales" ON daily_sales
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Staff can view own branch sales" ON daily_sales
  FOR SELECT USING (
    get_user_role() = 'staff' AND branch_id = get_user_branch()
  );

CREATE POLICY "Owner/Manager can manage all sales" ON daily_sales
  FOR ALL USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Staff can insert own branch sales" ON daily_sales
  FOR INSERT WITH CHECK (
    get_user_role() = 'staff' AND branch_id = get_user_branch()
  );

-- ========== BANK ACCOUNTS ==========
CREATE POLICY "Owner/Manager can view bank accounts" ON bank_accounts
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner can manage bank accounts" ON bank_accounts
  FOR ALL USING (get_user_role() = 'owner');

-- ========== BANK MUTATIONS ==========
CREATE POLICY "Owner/Manager can view mutations" ON bank_mutations
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner/Manager can manage mutations" ON bank_mutations
  FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- ========== RECONCILIATIONS ==========
CREATE POLICY "Owner/Manager can view reconciliations" ON reconciliations
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner/Manager can manage reconciliations" ON reconciliations
  FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- ========== EXPENSE CATEGORIES ==========
CREATE POLICY "Everyone can view expense categories" ON expense_categories
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage expense categories" ON expense_categories
  FOR ALL USING (get_user_role() = 'owner');

-- ========== PETTY CASH ==========
CREATE POLICY "Owner/Manager can view all petty cash" ON petty_cash
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Staff can view own branch petty cash" ON petty_cash
  FOR SELECT USING (
    get_user_role() = 'staff' AND branch_id = get_user_branch()
  );

CREATE POLICY "Staff can insert own branch petty cash" ON petty_cash
  FOR INSERT WITH CHECK (
    get_user_role() = 'staff' AND branch_id = get_user_branch()
  );

CREATE POLICY "Owner/Manager can manage all petty cash" ON petty_cash
  FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- ========== EMPLOYEES ==========
CREATE POLICY "Owner/Manager can view employees" ON employees
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner can manage employees" ON employees
  FOR ALL USING (get_user_role() = 'owner');

-- ========== PAYROLL ==========
CREATE POLICY "Owner/Manager can view payroll" ON payroll
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner can manage payroll" ON payroll
  FOR ALL USING (get_user_role() = 'owner');

-- ========== EMPLOYEE LOANS ==========
CREATE POLICY "Owner/Manager can view loans" ON employee_loans
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner can manage loans" ON employee_loans
  FOR ALL USING (get_user_role() = 'owner');

-- ========== SALES TARGETS ==========
CREATE POLICY "Owner/Manager can view targets" ON sales_targets
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner can manage targets" ON sales_targets
  FOR ALL USING (get_user_role() = 'owner');

-- ========== BRAND COMMISSIONS ==========
CREATE POLICY "Owner/Manager can view brand commissions" ON brand_commissions
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner can manage brand commissions" ON brand_commissions
  FOR ALL USING (get_user_role() = 'owner');

-- ========== BRAND SALES ==========
CREATE POLICY "Owner/Manager can view brand sales" ON brand_sales
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner/Manager can manage brand sales" ON brand_sales
  FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- ========== PNL CATEGORIES ==========
CREATE POLICY "Everyone can view PnL categories" ON pnl_categories
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage PnL categories" ON pnl_categories
  FOR ALL USING (get_user_role() = 'owner');

-- ========== PNL ENTRIES ==========
CREATE POLICY "Owner/Manager can view PnL entries" ON pnl_entries
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

CREATE POLICY "Owner/Manager can manage PnL entries" ON pnl_entries
  FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- ========== AUDIT LOGS ==========
CREATE POLICY "Owner can view audit logs" ON audit_logs
  FOR SELECT USING (get_user_role() = 'owner');

CREATE POLICY "Authenticated users can insert audit logs" ON audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================
-- TRIGGERS
-- =====================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_branches BEFORE UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_daily_sales BEFORE UPDATE ON daily_sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_bank_mutations BEFORE UPDATE ON bank_mutations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_reconciliations BEFORE UPDATE ON reconciliations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_petty_cash BEFORE UPDATE ON petty_cash
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_employees BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_payroll BEFORE UPDATE ON payroll
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_updated_at_pnl_entries BEFORE UPDATE ON pnl_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================
-- INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS idx_daily_sales_branch_date ON daily_sales(branch_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_bank_mutations_date ON bank_mutations(mutation_date);
CREATE INDEX IF NOT EXISTS idx_reconciliations_date ON reconciliations(sale_date);
CREATE INDEX IF NOT EXISTS idx_reconciliations_status ON reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_petty_cash_branch_date ON petty_cash(branch_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_payroll_period ON payroll(period_month, period_year);
CREATE INDEX IF NOT EXISTS idx_pnl_entries_period ON pnl_entries(branch_id, period_month, period_year);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name, created_at);
