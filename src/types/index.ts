// =====================
// DOMAIN TYPES
// =====================

/** Cabang / Branch */
export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

/** User profile (extends Supabase auth.users) */
export interface UserProfile {
  id: string
  full_name: string
  role: 'owner' | 'manager' | 'staff'
  branch_id: string | null
  avatar_url?: string
  is_active?: boolean
}

/** Metode Pembayaran */
export interface PaymentMethod {
  id: string
  name: string
  mdr_rate: number
  settlement_days: number
  is_active: boolean
  created_at?: string
}

/** Penjualan Harian */
export interface DailySale {
  id: string
  branch_id: string
  sale_date: string
  payment_method_id: string
  amount: number
  notes?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

/** Setoran Tunai */
export interface CashDeposit {
  id: string
  branch_id: string
  deposit_date: string
  amount: number
  notes?: string
  created_by?: string
  created_at?: string
}

/** Transaksi Kas Kecil */
export interface PettyCashTransaction {
  id: string
  branch_id: string
  transaction_date: string
  category: string
  category_id?: string
  description: string
  amount: number
  type: 'expense' | 'topup'
  receipt_url?: string
  created_by?: string
  created_at?: string
  updated_at?: string
}

/** Rekening Bank */
export interface BankAccount {
  id: string
  bank_name: string
  account_number: string
  account_name: string
  is_active?: boolean
  created_at?: string
}

/** Mutasi Bank */
export interface BankMutation {
  id: string
  bank_account_id: string
  mutation_date: string
  amount: number
  description?: string
  reference_number?: string
  is_reconciled: boolean
  created_by?: string
  created_at?: string
  updated_at?: string
}

/** Rekonsiliasi */
export interface Reconciliation {
  id: string
  branch_id: string
  sale_date: string
  payment_method_id: string
  expected_amount: number
  mdr_amount: number
  expected_settlement: number
  actual_amount?: number
  settlement_date?: string
  bank_mutation_id?: string
  status: 'pending' | 'matched' | 'discrepancy' | 'resolved'
  discrepancy_amount: number
  notes?: string
  reconciled_by?: string
  created_at?: string
  updated_at?: string
}

/** Kategori PnL */
export interface PnlCategory {
  id: string
  name: string
  type: 'revenue' | 'cogs' | 'operating_expense' | 'other_income' | 'other_expense'
  is_auto: boolean
  source_module?: string
  sort_order?: number
  is_active?: boolean
}

/** PnL Entry */
export interface PnlEntry {
  id: string
  branch_id: string
  period_month: number
  period_year: number
  category_id: string
  amount: number
  notes?: string
  is_auto_calculated?: boolean
  created_by?: string
}

/** Kategori Pengeluaran Kas Kecil */
export interface ExpenseCategory {
  id: string
  name: string
  is_active: boolean
}

// =====================
// PNL CALCULATION TYPES
// =====================

export interface PnlRevenue {
  omset: number
  pendapatanLainRevenue: number
}

export interface PnlHpp {
  cogs: number
}

export interface PnlOpex {
  kasKecil: number
  gajiKomisi: number
  sewaToko: number
  marketing: number
  penyusutan: number
}

export interface PnlOther {
  pendapatanLain: number
  bebanLain: number
}

export interface PnlData {
  revenue: PnlRevenue
  hpp: PnlHpp
  opex: PnlOpex
  other: PnlOther
}

export interface PnlSaveValues {
  cogs?: number
  sewaToko?: number
  marketing?: number
  penyusutan?: number
  pendapatanLain?: number
  bebanLain?: number
  pendapatanLainRevenue?: number
}

// =====================
// UI TYPES
// =====================

export type Theme = 'light' | 'dark'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastMessage {
  id: string
  type: ToastType
  message: string
  duration?: number
}

// =====================
// LOCAL STORAGE TYPES (Demo Mode)
// =====================

export interface LocalSaleRecord {
  id: string
  branchId: string
  dateStr: string
  totalOmset: number
  totalRetur: number
  payments: Record<string, number>
  rpieces?: number
  notes?: string
  createdAt: string
}

export interface LocalPettyCashRecord {
  id: string
  branchId: string
  dateStr: string
  type: 'expense' | 'topup'
  category: string
  description: string
  amount: number
  receiptUrl?: string
  createdAt: string
}

export interface LocalCashDepositRecord {
  id: string
  branchId: string
  depositDate: string
  amount: number
  notes?: string
  createdAt: string
}

export interface LocalPnlEntry {
  branchId: string
  month: number
  year: number
  cogs: number
  sewaToko: number
  marketing: number
  penyusutan: number
  pendapatanLain: number
  bebanLain: number
  pendapatanLainRevenue: number
}

// =====================
// PERCENTAGE CHANGE
// =====================

export interface PercentageChange {
  value: number
  positive: boolean
}
