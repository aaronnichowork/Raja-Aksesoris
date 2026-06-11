'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/hooks/useBranch'
import { formatCurrency, formatDate, formatMonth } from '@/lib/utils'
import { Button, Input, Select, Badge, ToastProvider, useToast } from '@/components/ui'
import type { Branch, PaymentMethod } from '@/types'

// --- Local interfaces for this page ---

interface DemoPaymentMethod {
  id: string
  name: string
  mdrRate: number
  settlementDays: number
}

interface SalesBreakdown {
  methodId: string
  methodName: string
  amount: number
  mdr: number
  expected: number
}

interface SalesListItem {
  key: string
  date: Date
  branchId: string
  branchName: string
  notes: string
  totalOmsetKotor: number
  retur: number
  totalMdr: number
  expectedSettlement: number
  breakdown: SalesBreakdown[]
}

interface SalesInputs {
  [methodId: string]: number
}

interface SalesTotals {
  omsetKotor: number
  retur: number
  omsetBersih: number
}

interface LocalSaleEntry {
  dateStr: string
  branchId: string
  sales: Record<string, number>
  retur: number
  totalOmset: number
  notes: string
}

interface LocalReconEntry {
  id: string
  branchId: string
  branchName: string
  date: string
  paymentMethodId: string
  paymentMethodName: string
  expectedAmount: number
  mdrAmount: number
  expectedSettlement: number
  actualAmount: number
  status: string
  notes: string
}

interface LocalDepositEntry {
  id: string
  branchId: string
  branchName: string
  dateStr: string
  amount: number
  notes: string
}

// --- Demo Payment Methods ---
const DEMO_PAYMENT_METHODS: DemoPaymentMethod[] = [
  { id: 'pay-1', name: 'Cash', mdrRate: 0, settlementDays: 0 },
  { id: 'pay-2', name: 'Transfer Bank', mdrRate: 0, settlementDays: 1 },
  { id: 'pay-3', name: 'QRIS', mdrRate: 0.007, settlementDays: 1 },
  { id: 'pay-4', name: 'Debit', mdrRate: 0.006, settlementDays: 1 },
  { id: 'pay-5', name: 'Kartu Kredit', mdrRate: 0.022, settlementDays: 2 },
  { id: 'pay-6', name: 'Shopee', mdrRate: 0.03, settlementDays: 3 },
  { id: 'pay-7', name: 'TikTok', mdrRate: 0.03, settlementDays: 3 }
]

function PenjualanPageContent(): React.JSX.Element {
  const { profile } = useAuth()
  const { branches, selectedBranch } = useBranch(profile)
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<'list' | 'input'>('list')
  const [loading, setLoading] = useState<boolean>(false)
  const [paymentMethods, setPaymentMethods] = useState<DemoPaymentMethod[]>(DEMO_PAYMENT_METHODS)

  // --- Filter states ---
  const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth())
  const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear())

  // --- Sales list data ---
  const [salesList, setSalesList] = useState<SalesListItem[]>([])
  const [expandedRow, setExpandedRow] = useState<string | null>(null) // date-branch key

  // --- Cash Deposit states ---
  const [unDepositedCash, setUnDepositedCash] = useState<number>(0)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState<boolean>(false)
  const [depositDate, setDepositDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [depositAmount, setDepositAmount] = useState<string>('')
  const [depositNotes, setDepositNotes] = useState<string>('')

  // --- Input form states ---
  const [inputDate, setInputDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [inputBranchId, setInputBranchId] = useState<string>('')
  const [salesInputs, setSalesInputs] = useState<SalesInputs>({}) // { [methodId]: amount }
  const [inputRetur, setInputRetur] = useState<string>('')
  const [inputNotes, setInputNotes] = useState<string>('')

  // Check database configuration
  const supabaseActive = isSupabaseConfigured

  // Initialize data
  useEffect(() => {
    loadPaymentMethods()
  }, [])

  useEffect(() => {
    loadSalesList()
  }, [filterMonth, filterYear, branches])

  useEffect(() => {
    // Set default branch in input form based on global selector or user's branch
    if (selectedBranch?.id) {
      setInputBranchId(selectedBranch.id)
    } else if (profile?.branch_id) {
      setInputBranchId(profile.branch_id)
    } else if (branches.length > 0) {
      setInputBranchId(branches[0].id)
    }
  }, [selectedBranch, profile, branches, activeTab])

  // Calculate cash drawer running balance
  const loadUnDepositedCash = (): void => {
    const activeBranchId = selectedBranch?.id || null
    let totalCashSales = 0
    let totalDeposits = 0

    if (supabaseActive) {
      // Supabase mode placeholder or query if table exists
    } else {
      // Demo Mode
      try {
        const localSales = localStorage.getItem('raja-aksesoris-daily-sales')
        if (localSales) {
          const parsedSales: LocalSaleEntry[] = JSON.parse(localSales)
          const filteredSales = activeBranchId
            ? parsedSales.filter((s: LocalSaleEntry) => String(s.branchId) === String(activeBranchId))
            : parsedSales

          filteredSales.forEach((s: LocalSaleEntry) => {
            // Cash payment method ID is 'pay-1'
            const cashAmount = s.sales?.['pay-1'] || s.sales?.['Cash'] || 0
            totalCashSales += parseFloat(String(cashAmount)) || 0
          })
        }

        const localDeposits = localStorage.getItem('raja-aksesoris-cash-deposits')
        if (localDeposits) {
          const parsedDeposits: LocalDepositEntry[] = JSON.parse(localDeposits)
          const filteredDeposits = activeBranchId
            ? parsedDeposits.filter((d: LocalDepositEntry) => String(d.branchId) === String(activeBranchId))
            : parsedDeposits

          filteredDeposits.forEach((d: LocalDepositEntry) => {
            totalDeposits += parseFloat(String(d.amount)) || 0
          })
        }
      } catch (err) {
        console.error('Error calculating un-deposited cash:', err)
      }
    }

    setUnDepositedCash(Math.max(0, totalCashSales - totalDeposits))
  }

  // Load cash drawer info when branch selection or sales list changes
  useEffect(() => {
    loadUnDepositedCash()
  }, [selectedBranch, salesList])

  // Load payment methods from Supabase or Fallback
  const loadPaymentMethods = async (): Promise<void> => {
    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data, error } = await supabase
            .from('payment_methods')
            .select('*')
            .eq('is_active', true)
          if (error) throw error
          if (data && data.length > 0) {
            setPaymentMethods(data)
          }
        }
      } catch (err) {
        console.error('Failed to load payment methods from Supabase:', err)
      }
    }
  }

  // Load sales list from Supabase or LocalStorage
  const loadSalesList = async (): Promise<void> => {
    setLoading(true)
    const startDate = new Date(filterYear, filterMonth, 1).toISOString().split('T')[0]
    const endDate = new Date(filterYear, filterMonth + 1, 0).toISOString().split('T')[0]

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data, error } = await supabase
            .from('daily_sales')
            .select(`
              id,
              sale_date,
              branch_id,
              amount,
              notes,
              payment_methods (id, name, mdr_rate),
              branches (name)
            `)
            .gte('sale_date', startDate)
            .lte('sale_date', endDate)

          if (error) throw error

          if (data) {
            // Group rows by date & branch
            const grouped: Record<string, SalesListItem> = {}
            data.forEach((row: Record<string, unknown>) => {
              const key = `${row.sale_date}-${row.branch_id}`
              const branchData = row.branches as Record<string, string> | null
              const methodData = row.payment_methods as Record<string, unknown> | null
              const branchName = branchData?.name || 'Unknown'
              const methodName = (methodData?.name as string) || 'Unknown'
              const mdrRate = (methodData?.mdr_rate as number) || 0
              const amount = parseFloat(String(row.amount)) || 0
              const mdr = amount * mdrRate

              if (!grouped[key]) {
                grouped[key] = {
                  key,
                  date: new Date(row.sale_date as string),
                  branchId: row.branch_id as string,
                  branchName,
                  notes: (row.notes as string) || '',
                  totalOmsetKotor: 0,
                  retur: 0,
                  totalMdr: 0,
                  expectedSettlement: 0,
                  breakdown: [],
                }
              }
              grouped[key].totalOmsetKotor += amount
              grouped[key].totalMdr += mdr
              grouped[key].expectedSettlement += (amount - mdr)
              grouped[key].breakdown.push({
                methodId: methodData?.id as string,
                methodName,
                amount,
                mdr,
                expected: amount - mdr
              })
            })

            // Sort by date descending
            const list = Object.values(grouped).sort((a: SalesListItem, b: SalesListItem) => b.date.getTime() - a.date.getTime())
            setSalesList(list)
          }
        }
      } catch (err) {
        console.error('Failed to load sales list from Supabase:', err)
        toast.error('Gagal memuat data penjualan dari server.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode: load from local storage
      try {
        const localSales = localStorage.getItem('raja-aksesoris-daily-sales')
        if (localSales) {
          const parsed: LocalSaleEntry[] = JSON.parse(localSales)
          const filtered = parsed.filter((item: LocalSaleEntry) => {
            const itemDate = new Date(item.dateStr)
            return itemDate.getMonth() === filterMonth && itemDate.getFullYear() === filterYear
          })

          // Map branch name
          const mapped: SalesListItem[] = filtered.map((item: LocalSaleEntry) => {
            const branchObj = branches.find((b: Branch) => String(b.id) === String(item.branchId))
            const branchName = branchObj ? branchObj.name : 'Semua Cabang'

            // Populate expected & mdr based on methods
            let totalMdr = 0
            let totalOmsetKotor = 0
            const breakdown: SalesBreakdown[] = Object.entries(item.sales).map(([methodId, amount]: [string, number]) => {
              const method = paymentMethods.find((m: DemoPaymentMethod) => String(m.id) === String(methodId))
              const name = method ? method.name : 'Unknown'
              const rate = method ? parseFloat(String(method.mdrRate)) : 0
              const mdrVal = amount * rate
              totalMdr += mdrVal
              totalOmsetKotor += amount
              return {
                methodId,
                methodName: name,
                amount,
                mdr: mdrVal,
                expected: amount - mdrVal
              }
            })

            const returVal = item.retur || 0
            const expectedSettlement = totalOmsetKotor - totalMdr - returVal

            return {
              key: `${item.dateStr}-${item.branchId}`,
              date: new Date(item.dateStr),
              branchId: item.branchId,
              branchName,
              notes: item.notes || '',
              totalOmsetKotor,
              retur: returVal,
              totalMdr,
              expectedSettlement,
              breakdown
            }
          })

          setSalesList(mapped.sort((a: SalesListItem, b: SalesListItem) => b.date.getTime() - a.date.getTime()))
        } else {
          setSalesList([])
        }
      } catch (err) {
        console.error('Failed to load sales from localStorage:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  // Handle input changes
  const handleInputChange = (methodId: string, value: string): void => {
    const numeric = parseFloat(value) || 0
    setSalesInputs((prev: SalesInputs) => ({
      ...prev,
      [methodId]: numeric >= 0 ? numeric : 0
    }))
  }

  // Calculate live aggregates for form
  const totals: SalesTotals = useMemo(() => {
    let totalOmsetKotor = 0

    paymentMethods.forEach((method: DemoPaymentMethod) => {
      const amount = salesInputs[method.id] || 0
      totalOmsetKotor += amount
    })

    const returVal = parseFloat(inputRetur) || 0
    const netOmset = totalOmsetKotor - returVal

    return {
      omsetKotor: totalOmsetKotor,
      retur: returVal,
      omsetBersih: netOmset
    }
  }, [salesInputs, paymentMethods, inputRetur])

  // Save Sales Form
  const handleSaveSales = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()

    if (!inputBranchId) {
      toast.warning('Silakan pilih cabang terlebih dahulu.')
      return
    }

    const branchObj = branches.find((b: Branch) => String(b.id) === String(inputBranchId))
    const branchName = branchObj ? branchObj.name : 'Unknown'

    // Verify at least one input is non-zero
    const hasValues = Object.values(salesInputs).some((val: number) => val > 0)
    if (!hasValues) {
      toast.warning('Silakan masukkan nominal penjualan minimal untuk satu metode pembayaran.')
      return
    }

    setLoading(true)

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const insertPromises: Promise<any>[] = []
          const reconPromises: Promise<any>[] = []

          for (const method of paymentMethods) {
            const amount = salesInputs[method.id] || 0
            if (amount >= 0) {
              // 1. Upsert daily_sales
              const upsertSales = async () => {
                return await supabase.from('daily_sales').upsert({
                  branch_id: inputBranchId,
                  sale_date: inputDate,
                  payment_method_id: method.id,
                  amount: amount,
                  notes: inputNotes,
                  created_by: profile?.id
                }, {
                  onConflict: 'branch_id, sale_date, payment_method_id'
                })
              }
              insertPromises.push(upsertSales())

              // 2. Upsert reconciliations
              const mdrVal = amount * parseFloat(String(method.mdrRate))
              const upsertRecon = async () => {
                return await supabase.from('reconciliations').upsert({
                  branch_id: inputBranchId,
                  sale_date: inputDate,
                  payment_method_id: method.id,
                  expected_amount: amount,
                  mdr_amount: mdrVal,
                  expected_settlement: amount - mdrVal,
                  status: 'pending',
                  notes: 'Input penjualan harian'
                }, {
                  onConflict: 'branch_id, sale_date, payment_method_id'
                })
              }
              reconPromises.push(upsertRecon())
            }
          }

          const results = await Promise.all([...insertPromises, ...reconPromises])
          const hasError = results.some((res: any) => res.error)
          if (hasError) throw new Error('Some rows failed to insert')

          toast.success(`Data penjualan untuk ${branchName} tanggal ${formatDate(new Date(inputDate))} berhasil disimpan.`)
          setSalesInputs({})
          setInputRetur('')
          setInputNotes('')
          setActiveTab('list')
          loadSalesList()
        }
      } catch (err) {
        console.error('Failed to save to Supabase:', err)
        toast.error('Gagal menyimpan data penjualan ke server.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode: save to localStorage
      try {
        const localSalesStr = localStorage.getItem('raja-aksesoris-daily-sales') || '[]'
        const localSales: LocalSaleEntry[] = JSON.parse(localSalesStr)

        // Upsert daily_sales item
        const key = `${inputDate}-${inputBranchId}`
        const updatedSales = localSales.filter((item: LocalSaleEntry) => `${item.dateStr}-${item.branchId}` !== key)

        updatedSales.push({
          dateStr: inputDate,
          branchId: inputBranchId,
          sales: salesInputs,
          retur: parseFloat(inputRetur) || 0,
          totalOmset: totals.omsetBersih,
          notes: inputNotes
        })
        localStorage.setItem('raja-aksesoris-daily-sales', JSON.stringify(updatedSales))

        // Sync to reconciliations in localStorage
        const localReconStr = localStorage.getItem('raja-aksesoris-reconciliations')
        let localRecons: LocalReconEntry[] = []
        if (localReconStr) {
          try {
            localRecons = JSON.parse(localReconStr)
          } catch(e) {
            localRecons = []
          }
        }

        // Remove old reconciliation entries for this date/branch
        localRecons = localRecons.filter((r: LocalReconEntry) => !(r.branchId === inputBranchId && r.date === inputDate))

        // Add new reconciliation entries
        paymentMethods.forEach((method: DemoPaymentMethod) => {
          const amount = salesInputs[method.id] || 0
          if (amount > 0) {
            const mdrVal = amount * parseFloat(String(method.mdrRate))
            localRecons.push({
              id: `recon-${Date.now()}-${method.id}`,
              branchId: inputBranchId,
              branchName,
              date: inputDate,
              paymentMethodId: method.id,
              paymentMethodName: method.name,
              expectedAmount: amount,
              mdrAmount: mdrVal,
              expectedSettlement: amount - mdrVal,
              actualAmount: 0,
              status: 'pending',
              notes: 'Input penjualan harian (Demo)'
            })
          }
        })
        localStorage.setItem('raja-aksesoris-reconciliations', JSON.stringify(localRecons))

        toast.success(`Data penjualan untuk ${branchName} tanggal ${formatDate(new Date(inputDate))} disimpan lokal.`)
        setSalesInputs({})
        setInputRetur('')
        setInputNotes('')
        setActiveTab('list')
        loadSalesList()
      } catch (err) {
        console.error('Failed to save to localStorage:', err)
        toast.error('Gagal menyimpan data secara lokal.')
      } finally {
        setLoading(false)
      }
    }
  }

  // Handle Cash Deposit Submission
  const handleSaveDeposit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    const amountNum = parseFloat(depositAmount) || 0
    if (amountNum <= 0) {
      toast.warning('Nominal setoran harus lebih besar dari 0.')
      return
    }

    const activeBranchId = selectedBranch?.id || (branches.length > 0 ? branches[0].id : '')
    if (!activeBranchId) {
      toast.warning('Silakan pilih cabang terlebih dahulu.')
      return
    }

    const branchObj = branches.find((b: Branch) => String(b.id) === String(activeBranchId))
    const branchName = branchObj ? branchObj.name : 'Unknown'

    if (supabaseActive) {
      // Supabase insert setoran tunai placeholder
    } else {
      // Demo Mode
      try {
        const localDepositsStr = localStorage.getItem('raja-aksesoris-cash-deposits') || '[]'
        const localDeposits: LocalDepositEntry[] = JSON.parse(localDepositsStr)

        localDeposits.push({
          id: `dep-${Date.now()}`,
          branchId: activeBranchId,
          branchName,
          dateStr: depositDate,
          amount: amountNum,
          notes: depositNotes
        })

        localStorage.setItem('raja-aksesoris-cash-deposits', JSON.stringify(localDeposits))
        toast.success(`Setoran tunai Rp ${amountNum.toLocaleString()} berhasil disimpan secara lokal.`)
        
        // Reset and close
        setDepositAmount('')
        setDepositNotes('')
        setIsDepositModalOpen(false)
        loadUnDepositedCash()
      } catch (err) {
        console.error('Failed to save deposit:', err)
        toast.error('Gagal menyimpan setoran.')
      }
    }
  }

  const toggleRow = (key: string): void => {
    setExpandedRow((prev: string | null) => prev === key ? null : key)
  }

  const handleDeleteSales = async (item: SalesListItem): Promise<void> => {
    if (!confirm(`Hapus data penjualan ${item.branchName} tanggal ${formatDate(item.date)}?`)) return

    setLoading(true)
    const dateStr = item.date.toISOString().split('T')[0]

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { error: salesError } = await supabase
            .from('daily_sales')
            .delete()
            .eq('sale_date', dateStr)
            .eq('branch_id', item.branchId)

          const { error: reconError } = await supabase
            .from('reconciliations')
            .delete()
            .eq('sale_date', dateStr)
            .eq('branch_id', item.branchId)

          if (salesError || reconError) throw new Error('Failed to delete')

          toast.success('Data penjualan berhasil dihapus.')
          loadSalesList()
        }
      } catch (err) {
        console.error('Failed to delete from Supabase:', err)
        toast.error('Gagal menghapus data.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode: delete from localStorage
      try {
        const localSalesStr = localStorage.getItem('raja-aksesoris-daily-sales')
        if (localSalesStr) {
          const parsed: LocalSaleEntry[] = JSON.parse(localSalesStr)
          const filtered = parsed.filter((i: LocalSaleEntry) => !(i.dateStr === dateStr && i.branchId === item.branchId))
          localStorage.setItem('raja-aksesoris-daily-sales', JSON.stringify(filtered))
        }

        const localReconStr = localStorage.getItem('raja-aksesoris-reconciliations')
        if (localReconStr) {
          const parsed: LocalReconEntry[] = JSON.parse(localReconStr)
          const filtered = parsed.filter((i: LocalReconEntry) => !(i.date === dateStr && i.branchId === item.branchId))
          localStorage.setItem('raja-aksesoris-reconciliations', JSON.stringify(filtered))
        }

        toast.success('Data penjualan berhasil dihapus dari penyimpanan lokal.')
        loadSalesList()
      } catch (err) {
        console.error('Failed to delete from localStorage:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  // Filter list by selected branch globally
  const filteredSalesList = useMemo((): SalesListItem[] => {
    if (!selectedBranch) return salesList
    const branchId = selectedBranch?.id || selectedBranch
    return salesList.filter((item: SalesListItem) => String(item.branchId) === String(branchId))
  }, [salesList, selectedBranch])

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Penjualan Harian</h1>
        <p className="dashboard-page-subtitle">
          Input dan kelola rincian penjualan per cabang per metode pembayaran
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="tabs mb-6">
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth="2" />
            <path d="M9 17h6M9 12h6M9 7h6" />
          </svg>
          Laporan Penjualan
        </button>
        <button
          className={`tab ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <path d="M12 5v14M5 12h14" strokeWidth="2.5" />
          </svg>
          Input Penjualan Baru
        </button>
      </div>

      {activeTab === 'list' ? (
        <div className="animate-slide-up delay-1">
          {/* Filters Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <select
                className="select"
                value={filterMonth}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterMonth(parseInt(e.target.value))}
                aria-label="Pilih bulan"
                style={{ width: '160px' }}
              >
                {Array.from({ length: 12 }).map((_: unknown, i: number) => (
                  <option key={i} value={i}>
                    {formatMonth(i + 1)}
                  </option>
                ))}
              </select>

              <select
                className="select"
                value={filterYear}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilterYear(parseInt(e.target.value))}
                aria-label="Pilih tahun"
                style={{ width: '100px' }}
              >
                {Array.from({ length: 5 }).map((_: unknown, i: number) => {
                  const y = new Date().getFullYear() - 2 + i
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Cash Deposit Info & Action Button */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="card p-2 px-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', minWidth: '180px', margin: 0, justifyContent: 'center' }}>
                <span className="text-secondary text-xs" style={{ fontSize: '11px', lineHeight: 1.2 }}>Omset Tunai Belum Disetor</span>
                <span className="font-bold text-base" style={{ color: 'var(--color-primary)', lineHeight: 1.3 }}>
                  {formatCurrency(unDepositedCash)}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ height: '44px' }}
                onClick={() => {
                  setDepositAmount(unDepositedCash.toString())
                  setDepositDate(new Date().toISOString().split('T')[0])
                  setIsDepositModalOpen(true)
                }}
                disabled={unDepositedCash <= 0}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />
                  <path d="M12 10v4" />
                </svg>
                Setor Omset Tunai
              </button>

              {!supabaseActive && (
                <Badge variant="warning">Demo Mode</Badge>
              )}
            </div>
          </div>

          {/* Table list */}
          {loading ? (
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-12)' }}>
                <span className="spinner spinner-lg" />
                <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>Memuat laporan penjualan...</p>
              </div>
            </div>
          ) : filteredSalesList.length === 0 ? (
            <div className="card">
              <div className="card-body">
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                      <circle cx="32" cy="32" r="28" stroke="var(--color-border)" strokeWidth="2" strokeDasharray="4 4" />
                      <path d="M22 28h20M22 36h14" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <h3 className="empty-state-title">Belum Ada Data Penjualan</h3>
                  <p className="empty-state-description">
                    Silakan input penjualan harian baru melalui tab &quot;Input Penjualan Baru&quot;.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th style={{ width: '40px' }} />
                    <th>Tanggal</th>
                    <th>Cabang</th>
                    <th style={{ textAlign: 'right' }}>Total Omset Kotor</th>
                    <th style={{ textAlign: 'right' }}>Retur</th>
                    <th style={{ textAlign: 'right' }}>Total Potongan MDR</th>
                    <th style={{ textAlign: 'right' }}>Expected Settlement</th>
                    <th style={{ textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalesList.map((item: SalesListItem) => {
                    const isExpanded = expandedRow === item.key
                    return (
                      <React.Fragment key={item.key}>
                        <tr
                          onClick={() => toggleRow(item.key)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ textAlign: 'center' }}>
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="3"
                              style={{
                                transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                transition: 'transform 150ms ease'
                              }}
                            >
                              <path d="M9 5l7 7-7 7" />
                            </svg>
                          </td>
                          <td>
                            <span className="font-semibold">{formatDate(item.date)}</span>
                          </td>
                          <td>{item.branchName}</td>
                          <td style={{ textAlign: 'right', fontWeight: 'var(--font-semibold)' }}>
                            {formatCurrency(item.totalOmsetKotor)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-danger-text)' }}>
                            {item.retur > 0 ? `-${formatCurrency(item.retur)}` : 'Rp 0'}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-danger-text)' }}>
                            -{formatCurrency(item.totalMdr)}
                          </td>
                          <td style={{ textAlign: 'right', color: 'var(--color-success-text)', fontWeight: 'var(--font-semibold)' }}>
                            {formatCurrency(item.expectedSettlement)}
                          </td>
                          <td style={{ textAlign: 'right' }} onClick={(e: React.MouseEvent<HTMLTableCellElement>) => e.stopPropagation()}>
                            <button
                              className="btn btn-ghost btn-sm text-danger"
                              style={{ minHeight: '32px', minWidth: '32px', padding: '4px' }}
                              onClick={() => handleDeleteSales(item)}
                              title="Hapus data penjualan"
                              aria-label={`Hapus penjualan ${item.branchName}`}
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
                              </svg>
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr>
                            <td colSpan={8} style={{ padding: '0', backgroundColor: 'var(--color-surface-hover)' }}>
                              <div className="p-4" style={{ borderLeft: '3px solid var(--color-primary)' }}>
                                <h4 className="text-sm font-semibold mb-3">Breakdown Metode Pembayaran:</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {item.breakdown.map((row: SalesBreakdown) => (
                                    <div
                                      key={row.methodId}
                                      className="card p-3"
                                      style={{ background: 'var(--color-surface)' }}
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="font-semibold text-sm">{row.methodName}</span>
                                        <Badge>{formatCurrency(row.amount)}</Badge>
                                      </div>
                                      <div className="text-xs text-secondary flex justify-between">
                                        <span>Potongan MDR:</span>
                                        <span>{formatCurrency(row.mdr)}</span>
                                      </div>
                                      <div className="text-xs text-success-text flex justify-between font-semibold mt-1">
                                        <span>Settlement Bersih:</span>
                                        <span>{formatCurrency(row.expected)}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {(item.retur > 0 || item.notes) && (
                                  <div className="mt-4 text-xs text-secondary bg-surface-pressed p-3 rounded-md" style={{ background: 'rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {item.retur > 0 && (
                                      <div><strong>Retur Penjualan:</strong> {formatCurrency(item.retur)}</div>
                                    )}
                                    {item.notes && (
                                      <div><strong>Catatan:</strong> {item.notes}</div>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Cash Deposit Modal */}
          {isDepositModalOpen && (
            <div className="modal-overlay" onClick={() => setIsDepositModalOpen(false)}>
              <div className="modal" style={{ maxWidth: '440px' }} onClick={(e: React.MouseEvent<HTMLDivElement>) => e.stopPropagation()}>
                <form onSubmit={handleSaveDeposit}>
                  <div className="modal-header">
                    <h3>Setor Omset Tunai</h3>
                    <button type="button" className="modal-close" onClick={() => setIsDepositModalOpen(false)}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                    <div className="input-group">
                      <label className="input-label" htmlFor="dep-branch">Cabang</label>
                      <input id="dep-branch" className="input" value={selectedBranch ? selectedBranch.name : 'Semua Cabang (Pilih cabang di header)'} disabled style={{ opacity: 0.7 }} />
                    </div>

                    <div className="input-group">
                      <label className="input-label" htmlFor="dep-date">Tanggal Setor</label>
                      <input
                        id="dep-date"
                        type="date"
                        className="input"
                        required
                        value={depositDate}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositDate(e.target.value)}
                      />
                    </div>

                    <div className="input-group">
                      <label className="input-label" htmlFor="dep-amount">Nominal Setoran</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Rp</span>
                        <input
                          id="dep-amount"
                          type="number"
                          min="1"
                          required
                          className="input"
                          style={{ paddingLeft: '38px' }}
                          value={depositAmount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepositAmount(e.target.value)}
                        />
                      </div>
                      <span className="input-helper">Default: Sisa omset tunai di kasir ({formatCurrency(unDepositedCash)})</span>
                    </div>

                    <div className="input-group">
                      <label className="input-label" htmlFor="dep-notes">Catatan</label>
                      <textarea
                        id="dep-notes"
                        className="input"
                        placeholder="Contoh: Disetor ke bank BCA oleh kasir"
                        value={depositNotes}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDepositNotes(e.target.value)}
                        style={{ minHeight: '60px' }}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => setIsDepositModalOpen(false)}>Batal</button>
                    <button type="submit" className="btn btn-primary">Simpan Setoran</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="card animate-slide-up delay-1">
          <form onSubmit={handleSaveSales} className="card-body">
            <h3 className="card-title mb-6">Formulir Input Penjualan Harian</h3>

            <div className="form-row mb-6">
              <div className="input-group">
                <label className="input-label" htmlFor="sales-date">Tanggal Penjualan <span className="required">*</span></label>
                <input
                  id="sales-date"
                  type="date"
                  className="input"
                  required
                  value={inputDate}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="input-group">
                <label className="input-label" htmlFor="sales-branch">Cabang <span className="required">*</span></label>
                <select
                  id="sales-branch"
                  className="select"
                  required
                  value={inputBranchId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setInputBranchId(e.target.value)}
                >
                  <option value="">Pilih Cabang...</option>
                  {branches.map((b: Branch) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <h4 className="text-base font-semibold mb-4 border-bottom pb-2">Nominal per Metode Pembayaran</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {paymentMethods.map((method: DemoPaymentMethod) => (
                <div key={method.id} className="input-group">
                  <label className="input-label" htmlFor={`method-${method.id}`}>
                    {method.name}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                      Rp
                    </span>
                    <input
                      id={`method-${method.id}`}
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      className="input"
                      style={{ paddingLeft: '38px' }}
                      value={salesInputs[method.id] === undefined ? '' : salesInputs[method.id]}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange(method.id, e.target.value)}
                    />
                  </div>
                </div>
              ))}

              {/* Retur Field (Unified inside same layout style) */}
              <div className="input-group">
                <label className="input-label" htmlFor="sales-retur" style={{ color: 'var(--color-danger-text)' }}>
                  Retur Penjualan
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)' }}>
                    Rp
                  </span>
                  <input
                    id="sales-retur"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
                    className="input"
                    style={{ paddingLeft: '38px', borderColor: 'var(--color-danger-border)' }}
                    value={inputRetur}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputRetur(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="input-group mb-6">
              <label className="input-label" htmlFor="sales-notes">Catatan Tambahan</label>
              <textarea
                id="sales-notes"
                className="input"
                placeholder="Tulis catatan jika ada selisih, promo khusus, dll."
                value={inputNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInputNotes(e.target.value)}
                style={{ minHeight: '80px' }}
              />
            </div>

            {/* Summary Box */}
            <div className="card p-6 mb-6" style={{ background: 'var(--color-surface-hover)', border: '1px solid var(--color-border-strong)' }}>
              <h4 className="text-sm font-bold uppercase tracking-wider text-secondary mb-4">Ringkasan Live Penjualan</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <div className="text-xs text-secondary uppercase mb-1">Total Omset Kotor</div>
                  <div className="text-xl font-extrabold text-primary">{formatCurrency(totals.omsetKotor)}</div>
                </div>
                <div>
                  <div className="text-xs text-secondary uppercase mb-1" style={{ color: 'var(--color-danger-text)' }}>Retur</div>
                  <div className="text-xl font-extrabold text-danger" style={{ color: 'var(--color-danger-text)' }}>
                    {formatCurrency(totals.retur)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-secondary uppercase mb-1" style={{ color: 'var(--color-success-text)' }}>Total Omset Bersih</div>
                  <div className="text-xl font-extrabold text-success" style={{ color: 'var(--color-success-text)' }}>
                    {formatCurrency(totals.omsetBersih)}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSalesInputs({})
                  setInputRetur('')
                  setInputNotes('')
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
                {loading ? 'Menyimpan...' : 'Simpan Penjualan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

// Wrapping with Toast Provider
export default function PenjualanPage(): React.JSX.Element {
  return (
    <ToastProvider>
      <PenjualanPageContent />
    </ToastProvider>
  )
}
