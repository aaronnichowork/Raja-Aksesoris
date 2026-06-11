'use client'

import { useState, useMemo, useEffect } from 'react'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'

// ===========================================================================
// Local Types for Settings Page
// ===========================================================================

interface SettingsBranch {
  id: number
  name: string
  address: string
  phone: string
  active: boolean
}

interface SettingsPaymentMethod {
  id: number
  name: string
  mdrRate: number
  settlementDays: number
  active: boolean
}

interface SettingsUser {
  id: number
  name: string
  email: string
  role: string
  branch: string
  active: boolean
}

interface SettingsPnlCategory {
  id: number | string
  name: string
  type: string
  autoManual: string
  source: string
}

interface SettingsBankAccount {
  id: number
  bank: string
  accountNumber: string
  accountName: string
  active: boolean
}

interface ModalState {
  mode: 'add' | 'edit'
  data?: Record<string, unknown>
}

interface BranchForm {
  name: string
  address: string
  phone: string
}

interface PaymentForm {
  name: string
  mdrRate: string
  settlementDays: string
}

interface UserForm {
  name: string
  email: string
  password: string
  role: string
  branch: string
}

interface PnlCategoryForm {
  name: string
  type: string
  autoManual: string
  source: string
}

interface BankAccountForm {
  bank: string
  accountNumber: string
  accountName: string
}

interface TabDefinition {
  id: string
  label: string
  icon: () => React.JSX.Element
}

// ===========================================================================
// Demo Data
// ===========================================================================
const INITIAL_BRANCHES: SettingsBranch[] = [
  { id: 1, name: 'Mojokerto', address: 'Jl. Raya Mojokerto No. 45, Mojokerto', phone: '0321-123456', active: true },
  { id: 2, name: 'Jombang', address: 'Jl. KH Wahid Hasyim No. 12, Jombang', phone: '0321-654321', active: true },
  { id: 3, name: 'Kediri', address: 'Jl. Dhoho No. 88, Kediri', phone: '0354-112233', active: true },
  { id: 4, name: 'Mojoagung', address: 'Jl. Raya Mojoagung No. 67, Jombang', phone: '0321-789012', active: true },
  { id: 5, name: 'Tulungagung', address: 'Jl. Pahlawan No. 23, Tulungagung', phone: '0355-321654', active: true },
]

const INITIAL_PAYMENT_METHODS: SettingsPaymentMethod[] = [
  { id: 1, name: 'Cash', mdrRate: 0, settlementDays: 0, active: true },
  { id: 2, name: 'Transfer Bank', mdrRate: 0, settlementDays: 1, active: true },
  { id: 3, name: 'QRIS', mdrRate: 0.7, settlementDays: 1, active: true },
  { id: 4, name: 'Debit', mdrRate: 0.6, settlementDays: 1, active: true },
  { id: 5, name: 'Kartu Kredit', mdrRate: 2.2, settlementDays: 2, active: true },
  { id: 6, name: 'Shopee', mdrRate: 3, settlementDays: 3, active: true },
  { id: 7, name: 'TikTok', mdrRate: 3, settlementDays: 3, active: true },
]

const INITIAL_USERS: SettingsUser[] = [
  { id: 1, name: 'Johan Pratama', email: 'johan@rajaaksesoris.com', role: 'owner', branch: 'Semua Cabang', active: true },
  { id: 2, name: 'Rina Sari', email: 'rina@rajaaksesoris.com', role: 'manager', branch: 'Mojokerto', active: true },
  { id: 3, name: 'Budi Santoso', email: 'budi@rajaaksesoris.com', role: 'staff', branch: 'Jombang', active: true },
]

const INITIAL_PNL_CATEGORIES: SettingsPnlCategory[] = [
  { id: 1, name: 'Omset Penjualan', type: 'Revenue', autoManual: 'auto', source: 'Penjualan Harian' },
  { id: 2, name: 'HPP / COGS', type: 'COGS', autoManual: 'manual', source: '—' },
  { id: 3, name: 'Biaya Operasional (Kas Kecil)', type: 'Operating Expense', autoManual: 'auto', source: 'Kas Kecil' },
  { id: 4, name: 'Gaji & Komisi', type: 'Operating Expense', autoManual: 'auto', source: 'Payroll' },
  { id: 5, name: 'Sewa Toko', type: 'Operating Expense', autoManual: 'manual', source: '—' },
  { id: 6, name: 'Marketing / Iklan', type: 'Operating Expense', autoManual: 'manual', source: '—' },
  { id: 7, name: 'Penyusutan Aset', type: 'Operating Expense', autoManual: 'manual', source: '—' },
  { id: 8, name: 'Pendapatan Lain-lain', type: 'Other Revenue', autoManual: 'manual', source: '—' },
  { id: 9, name: 'Beban Lain-lain', type: 'Other Expense', autoManual: 'manual', source: '—' },
]

const INITIAL_BANK_ACCOUNTS: SettingsBankAccount[] = [
  { id: 1, bank: 'BCA', accountNumber: '1234567890', accountName: 'PT Raja Aksesoris', active: true },
]

// ===========================================================================
// SVG Icons
// ===========================================================================
function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 3V15M3 9H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M11.5 2.5L13.5 4.5L6 12L3 12.5L3.5 9.5L11.5 2.5Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 4H13M5 4V3C5 2.44772 5.44772 2 6 2H10C10.5523 2 11 2.44772 11 3V4M6 7V12M10 7V12M4 4L5 14H11L12 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 12L16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4 4L14 14M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ===========================================================================
// Tab icons
// ===========================================================================
function BranchTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 15V6L5 3L8 6V15M8 15V8L11 5.5L14 8V15M14 15V10L16 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 15H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PaymentTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7.5H16" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 11H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function UsersTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 15C2 12.2386 4.23858 10 7 10C9.76142 10 12 12.2386 12 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="13" cy="6" r="2" stroke="currentColor" strokeWidth="1.3" />
      <path d="M13 10C14.6569 10 16 11.3431 16 13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function CategoryTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="2" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10" y="10" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function BankTabIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 7L9 3L16 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 7V13M8 7V13M10 7V13M14 7V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M2 13H16M2 15H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ===========================================================================
// Modal component (inline)
// ===========================================================================
interface ModalProps {
  title: string
  onClose: () => void
  children: React.ReactNode
  size?: 'lg'
}

function Modal({ title, onClose, children, size }: ModalProps) {
  return (
    <div className="modal-overlay" onClick={(e: React.MouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`modal ${size === 'lg' ? 'modal-lg' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Tutup">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ===========================================================================
// Role badge
// ===========================================================================
function RoleBadge({ role }: { role: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    owner: { cls: 'badge-primary', label: 'Owner' },
    manager: { cls: 'badge-info', label: 'Manager' },
    staff: { cls: 'badge-warning', label: 'Staff' },
  }
  const { cls, label } = map[role] || { cls: '', label: role }
  return <span className={`badge ${cls}`}>{label}</span>
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`badge ${active ? 'badge-success' : 'badge-danger'}`}>
      <span className="badge-dot" />
      {active ? 'Aktif' : 'Nonaktif'}
    </span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    Revenue: 'badge-success',
    COGS: 'badge-warning',
    'Operating Expense': 'badge-danger',
    'Other Revenue': 'badge-info',
    'Other Expense': 'badge-pending',
  }
  return <span className={`badge ${map[type] || ''}`}>{type}</span>
}

function AutoManualBadge({ value }: { value: string }) {
  return value === 'auto'
    ? <span className="badge badge-success">Otomatis</span>
    : <span className="badge">Manual</span>
}

// ===========================================================================
// Tab: Cabang
// ===========================================================================
function CabangTab() {
  const [branches, setBranches] = useState<SettingsBranch[]>(INITIAL_BRANCHES)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null) // null | { mode: 'add'|'edit', data }
  const [form, setForm] = useState<BranchForm>({ name: '', address: '', phone: '' })

  const filtered = useMemo(
    () => branches.filter((b: SettingsBranch) => b.name.toLowerCase().includes(search.toLowerCase()) || b.address.toLowerCase().includes(search.toLowerCase())),
    [branches, search]
  )

  const openAdd = () => {
    setForm({ name: '', address: '', phone: '' })
    setModal({ mode: 'add' })
  }

  const openEdit = (branch: SettingsBranch) => {
    setForm({ name: branch.name, address: branch.address, phone: branch.phone })
    setModal({ mode: 'edit', data: branch as unknown as Record<string, unknown> })
  }

  const handleSave = () => {
    if (!modal) return
    if (modal.mode === 'add') {
      setBranches((prev: SettingsBranch[]) => [...prev, { id: Date.now(), ...form, active: true }])
    } else {
      const editId = (modal.data as unknown as SettingsBranch)?.id
      setBranches((prev: SettingsBranch[]) => prev.map((b: SettingsBranch) => b.id === editId ? { ...b, ...form } : b))
    }
    setModal(null)
  }

  const handleDelete = (id: number) => {
    if (confirm('Hapus cabang ini?')) {
      setBranches((prev: SettingsBranch[]) => prev.filter((b: SettingsBranch) => b.id !== id))
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="input-search-wrapper" style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <SearchIcon />
          <input className="input" placeholder="Cari cabang..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} aria-label="Cari cabang" />
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <PlusIcon /> Tambah Cabang
        </button>
      </div>

      <div className="table-container table-mobile-cards">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Alamat</th>
              <th>Telepon</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((b: SettingsBranch) => (
              <tr key={b.id}>
                <td><span className="table-responsive-label">Nama: </span><span className="font-semibold">{b.name}</span></td>
                <td><span className="table-responsive-label">Alamat: </span>{b.address}</td>
                <td><span className="table-responsive-label">Telepon: </span>{b.phone}</td>
                <td><span className="table-responsive-label">Status: </span><StatusBadge active={b.active} /></td>
                <td>
                  <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(b)} aria-label={`Edit ${b.name}`}><EditIcon /></button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(b.id)} aria-label={`Hapus ${b.name}`}><TrashIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center text-secondary" style={{ padding: 'var(--space-8)' }}>Tidak ada cabang ditemukan</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Tambah Cabang' : 'Edit Cabang'} onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label" htmlFor="branch-name">Nama Cabang <span className="required">*</span></label>
                <input id="branch-name" className="input" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: BranchForm) => ({ ...p, name: e.target.value }))} placeholder="Contoh: Surabaya" />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="branch-address">Alamat</label>
                <input id="branch-address" className="input" value={form.address} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: BranchForm) => ({ ...p, address: e.target.value }))} placeholder="Jl. ..." />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="branch-phone">Telepon</label>
                <input id="branch-phone" className="input" value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: BranchForm) => ({ ...p, phone: e.target.value }))} placeholder="0321-..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ===========================================================================
// Tab: Metode Pembayaran
// ===========================================================================
function PaymentTab() {
  const [methods, setMethods] = useState<SettingsPaymentMethod[]>(INITIAL_PAYMENT_METHODS)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [form, setForm] = useState<PaymentForm>({ name: '', mdrRate: '', settlementDays: '' })

  const filtered = useMemo(
    () => methods.filter((m: SettingsPaymentMethod) => m.name.toLowerCase().includes(search.toLowerCase())),
    [methods, search]
  )

  const openAdd = () => {
    setForm({ name: '', mdrRate: '', settlementDays: '' })
    setModal({ mode: 'add' })
  }

  const openEdit = (method: SettingsPaymentMethod) => {
    setForm({ name: method.name, mdrRate: String(method.mdrRate), settlementDays: String(method.settlementDays) })
    setModal({ mode: 'edit', data: method as unknown as Record<string, unknown> })
  }

  const handleSave = () => {
    if (!modal) return
    const entry = {
      name: form.name,
      mdrRate: parseFloat(form.mdrRate) || 0,
      settlementDays: parseInt(form.settlementDays) || 0,
      active: true,
    }
    if (modal.mode === 'add') {
      setMethods((prev: SettingsPaymentMethod[]) => [...prev, { id: Date.now(), ...entry }])
    } else {
      const editId = (modal.data as unknown as SettingsPaymentMethod)?.id
      setMethods((prev: SettingsPaymentMethod[]) => prev.map((m: SettingsPaymentMethod) => m.id === editId ? { ...m, ...entry } : m))
    }
    setModal(null)
  }

  const handleDelete = (id: number) => {
    if (confirm('Hapus metode pembayaran ini?')) {
      setMethods((prev: SettingsPaymentMethod[]) => prev.filter((m: SettingsPaymentMethod) => m.id !== id))
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="input-search-wrapper" style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <SearchIcon />
          <input className="input" placeholder="Cari metode..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} aria-label="Cari metode pembayaran" />
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <PlusIcon /> Tambah Metode
        </button>
      </div>

      <div className="table-container table-mobile-cards">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th style={{ textAlign: 'right' }}>MDR Rate (%)</th>
              <th style={{ textAlign: 'center' }}>Settlement</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m: SettingsPaymentMethod) => (
              <tr key={m.id}>
                <td><span className="table-responsive-label">Nama: </span><span className="font-semibold">{m.name}</span></td>
                <td style={{ textAlign: 'right' }}><span className="table-responsive-label">MDR: </span>{m.mdrRate}%</td>
                <td style={{ textAlign: 'center' }}><span className="table-responsive-label">Settlement: </span><span className="badge">H+{m.settlementDays}</span></td>
                <td><span className="table-responsive-label">Status: </span><StatusBadge active={m.active} /></td>
                <td>
                  <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(m)} aria-label={`Edit ${m.name}`}><EditIcon /></button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(m.id)} aria-label={`Hapus ${m.name}`}><TrashIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center text-secondary" style={{ padding: 'var(--space-8)' }}>Tidak ada metode ditemukan</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Tambah Metode Pembayaran' : 'Edit Metode Pembayaran'} onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label" htmlFor="pay-name">Nama Metode <span className="required">*</span></label>
                <input id="pay-name" className="input" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: PaymentForm) => ({ ...p, name: e.target.value }))} placeholder="Contoh: GoPay" />
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label" htmlFor="pay-mdr">MDR Rate (%)</label>
                  <input id="pay-mdr" type="number" step="0.1" min="0" className="input" value={form.mdrRate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: PaymentForm) => ({ ...p, mdrRate: e.target.value }))} placeholder="0.7" />
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="pay-settle">Settlement (H+)</label>
                  <input id="pay-settle" type="number" min="0" className="input" value={form.settlementDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: PaymentForm) => ({ ...p, settlementDays: e.target.value }))} placeholder="1" />
                </div>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ===========================================================================
// Tab: Pengguna
// ===========================================================================
function UsersTab() {
  const [users, setUsers] = useState<SettingsUser[]>(INITIAL_USERS)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [form, setForm] = useState<UserForm>({ name: '', email: '', password: '', role: 'staff', branch: '' })

  const filtered = useMemo(
    () => users.filter((u: SettingsUser) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    ),
    [users, search]
  )

  const openAdd = () => {
    setForm({ name: '', email: '', password: '', role: 'staff', branch: '' })
    setModal({ mode: 'add' })
  }

  const openEdit = (user: SettingsUser) => {
    setForm({ name: user.name, email: user.email, password: '', role: user.role, branch: user.branch })
    setModal({ mode: 'edit', data: user as unknown as Record<string, unknown> })
  }

  const handleSave = () => {
    if (!modal) return
    const entry = {
      name: form.name,
      email: form.email,
      role: form.role,
      branch: form.role === 'staff' ? form.branch : 'Semua Cabang',
      active: true,
    }
    if (modal.mode === 'add') {
      setUsers((prev: SettingsUser[]) => [...prev, { id: Date.now(), ...entry }])
    } else {
      const editId = (modal.data as unknown as SettingsUser)?.id
      setUsers((prev: SettingsUser[]) => prev.map((u: SettingsUser) => u.id === editId ? { ...u, ...entry } : u))
    }
    setModal(null)
  }

  const handleDelete = (id: number) => {
    if (confirm('Hapus pengguna ini?')) {
      setUsers((prev: SettingsUser[]) => prev.filter((u: SettingsUser) => u.id !== id))
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="input-search-wrapper" style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <SearchIcon />
          <input className="input" placeholder="Cari pengguna..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} aria-label="Cari pengguna" />
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <PlusIcon /> Tambah Pengguna
        </button>
      </div>

      <div className="table-container table-mobile-cards">
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Email</th>
              <th>Role</th>
              <th>Cabang</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u: SettingsUser) => (
              <tr key={u.id}>
                <td><span className="table-responsive-label">Nama: </span><span className="font-semibold">{u.name}</span></td>
                <td><span className="table-responsive-label">Email: </span>{u.email}</td>
                <td><span className="table-responsive-label">Role: </span><RoleBadge role={u.role} /></td>
                <td><span className="table-responsive-label">Cabang: </span>{u.branch}</td>
                <td><span className="table-responsive-label">Status: </span><StatusBadge active={u.active} /></td>
                <td>
                  <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)} aria-label={`Edit ${u.name}`}><EditIcon /></button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(u.id)} aria-label={`Hapus ${u.name}`}><TrashIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center text-secondary" style={{ padding: 'var(--space-8)' }}>Tidak ada pengguna ditemukan</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Tambah Pengguna' : 'Edit Pengguna'} onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label" htmlFor="user-name">Nama Lengkap <span className="required">*</span></label>
                <input id="user-name" className="input" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: UserForm) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="user-email">Email <span className="required">*</span></label>
                <input id="user-email" type="email" className="input" value={form.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: UserForm) => ({ ...p, email: e.target.value }))} />
              </div>
              {modal.mode === 'add' && (
                <div className="input-group">
                  <label className="input-label" htmlFor="user-password">Password <span className="required">*</span></label>
                  <input id="user-password" type="password" className="input" value={form.password} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: UserForm) => ({ ...p, password: e.target.value }))} />
                </div>
              )}
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label" htmlFor="user-role">Role <span className="required">*</span></label>
                  <select id="user-role" className="select" value={form.role} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((p: UserForm) => ({ ...p, role: e.target.value }))}>
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                </div>
                {form.role === 'staff' && (
                  <div className="input-group">
                    <label className="input-label" htmlFor="user-branch">Cabang <span className="required">*</span></label>
                    <select id="user-branch" className="select" value={form.branch} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((p: UserForm) => ({ ...p, branch: e.target.value }))}>
                      <option value="">Pilih cabang...</option>
                      {INITIAL_BRANCHES.map((b: SettingsBranch) => <option key={b.id} value={b.name}>{b.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim() || !form.email.trim()}>Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ===========================================================================
// Tab: Kategori P&L
// ===========================================================================
function PnlCategoriesTab() {
  const [categories, setCategories] = useState<SettingsPnlCategory[]>([])
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [form, setForm] = useState<PnlCategoryForm>({ name: '', type: 'Revenue', autoManual: 'manual', source: '' })
  const [loading, setLoading] = useState(true)

  const supabaseActive = isSupabaseConfigured

  const loadCategories = async () => {
    setLoading(true)
    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data, error } = await supabase
            .from('pnl_categories')
            .select('*')
            .order('name')
          
          if (error) throw error

          const mapped: SettingsPnlCategory[] = (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            type: row.type === 'revenue' ? 'Revenue'
                  : row.type === 'cogs' ? 'COGS'
                  : row.type === 'operating_expense' ? 'Operating Expense'
                  : row.type === 'other_income' ? 'Other Revenue'
                  : 'Other Expense',
            autoManual: row.is_auto ? 'auto' : 'manual',
            source: row.source_module || '—'
          }))
          setCategories(mapped)
        }
      } catch (err) {
        console.error('Failed to load P&L categories from Supabase:', err)
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode
      try {
        let localCats = localStorage.getItem('raja-aksesoris-pnl-categories')
        if (!localCats) {
          localStorage.setItem('raja-aksesoris-pnl-categories', JSON.stringify(INITIAL_PNL_CATEGORIES))
          localCats = JSON.stringify(INITIAL_PNL_CATEGORIES)
        }
        setCategories(JSON.parse(localCats))
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadCategories()
  }, [])

  const filtered = useMemo(
    () => categories.filter((c: SettingsPnlCategory) => c.name.toLowerCase().includes(search.toLowerCase())),
    [categories, search]
  )

  const openAdd = () => {
    setForm({ name: '', type: 'Revenue', autoManual: 'manual', source: '' })
    setModal({ mode: 'add' })
  }

  const openEdit = (cat: SettingsPnlCategory) => {
    setForm({ name: cat.name, type: cat.type, autoManual: cat.autoManual, source: cat.source })
    setModal({ mode: 'edit', data: cat as unknown as Record<string, unknown> })
  }

  const handleSave = async () => {
    if (!modal) return

    const dbType = form.type === 'Revenue' ? 'revenue'
                 : form.type === 'COGS' ? 'cogs'
                 : form.type === 'Operating Expense' ? 'operating_expense'
                 : form.type === 'Other Revenue' ? 'other_income'
                 : 'other_expense'
    const isAuto = form.autoManual === 'auto'
    const sourceModule = isAuto ? form.source : null

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          if (modal.mode === 'add') {
            const { error } = await supabase
              .from('pnl_categories')
              .insert({
                name: form.name,
                type: dbType,
                is_auto: isAuto,
                source_module: sourceModule
              })
            if (error) throw error
          } else {
            const editId = (modal.data as unknown as SettingsPnlCategory)?.id
            const { error } = await supabase
              .from('pnl_categories')
              .update({
                name: form.name,
                type: dbType,
                is_auto: isAuto,
                source_module: sourceModule
              })
              .eq('id', editId)
            if (error) throw error
          }
        }
      } catch (err) {
        console.error('Failed to save P&L category:', err)
        alert('Gagal menyimpan kategori P&L.')
        return
      }
    } else {
      // Demo Mode
      const entry = {
        name: form.name,
        type: form.type,
        autoManual: form.autoManual,
        source: form.autoManual === 'auto' ? form.source : '—',
      }
      let updated: SettingsPnlCategory[] = []
      if (modal.mode === 'add') {
        updated = [...categories, { id: `cat-pnl-${Date.now()}`, ...entry }]
      } else {
        const editId = (modal.data as unknown as SettingsPnlCategory)?.id
        updated = categories.map((c: SettingsPnlCategory) => c.id === editId ? { ...c, ...entry } : c)
      }
      localStorage.setItem('raja-aksesoris-pnl-categories', JSON.stringify(updated))
    }

    setModal(null)
    loadCategories()
  }

  const handleDelete = async (id: number | string) => {
    if (!confirm('Hapus kategori ini?')) return

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { error } = await supabase
            .from('pnl_categories')
            .delete()
            .eq('id', id)
          if (error) throw error
        }
      } catch (err) {
        console.error('Failed to delete P&L category:', err)
        alert('Gagal menghapus kategori P&L. Kemungkinan kategori ini masih dirujuk oleh data lain.')
        return
      }
    } else {
      // Demo Mode
      const updated = categories.filter((c: SettingsPnlCategory) => c.id !== id)
      localStorage.setItem('raja-aksesoris-pnl-categories', JSON.stringify(updated))
    }

    loadCategories()
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="input-search-wrapper" style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <SearchIcon />
          <input className="input" placeholder="Cari kategori..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} aria-label="Cari kategori P&L" />
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <PlusIcon /> Tambah Kategori
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
          <span className="spinner" />
        </div>
      ) : (
        <div className="table-container table-mobile-cards">
          <table className="table">
            <thead>
              <tr>
                <th>Nama Kategori</th>
                <th>Tipe</th>
                <th>Auto/Manual</th>
                <th>Sumber</th>
                <th style={{ textAlign: 'right' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: SettingsPnlCategory) => (
                <tr key={c.id}>
                  <td><span className="table-responsive-label">Nama: </span><span className="font-semibold">{c.name}</span></td>
                  <td><span className="table-responsive-label">Tipe: </span><TypeBadge type={c.type} /></td>
                  <td><span className="table-responsive-label">Mode: </span><AutoManualBadge value={c.autoManual} /></td>
                  <td><span className="table-responsive-label">Sumber: </span>{c.source}</td>
                  <td>
                    <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)} aria-label={`Edit ${c.name}`}><EditIcon /></button>
                      <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(c.id)} aria-label={`Hapus ${c.name}`}><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center text-secondary" style={{ padding: 'var(--space-8)' }}>Tidak ada kategori ditemukan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Tambah Kategori P&L' : 'Edit Kategori P&L'} onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label" htmlFor="cat-name">Nama Kategori <span className="required">*</span></label>
                <input id="cat-name" className="input" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: PnlCategoryForm) => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label" htmlFor="cat-type">Tipe</label>
                  <select id="cat-type" className="select" value={form.type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((p: PnlCategoryForm) => ({ ...p, type: e.target.value }))}>
                    <option value="Revenue">Revenue</option>
                    <option value="COGS">COGS</option>
                    <option value="Operating Expense">Operating Expense</option>
                    <option value="Other Revenue">Other Revenue</option>
                    <option value="Other Expense">Other Expense</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label" htmlFor="cat-mode">Mode</label>
                  <select id="cat-mode" className="select" value={form.autoManual} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm((p: PnlCategoryForm) => ({ ...p, autoManual: e.target.value }))}>
                    <option value="manual">Manual</option>
                    <option value="auto">Otomatis</option>
                  </select>
                </div>
              </div>
              {form.autoManual === 'auto' && (
                <div className="input-group">
                  <label className="input-label" htmlFor="cat-source">Sumber Data</label>
                  <input id="cat-source" className="input" value={form.source} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: PnlCategoryForm) => ({ ...p, source: e.target.value }))} placeholder="Contoh: Kas Kecil" />
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.name.trim()}>Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ===========================================================================
// Tab: Rekening Bank
// ===========================================================================
function BankAccountsTab() {
  const [accounts, setAccounts] = useState<SettingsBankAccount[]>(INITIAL_BANK_ACCOUNTS)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState | null>(null)
  const [form, setForm] = useState<BankAccountForm>({ bank: '', accountNumber: '', accountName: '' })

  const filtered = useMemo(
    () => accounts.filter((a: SettingsBankAccount) =>
      a.bank.toLowerCase().includes(search.toLowerCase()) ||
      a.accountName.toLowerCase().includes(search.toLowerCase())
    ),
    [accounts, search]
  )

  const openAdd = () => {
    setForm({ bank: '', accountNumber: '', accountName: '' })
    setModal({ mode: 'add' })
  }

  const openEdit = (account: SettingsBankAccount) => {
    setForm({ bank: account.bank, accountNumber: account.accountNumber, accountName: account.accountName })
    setModal({ mode: 'edit', data: account as unknown as Record<string, unknown> })
  }

  const handleSave = () => {
    if (!modal) return
    const entry = { ...form, active: true }
    if (modal.mode === 'add') {
      setAccounts((prev: SettingsBankAccount[]) => [...prev, { id: Date.now(), ...entry }])
    } else {
      const editId = (modal.data as unknown as SettingsBankAccount)?.id
      setAccounts((prev: SettingsBankAccount[]) => prev.map((a: SettingsBankAccount) => a.id === editId ? { ...a, ...entry } : a))
    }
    setModal(null)
  }

  const handleDelete = (id: number) => {
    if (confirm('Hapus rekening ini?')) {
      setAccounts((prev: SettingsBankAccount[]) => prev.filter((a: SettingsBankAccount) => a.id !== id))
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="input-search-wrapper" style={{ flex: '1 1 240px', maxWidth: 360 }}>
          <SearchIcon />
          <input className="input" placeholder="Cari rekening..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} aria-label="Cari rekening bank" />
        </div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>
          <PlusIcon /> Tambah Rekening
        </button>
      </div>

      <div className="table-container table-mobile-cards">
        <table className="table">
          <thead>
            <tr>
              <th>Bank</th>
              <th>No Rekening</th>
              <th>Atas Nama</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a: SettingsBankAccount) => (
              <tr key={a.id}>
                <td><span className="table-responsive-label">Bank: </span><span className="font-semibold">{a.bank}</span></td>
                <td><span className="table-responsive-label">No Rek: </span><span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{a.accountNumber}</span></td>
                <td><span className="table-responsive-label">Nama: </span>{a.accountName}</td>
                <td><span className="table-responsive-label">Status: </span><StatusBadge active={a.active} /></td>
                <td>
                  <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(a)} aria-label={`Edit ${a.bank}`}><EditIcon /></button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => handleDelete(a.id)} aria-label={`Hapus ${a.bank}`}><TrashIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center text-secondary" style={{ padding: 'var(--space-8)' }}>Tidak ada rekening ditemukan</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.mode === 'add' ? 'Tambah Rekening Bank' : 'Edit Rekening Bank'} onClose={() => setModal(null)}>
          <div className="modal-body">
            <div className="flex flex-col gap-4">
              <div className="input-group">
                <label className="input-label" htmlFor="bank-name">Nama Bank <span className="required">*</span></label>
                <input id="bank-name" className="input" value={form.bank} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: BankAccountForm) => ({ ...p, bank: e.target.value }))} placeholder="Contoh: BRI" />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="bank-number">No Rekening <span className="required">*</span></label>
                <input id="bank-number" className="input" value={form.accountNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: BankAccountForm) => ({ ...p, accountNumber: e.target.value }))} placeholder="1234567890" />
              </div>
              <div className="input-group">
                <label className="input-label" htmlFor="bank-holder">Atas Nama <span className="required">*</span></label>
                <input id="bank-holder" className="input" value={form.accountName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((p: BankAccountForm) => ({ ...p, accountName: e.target.value }))} placeholder="PT Raja Aksesoris" />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setModal(null)}>Batal</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={!form.bank.trim() || !form.accountNumber.trim()}>Simpan</button>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ===========================================================================
// Settings icon
// ===========================================================================
function SettingsIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11 2V4M11 18V20M2 11H4M18 11H20M4.22 4.22L5.64 5.64M16.36 16.36L17.78 17.78M4.22 17.78L5.64 16.36M16.36 5.64L17.78 4.22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ===========================================================================
// Main Settings Page
// ===========================================================================
const TABS: TabDefinition[] = [
  { id: 'branches', label: 'Cabang', icon: BranchTabIcon },
  { id: 'payments', label: 'Metode Pembayaran', icon: PaymentTabIcon },
  { id: 'users', label: 'Pengguna', icon: UsersTabIcon },
  { id: 'pnl-categories', label: 'Kategori P&L', icon: CategoryTabIcon },
  { id: 'bank-accounts', label: 'Rekening Bank', icon: BankTabIcon },
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('branches')

  const renderTab = (): React.ReactNode => {
    switch (activeTab) {
      case 'branches': return <CabangTab />
      case 'payments': return <PaymentTab />
      case 'users': return <UsersTab />
      case 'pnl-categories': return <PnlCategoriesTab />
      case 'bank-accounts': return <BankAccountsTab />
      default: return null
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <div style={{
            width: 44, height: 44, borderRadius: 'var(--radius-md)',
            background: 'linear-gradient(135deg, var(--color-primary-light), var(--color-primary-subtle))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-primary)',
          }}>
            <SettingsIcon />
          </div>
          <div>
            <h1>Pengaturan</h1>
            <p className="text-secondary text-sm" style={{ marginTop: 2 }}>Kelola data master &amp; konfigurasi sistem</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: 'var(--space-1)',
        overflowX: 'auto',
        borderBottom: '2px solid var(--color-border)',
        marginBottom: 'var(--space-6)',
        paddingBottom: 0,
      }}>
        {TABS.map((tab: TabDefinition) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              className={`btn btn-ghost`}
              onClick={() => setActiveTab(tab.id)}
              aria-selected={isActive}
              role="tab"
              style={{
                borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                marginBottom: -2,
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 'var(--font-semibold)' : 'var(--font-medium)',
                padding: 'var(--space-3) var(--space-4)',
                whiteSpace: 'nowrap',
                minHeight: 44,
                transition: 'all var(--duration-normal) var(--ease-default)',
              }}
            >
              <Icon />
              <span className="hide-mobile">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div key={activeTab}>
        {renderTab()}
      </div>
    </div>
  )
}
