'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/hooks/useBranch'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'
import { Badge, ToastProvider, useToast } from '@/components/ui'
import type { Branch } from '@/types'

// --- Interfaces ---
interface MappedTransaction {
  id: string
  tanggal: Date
  branchId: string
  branchName: string
  categoryName: string
  categoryId: string
  description: string
  amount: number
  type: 'expense' | 'topup' | any
  receiptUrl?: string
}

interface PettyCashCategory {
  id: string
  name: string
  is_active?: boolean
}

// --- Demo Petty Cash Categories ---
const PETTY_CASH_CATEGORIES: PettyCashCategory[] = [
  { id: 'cat-1', name: 'Supplies / Perlengkapan' },
  { id: 'cat-2', name: 'Biaya Operasional' },
  { id: 'cat-3', name: 'Ongkos Kirim' },
  { id: 'cat-4', name: 'Transport Antar Cabang' },
  { id: 'cat-5', name: 'Perbaikan / Maintenance' },
  { id: 'cat-6', name: 'Makan Event' },
  { id: 'cat-7', name: 'Lain-lain' }
]

function KasKecilPageContent() {
  const { profile } = useAuth()
  const { branches, selectedBranch } = useBranch(profile)
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<'list' | 'input'>('list')
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState<PettyCashCategory[]>(PETTY_CASH_CATEGORIES)

  // --- Filter states ---
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth())
  const [filterYear, setFilterYear] = useState(new Date().getFullYear())
  const [filterType, setFilterType] = useState<string>('all') // 'all' | 'expense' | 'topup'

  // --- Transactions data ---
  const [transactions, setTransactions] = useState<MappedTransaction[]>([])
  const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null) // Modal popup for receipt image

  // --- Form states ---
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0])
  const [inputBranchId, setInputBranchId] = useState('')
  const [inputType, setInputType] = useState<'expense' | 'topup'>('expense')
  const [inputCategoryId, setInputCategoryId] = useState('')
  const [inputDescription, setInputDescription] = useState('')
  const [inputAmount, setInputAmount] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string>('')

  // Check database configuration
  const supabaseActive = isSupabaseConfigured

  // Initialize
  useEffect(() => {
    loadCategories()
  }, [])

  useEffect(() => {
    loadTransactions()
  }, [filterMonth, filterYear, branches])

  useEffect(() => {
    // Set default branch in input form based on global selector or user's branch
    if (selectedBranch) {
      setInputBranchId(selectedBranch.id)
    } else if (profile?.branch_id) {
      setInputBranchId(profile.branch_id)
    } else if (branches.length > 0) {
      setInputBranchId(branches[0].id)
    }
  }, [selectedBranch, profile, branches, activeTab])

  // Reset category selection if type is topup (topups don't need expense categories)
  useEffect(() => {
    if (inputType === 'topup') {
      setInputCategoryId('')
    } else if (categories.length > 0 && !inputCategoryId) {
      setInputCategoryId(categories[0].id)
    }
  }, [inputType, categories])

  // Load categories from Supabase or Fallback
  const loadCategories = async () => {
    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data, error } = await supabase
            .from('pnl_categories')
            .select('id, name, type')
            .in('type', ['operating_expense', 'other_expense', 'cogs'])
          if (error) throw error
          if (data && data.length > 0) {
            setCategories(data.map((c: any) => ({ id: c.id, name: c.name })))
          }
        }
      } catch (err) {
        console.error('Failed to load categories from Supabase:', err)
      }
    } else {
      // Demo Mode
      try {
        const localCatsStr = localStorage.getItem('raja-aksesoris-pnl-categories')
        let parsed = []
        if (localCatsStr) {
          parsed = JSON.parse(localCatsStr)
        } else {
          parsed = [
            { id: 'pnl-c1', name: 'HPP / COGS', type: 'COGS' },
            { id: 'pnl-c2', name: 'Biaya Operasional (Kas Kecil)', type: 'Operating Expense' },
            { id: 'pnl-c3', name: 'Gaji & Komisi', type: 'Operating Expense' },
            { id: 'pnl-c4', name: 'Sewa Toko', type: 'Operating Expense' },
            { id: 'pnl-c5', name: 'Marketing / Iklan', type: 'Operating Expense' },
            { id: 'pnl-c6', name: 'Penyusutan Aset', type: 'Operating Expense' },
            { id: 'pnl-c7', name: 'Beban Lain-lain', type: 'Other Expense' }
          ]
          localStorage.setItem('raja-aksesoris-pnl-categories', JSON.stringify(parsed))
        }
        const filtered = parsed.filter((c: any) => 
          c.type === 'Operating Expense' || 
          c.type === 'Other Expense' || 
          c.type === 'COGS' ||
          c.type === 'operating_expense' || 
          c.type === 'other_expense' || 
          c.type === 'cogs'
        )
        setCategories(filtered.map((c: any) => ({ id: c.id, name: c.name })))
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Load transactions
  const loadTransactions = async () => {
    setLoading(true)
    const startDate = new Date(filterYear, filterMonth, 1).toISOString().split('T')[0]
    const endDate = new Date(filterYear, filterMonth + 1, 0).toISOString().split('T')[0]

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data, error } = await supabase
            .from('petty_cash')
            .select(`
              id,
              transaction_date,
              branch_id,
              description,
              amount,
              type,
              receipt_url,
              category_id,
              pnl_categories (name),
              branches (name)
            `)
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)

          if (error) throw error

          const mapped: MappedTransaction[] = (data || []).map((row: any) => ({
            id: row.id,
            tanggal: new Date(row.transaction_date),
            branchId: row.branch_id,
            branchName: row.branches?.name || 'Unknown',
            categoryName: row.type === 'topup' ? 'Top-Up Saldo' : (row.pnl_categories?.name || 'Lain-lain'),
            categoryId: row.category_id,
            description: row.description,
            amount: parseFloat(row.amount) || 0,
            type: row.type,
            receiptUrl: row.receipt_url
          }))

          setTransactions(mapped.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()))
        }
      } catch (err) {
        console.error('Failed to load transactions from Supabase:', err)
        toast.error('Gagal memuat log kas kecil dari server.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode: load from local storage
      try {
        const localTransactions = localStorage.getItem('raja-aksesoris-petty-cash')
        if (localTransactions) {
          const parsed = JSON.parse(localTransactions) as any[]
          const filtered = parsed.filter(item => {
            const itemDate = new Date(item.dateStr)
            return itemDate.getMonth() === filterMonth && itemDate.getFullYear() === filterYear
          })

          const mapped: MappedTransaction[] = filtered.map(item => {
            const branchObj = branches.find(b => String(b.id) === String(item.branchId))
            const branchName = branchObj ? branchObj.name : 'Unknown'
            const catObj = categories.find(c => String(c.id) === String(item.categoryId))
            const categoryName = item.type === 'topup' ? 'Top-Up Saldo' : (catObj ? catObj.name : 'Lain-lain')

            return {
              id: item.id,
              tanggal: new Date(item.dateStr),
              branchId: item.branchId,
              branchName,
              categoryName,
              categoryId: item.categoryId,
              description: item.description,
              amount: item.amount,
              type: item.type,
              receiptUrl: item.receiptPreview || ''
            }
          })

          setTransactions(mapped.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()))
        } else {
          setTransactions([])
        }
      } catch (err) {
        console.error('Failed to load local transactions:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  // Handle receipt image upload preview
  const handleReceiptFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setReceiptFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setReceiptPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Save Transaction
  const handleSaveTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!inputBranchId) {
      toast.warning('Silakan pilih cabang.')
      return
    }

    if (inputType === 'expense' && !inputCategoryId) {
      toast.warning('Silakan pilih kategori pengeluaran.')
      return
    }

    const amountNum = parseFloat(inputAmount) || 0
    if (amountNum <= 0) {
      toast.warning('Nominal transaksi harus lebih besar dari 0.')
      return
    }

    setLoading(true)

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          let finalReceiptUrl = ''

          // Simulated file upload if file exists
          if (receiptFile) {
            finalReceiptUrl = receiptPreview
          }

          const { error } = await supabase
            .from('petty_cash')
            .insert({
              branch_id: inputBranchId,
              transaction_date: inputDate,
              category_id: inputType === 'topup' ? '00000000-0000-0000-0000-000000000000' : inputCategoryId,
              description: inputDescription,
              amount: amountNum,
              type: inputType,
              receipt_url: finalReceiptUrl,
              created_by: profile?.id
            })

          if (error) throw error

          toast.success('Transaksi kas kecil berhasil disimpan.')
          resetForm()
          setActiveTab('list')
          loadTransactions()
        }
      } catch (err) {
        console.error('Failed to save petty cash to Supabase:', err)
        toast.error('Gagal menyimpan transaksi kas kecil ke server.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode: save to localStorage
      try {
        const localPCStr = localStorage.getItem('raja-aksesoris-petty-cash') || '[]'
        const localPC = JSON.parse(localPCStr) as any[]

        localPC.push({
          id: `pc-${Date.now()}`,
          branchId: inputBranchId,
          dateStr: inputDate,
          type: inputType,
          categoryId: inputType === 'topup' ? 'topup' : inputCategoryId,
          description: inputDescription,
          amount: amountNum,
          receiptPreview: receiptPreview || ''
        })

        localStorage.setItem('raja-aksesoris-petty-cash', JSON.stringify(localPC))

        toast.success(`Transaksi ${inputType === 'topup' ? 'Top-up' : 'Pengeluaran'} Rp ${amountNum.toLocaleString()} berhasil disimpan secara lokal.`)
        resetForm()
        setActiveTab('list')
        loadTransactions()
      } catch (err) {
        console.error('Failed to save petty cash to localStorage:', err)
        toast.error('Gagal menyimpan secara lokal.')
      } finally {
        setLoading(false)
      }
    }
  }

  const resetForm = () => {
    setInputAmount('')
    setInputDescription('')
    setReceiptFile(null)
    setReceiptPreview('')
    if (categories.length > 0) {
      setInputCategoryId(categories[0].id)
    }
    const fileInput = document.getElementById('pc-receipt') as HTMLInputElement
    if (fileInput) {
      fileInput.value = ''
    }
  }

  // Delete transaction
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Hapus transaksi kas kecil ini?')) return

    setLoading(true)
    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { error } = await supabase
            .from('petty_cash')
            .delete()
            .eq('id', id)

          if (error) throw error

          toast.success('Transaksi berhasil dihapus.')
          loadTransactions()
        }
      } catch (err) {
        console.error('Failed to delete transaction:', err)
        toast.error('Gagal menghapus transaksi.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode: delete from local storage
      try {
        const localPCStr = localStorage.getItem('raja-aksesoris-petty-cash')
        if (localPCStr) {
          const parsed = JSON.parse(localPCStr) as any[]
          const filtered = parsed.filter(t => t.id !== id)
          localStorage.setItem('raja-aksesoris-petty-cash', JSON.stringify(filtered))
        }
        toast.success('Transaksi berhasil dihapus.')
        loadTransactions()
      } catch (err) {
        console.error('Failed to delete locally:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  // Filter list by selected branch globally and filterType
  const filteredTransactions = useMemo(() => {
    let list = transactions

    // Filter by branch
    if (selectedBranch) {
      list = list.filter(item => String(item.branchId) === String(selectedBranch.id))
    }

    // Filter by type
    if (filterType !== 'all') {
      list = list.filter(item => item.type === filterType)
    }

    return list
  }, [transactions, selectedBranch, filterType])

  // Calculate branch petty cash balance
  const currentBalance = useMemo(() => {
    let list = transactions
    if (selectedBranch) {
      list = transactions.filter(t => String(t.branchId) === String(selectedBranch.id))
    }

    let balance = 0
    list.forEach(t => {
      if (t.type === 'topup') {
        balance += t.amount
      } else {
        balance -= t.amount
      }
    })
    return balance
  }, [transactions, selectedBranch])

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Kas Kecil</h1>
        <p className="dashboard-page-subtitle">
          Catat dan awasi aliran dana kas kecil per cabang
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="tabs mb-6">
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <rect x="3" y="4" width="18" height="16" rx="2" strokeWidth="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          Log Transaksi
        </button>
        <button
          className={`tab ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <path d="M12 5v14M5 12h14" strokeWidth="2.5" />
          </svg>
          Input Transaksi Baru
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="animate-slide-up delay-1">
          {/* Dashboard balance summary card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="stat-card" style={{ flex: 1 }}>
              <div className="stat-card-header">
                <span className="stat-card-label">
                  Saldo Kas Kecil {selectedBranch ? `— Cabang ${selectedBranch.name}` : '— Semua Cabang'}
                </span>
                <div className="stat-card-icon" style={{ backgroundColor: currentBalance >= 0 ? 'var(--color-success-light)' : 'var(--color-danger-light)', color: currentBalance >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <line x1="12" y1="10" x2="12" y2="14" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                </div>
              </div>
              <div className="stat-card-value" style={{ color: currentBalance >= 0 ? 'inherit' : 'var(--color-danger-text)' }}>
                {formatCurrency(currentBalance)}
              </div>
              <div className="stat-card-footer">
                <span className="stat-card-subtitle">
                  {currentBalance >= 0 ? 'Saldo mencukupi untuk kebutuhan operasional' : 'Saldo negatif! Segera lakukan Top-up'}
                </span>
              </div>
            </div>
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <select
                className="select"
                value={filterMonth}
                onChange={(e) => setFilterMonth(parseInt(e.target.value))}
                aria-label="Pilih bulan"
                style={{ width: '160px' }}
              >
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>
                    {formatMonth(i + 1)}
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={filterYear}
                onChange={(e) => setFilterYear(parseInt(e.target.value))}
                aria-label="Pilih tahun"
                style={{ width: '100px' }}
              >
                {Array.from({ length: 5 }).map((_, i) => {
                  const y = new Date().getFullYear() - 2 + i
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  )
                })}
              </select>

              <select
                className="select"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                aria-label="Pilih jenis"
                style={{ width: '160px' }}
              >
                <option value="all">Semua Tipe</option>
                <option value="expense">Pengeluaran</option>
                <option value="topup">Top-Up Saldo</option>
              </select>
            </div>

            {/* Demo indicator */}
            {!supabaseActive && (
              <Badge variant="warning">Demo Mode — Data disimpan di browser</Badge>
            )}
          </div>

          {/* Table list */}
          {loading ? (
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-12)' }}>
                <span className="spinner spinner-lg" />
                <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>Memuat log kas kecil...</p>
              </div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-state-icon">
                     <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      <circle cx="32" cy="32" r="28" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="4 4" />
                      <path d="M22 28h20" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h3 className="empty-state-title">Belum Ada Transaksi Kas Kecil</h3>
                  <p className="empty-state-description">
                    Belum ada pengeluaran atau top-up kas kecil terdaftar untuk bulan ini.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Cabang</th>
                    <th>Tipe</th>
                    <th>Kategori</th>
                    <th>Deskripsi</th>
                    <th style={{ textAlign: 'right' }}>Jumlah</th>
                    <th style={{ textAlign: 'center' }}>Nota</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <span className="font-semibold">{formatDate(item.tanggal)}</span>
                      </td>
                      <td>{item.branchName}</td>
                      <td>
                        <Badge variant={item.type === 'topup' ? 'success' : 'danger'}>
                          {item.type === 'topup' ? 'Top-Up' : 'Pengeluaran'}
                        </Badge>
                      </td>
                      <td>
                        <span className="font-semibold">{item.categoryName}</span>
                      </td>
                      <td>{item.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 'var(--font-semibold)', color: item.type === 'topup' ? 'var(--color-success-text)' : 'inherit' }}>
                        {item.type === 'topup' ? '+' : '-'}{formatCurrency(item.amount)}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {item.receiptUrl ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ minWidth: '32px', minHeight: '32px', padding: '4px', color: 'var(--color-primary)' }}
                            onClick={() => setSelectedReceipt(item.receiptUrl || null)}
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: 'var(--text-xs)' }}>Tidak ada</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost btn-sm text-danger"
                          style={{ minHeight: '32px', minWidth: '32px', padding: '4px' }}
                          onClick={() => handleDeleteTransaction(item.id)}
                          title="Hapus transaksi"
                          aria-label="Hapus transaksi kas kecil"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Receipt Image Popup Modal */}
          {selectedReceipt && (
            <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
              <div className="modal" style={{ maxWidth: '480px' }}>
                <div className="modal-header">
                  <h3>Bukti Nota Pengeluaran</h3>
                  <button className="modal-close" onClick={() => setSelectedReceipt(null)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="modal-body" style={{ display: 'flex', justifyContent: 'center', backgroundColor: '#f5f5f7', padding: 'var(--space-4)' }}>
                  <img
                    src={selectedReceipt}
                    alt="Bukti Nota Kas Kecil"
                    style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)' }}
                  />
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setSelectedReceipt(null)}>Tutup</button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card animate-slide-up delay-1">
          <form onSubmit={handleSaveTransaction} className="card-body">
            <h3 className="card-title mb-6">Formulir Input Kas Kecil</h3>

            <div className="form-row mb-6">
              <div className="input-group">
                <label className="input-label" htmlFor="pc-date">Tanggal Transaksi <span className="required">*</span></label>
                <input
                  id="pc-date"
                  type="date"
                  className="input"
                  required
                  value={inputDate}
                  onChange={(e) => setInputDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="pc-branch">Cabang <span className="required">*</span></label>
                <select
                  id="pc-branch"
                  className="select"
                  required
                  value={inputBranchId}
                  onChange={(e) => setInputBranchId(e.target.value)}
                >
                  <option value="">Pilih Cabang...</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row mb-6">
              <div className="input-group">
                <label className="input-label" htmlFor="pc-type">Tipe Transaksi <span className="required">*</span></label>
                <select
                  id="pc-type"
                  className="select"
                  value={inputType}
                  onChange={(e) => setInputType(e.target.value as 'expense' | 'topup')}
                >
                  <option value="expense">Pengeluaran Kas Kecil</option>
                  <option value="topup">Top-Up Saldo</option>
                </select>
              </div>

              {inputType === 'expense' ? (
                <div className="input-group">
                  <label className="input-label" htmlFor="pc-category">Kategori Pengeluaran <span className="required">*</span></label>
                  <select
                    id="pc-category"
                    className="select"
                    required
                    value={inputCategoryId}
                    onChange={(e) => setInputCategoryId(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="input-group">
                  <label className="input-label">Kategori</label>
                  <input className="input" value="Top-Up Saldo" disabled style={{ opacity: 0.7 }} />
                </div>
              )}
            </div>

            <div className="form-row mb-6">
              <div className="input-group">
                <label className="input-label" htmlFor="pc-amount">Nominal Jumlah <span className="required">*</span></label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    Rp
                  </span>
                  <input
                    id="pc-amount"
                    type="number"
                    min="1"
                    step="any"
                    placeholder="0"
                    className="input"
                    style={{ paddingLeft: '38px' }}
                    required
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="pc-receipt">
                  Unggah Bukti Nota {inputType === 'expense' && <span className="text-xs text-secondary">(Opsional tapi direkomendasikan)</span>}
                </label>
                <input
                  id="pc-receipt"
                  type="file"
                  accept="image/*"
                  className="input"
                  onChange={handleReceiptFileChange}
                  style={{ paddingTop: '8px' }}
                />
              </div>
            </div>

            {receiptPreview && (
              <div className="mb-6">
                <div className="text-xs text-secondary mb-2">Pratinjau Bukti Nota:</div>
                <div style={{ width: '120px', height: '120px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5f5f7', position: 'relative' }}>
                  <img src={receiptPreview} alt="Preview Nota" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    style={{ position: 'absolute', right: '4px', top: '4px', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '10px' }}
                    onClick={() => {
                      setReceiptFile(null)
                      setReceiptPreview('')
                      const fileInput = document.getElementById('pc-receipt') as HTMLInputElement
                      if (fileInput) {
                        fileInput.value = ''
                      }
                    }}
                  >
                    &times;
                  </button>
                </div>
              </div>
            )}

            <div className="input-group mb-6">
              <label className="input-label" htmlFor="pc-description">Deskripsi Transaksi <span className="required">*</span></label>
              <textarea
                id="pc-description"
                className="input"
                required
                placeholder={inputType === 'expense' ? "Contoh: Beli pulpen kantor 3 biji & struk print kasir" : "Contoh: Transfer modal kas kecil mingguan dari Owner"}
                value={inputDescription}
                onChange={(e) => setInputDescription(e.target.value)}
                style={{ minHeight: '80px' }}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  resetForm()
                  setActiveTab('list')
                }}
              >
                Batal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Menyimpan...' : 'Simpan Transaksi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// Wrapping with Toast Provider
export default function KasKecilPage() {
  return (
    <ToastProvider>
      <KasKecilPageContent />
    </ToastProvider>
  )
}
