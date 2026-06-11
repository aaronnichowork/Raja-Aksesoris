'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge, Table, Modal, ToastProvider, useToast } from '@/components/ui'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/hooks/useBranch'
import type { TableColumn } from '@/components/ui/Table'

/* ── SVG Icons ─────────────────────────────────────────────────────────── */

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function IconPlus() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconFilter() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  )
}

/* ── Types ─────────────────────────────────────────────────────────────── */

interface BankAccount {
  id: string
  bank_name: string
  account_number: string
  account_name: string
}

interface MutationRow extends Record<string, any> {
  id: string
  tanggal: Date
  jumlah: number
  keterangan: string
  noRef: string
  reconciled: boolean
  bankAccountId: string
}

interface MutationFormData {
  tanggal: string
  jumlah: string
  keterangan: string
  noRef: string
}

interface PettyCashCategory {
  id: string
  name: string
  is_active?: boolean
}

const PETTY_CASH_CATEGORIES: PettyCashCategory[] = [
  { id: 'cat-1', name: 'Supplies / Perlengkapan' },
  { id: 'cat-2', name: 'Biaya Operasional' },
  { id: 'cat-3', name: 'Ongkos Kirim' },
  { id: 'cat-4', name: 'Transport Antar Cabang' },
  { id: 'cat-5', name: 'Perbaikan / Maintenance' },
  { id: 'cat-6', name: 'Makan Event' },
  { id: 'cat-7', name: 'Lain-lain' }
]

/* ── Demo Bank Account & Mutations ────────────────────────────────────── */

const DEFAULT_DEMO_ACCOUNT: BankAccount = {
  id: 'acc-demo-1',
  bank_name: 'BCA',
  account_number: '1234567890',
  account_name: 'PT Raja Aksesoris'
}

/* ── BCA CSV Parser Helper ────────────────────────────────────────────── */

function parseBCACSV(text: string, currentYear: number): { dateStr: string; description: string; amount: number; balance: number; signature: string }[] {
  const lines = text.split(/\r?\n/)
  let headerIndex = -1
  let delimiter = ','

  // 1. Find the header row
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase()
    if ((line.includes('tanggal') || line.includes('date')) && 
        (line.includes('keterangan') || line.includes('description'))) {
      headerIndex = i
      const commaCount = (line.match(/,/g) || []).length
      const semicolonCount = (line.match(/;/g) || []).length
      delimiter = semicolonCount > commaCount ? ';' : ','
      break
    }
  }

  if (headerIndex === -1) {
    throw new Error('Format CSV tidak dikenali. Kolom "Tanggal" dan "Keterangan" tidak ditemukan.')
  }

  // 2. Parse headers
  const headers = lines[headerIndex].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase())
  const colDate = headers.findIndex(h => h.includes('tanggal') || h.includes('date'))
  const colDesc = headers.findIndex(h => h.includes('keterangan') || h.includes('description') || h.includes('detail'))
  const colAmt = headers.findIndex(h => h.includes('nominal') || h.includes('amount') || h.includes('jumlah') || h.includes('debet') || h.includes('kredit'))
  const colType = headers.findIndex(h => h.includes('db/cr') || h.includes('db') || h.includes('cr') || h.includes('type') || h.includes('debet/kredit') || h.includes('d/k') || h.includes('dk'))
  const colBal = headers.findIndex(h => h.includes('saldo') || h.includes('balance'))

  const results: any[] = []

  const parseIndoNumber = (val: string): number => {
    let clean = val.replace(/[^0-9,\.-]/g, '').trim()
    const lastComma = clean.lastIndexOf(',')
    const lastDot = clean.lastIndexOf('.')

    if (lastComma !== -1 && lastDot !== -1) {
      if (lastComma < lastDot) {
        // US format: 1,381,500.00 -> remove commas
        clean = clean.replace(/,/g, '')
      } else {
        // Indo format: 1.381.500,00 -> remove dots, replace comma with dot
        clean = clean.replace(/\./g, '').replace(/,/g, '.')
      }
    } else if (lastComma !== -1) {
      // Only has commas
      const parts = clean.split(',')
      if (parts.length === 2 && parts[1].length <= 2) {
        clean = clean.replace(/,/g, '.')
      } else {
        clean = clean.replace(/,/g, '')
      }
    } else if (lastDot !== -1) {
      // Only has dots
      const parts = clean.split('.')
      if (parts.length > 2 || (parts.length === 2 && parts[1].length > 2)) {
        clean = clean.replace(/\./g, '')
      }
    }
    return parseFloat(clean) || 0
  }

  // 3. Parse rows
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) continue

    let cols: string[] = []
    if (rawLine.includes('"')) {
      const regex = new RegExp(`\\s*(${delimiter}|\\n)\\s*(?=(?:[^"]*"[^"]*")*[^"]*$)`)
      cols = rawLine.split(regex).filter(val => val !== delimiter && val !== '\n')
    } else {
      cols = rawLine.split(delimiter)
    }

    cols = cols.map(c => c.trim().replace(/^['"\s]+|['"\s]+$/g, ''))

    if (cols.length <= Math.max(colDate, colDesc, colAmt)) continue

    const rawDate = cols[colDate]
    const rawDesc = cols[colDesc]
    let rawAmount = cols[colAmt]
    const rawType = colType !== -1 ? cols[colType].toUpperCase() : ''
    const rawBal = colBal !== -1 ? cols[colBal] : ''

    let parsedDateStr = ''
    const dateMatch = rawDate.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/)
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10)
      const month = parseInt(dateMatch[2], 10)
      const year = dateMatch[3] ? parseInt(dateMatch[3], 10) : currentYear
      const fullYear = year < 100 ? 2000 + year : year
      parsedDateStr = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    } else {
      continue
    }

    let amount = parseIndoNumber(rawAmount)
    let type = rawType
    
    if (rawAmount.toUpperCase().includes('DB') || rawAmount.toUpperCase().includes('DR')) {
      type = 'DB'
    } else if (rawAmount.toUpperCase().includes('CR') || rawAmount.toUpperCase().includes('K')) {
      type = 'CR'
    }

    if (type === 'DB' || type === 'D' || type === 'DEBET' || type === 'DEBIT') {
      amount = -Math.abs(amount)
    } else if (type === 'CR' || type === 'K' || type === 'KREDIT' || type === 'CREDIT') {
      amount = Math.abs(amount)
    }

    const balance = colBal !== -1 ? parseIndoNumber(rawBal) : 0
    const cleanDesc = rawDesc.replace(/\s+/g, ' ').trim()
    const sigDesc = cleanDesc.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
    const signature = `${parsedDateStr}_${sigDesc}_${amount}_${balance}`

    results.push({
      dateStr: parsedDateStr,
      description: cleanDesc,
      amount,
      balance,
      signature
    })
  }

  return results
}

/* ── Page Component ───────────────────────────────────────────────────── */

function MutationsPageContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const { branches } = useBranch(profile)
  const [categories, setCategories] = useState<PettyCashCategory[]>(PETTY_CASH_CATEGORIES)
  const [unmatchedSales, setUnmatchedSales] = useState<any[]>([])
  const [tempMutations, setTempMutations] = useState<any[] | null>(null)

  const [accounts, setAccounts] = useState<BankAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [mutations, setMutations] = useState<MutationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  
  // Date filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Form states
  const [formData, setFormData] = useState<MutationFormData>({
    tanggal: new Date().toISOString().split('T')[0],
    jumlah: '',
    keterangan: '',
    noRef: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const supabaseActive = isSupabaseConfigured

  // 1. Fetch bank accounts
  const loadBankAccounts = async () => {
    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data, error } = await supabase
            .from('bank_accounts')
            .select('id, bank_name, account_number, account_name')
            .eq('is_active', true)
          
          if (error) throw error
          
          if (data && data.length > 0) {
            setAccounts(data)
            setSelectedAccountId(data[0].id)
          } else {
            // Seed a default account if none exists in DB
            const { data: newAcc, error: insertError } = await supabase
              .from('bank_accounts')
              .insert({
                bank_name: DEFAULT_DEMO_ACCOUNT.bank_name,
                account_number: DEFAULT_DEMO_ACCOUNT.account_number,
                account_name: DEFAULT_DEMO_ACCOUNT.account_name,
                is_active: true
              })
              .select()
            
            if (insertError) throw insertError
            if (newAcc && newAcc.length > 0) {
              setAccounts(newAcc)
              setSelectedAccountId(newAcc[0].id)
            }
          }
        }
      } catch (err) {
        console.error('Failed to load bank accounts from Supabase:', err)
      }
    } else {
      // Demo Mode: load from local storage
      const localAccsStr = localStorage.getItem('raja-aksesoris-bank-accounts')
      let localAccs: BankAccount[] = []
      if (localAccsStr) {
        try {
          localAccs = JSON.parse(localAccsStr)
        } catch (e) {
          localAccs = []
        }
      }

      if (localAccs.length === 0) {
        localAccs = [DEFAULT_DEMO_ACCOUNT]
        localStorage.setItem('raja-aksesoris-bank-accounts', JSON.stringify(localAccs))
      }

      setAccounts(localAccs)
      setSelectedAccountId(localAccs[0].id)
    }
  }

  // Fetch expense categories
  const loadCategories = async () => {
    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data, error } = await supabase
            .from('expense_categories')
            .select('*')
            .eq('is_active', true)
          if (error) throw error
          if (data && data.length > 0) {
            setCategories(data)
          }
        }
      } catch (err) {
        console.error('Failed to load categories from Supabase:', err)
      }
    }
  }

  // Fetch unmatched sales reconciliations
  const loadUnmatchedSales = async () => {
    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data, error } = await supabase
            .from('reconciliations')
            .select(`
              id,
              sale_date,
              expected_settlement,
              branches (id, name),
              payment_methods (id, name)
            `)
            .or('status.eq.pending,status.eq.discrepancy')
          if (error) throw error
          
          const mapped = (data || []).map((row: any) => ({
            id: row.id,
            date: row.sale_date,
            branchName: row.branches?.name || 'Unknown',
            branchId: row.branches?.id,
            methodName: row.payment_methods?.name || 'Unknown',
            amount: parseFloat(row.expected_settlement) || 0
          }))
          setUnmatchedSales(mapped)
          return mapped
        }
      } catch (err) {
        console.error('Failed to load unmatched sales:', err)
      }
    } else {
      // Demo Mode
      try {
        const localReconsStr = localStorage.getItem('raja-aksesoris-reconciliations') || '[]'
        const localRecons: any[] = JSON.parse(localReconsStr)
        const pendingRecons = localRecons.filter(r => r.status === 'pending' || r.status === 'discrepancy')
        
        const mapped = pendingRecons.map(row => ({
          id: row.id,
          date: row.date,
          branchName: row.branchName,
          branchId: row.branchId,
          methodName: row.paymentMethodName,
          amount: row.expectedSettlement
        }))
        setUnmatchedSales(mapped)
        return mapped
      } catch (err) {
        console.error('Failed to load local unmatched sales:', err)
      }
    }
    return []
  }

  // 2. Fetch mutations
  const loadMutations = async () => {
    if (!selectedAccountId) return
    setLoading(true)

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { data, error } = await supabase
            .from('bank_mutations')
            .select('*')
            .eq('bank_account_id', selectedAccountId)
            .order('mutation_date', { ascending: false })

          if (error) throw error

          const mapped: MutationRow[] = (data || []).map((m: any) => ({
            id: m.id,
            tanggal: new Date(m.mutation_date),
            jumlah: parseFloat(m.amount) || 0,
            keterangan: m.description || '',
            noRef: m.reference_number || '-',
            reconciled: m.is_reconciled || false,
            bankAccountId: m.bank_account_id
          }))
          setMutations(mapped)
        }
      } catch (e) {
        console.error('Failed to load bank mutations:', e)
        toast.error('Gagal memuat mutasi bank dari server.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode
      let localMuts = localStorage.getItem('raja-aksesoris-bank-mutations')
      if (!localMuts) {
        localStorage.setItem('raja-aksesoris-bank-mutations', JSON.stringify([]))
        localMuts = '[]'
      }

      try {
        let parsed = JSON.parse(localMuts) as any[]
        // Clean up any existing demo data
        const beforeCount = parsed.length
        parsed = parsed.filter(m => !String(m.id).startsWith('mut-demo-') && !String(m.noRef).startsWith('demo_'))
        if (parsed.length !== beforeCount) {
          localStorage.setItem('raja-aksesoris-bank-mutations', JSON.stringify(parsed))
        }

        const filtered = parsed.filter(m => m.bankAccountId === selectedAccountId)
        
        const mapped: MutationRow[] = filtered.map(m => ({
          id: m.id,
          tanggal: new Date(m.tanggal),
          jumlah: m.jumlah,
          keterangan: m.keterangan,
          noRef: m.noRef,
          reconciled: m.reconciled,
          bankAccountId: m.bankAccountId
        }))
        setMutations(mapped.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()))
      } catch (err) {
        console.error('Failed to load demo mutations:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  // Load account on mount
  useEffect(() => {
    loadBankAccounts()
    loadCategories()
  }, [])

  // Load mutations when selected account changes
  useEffect(() => {
    loadMutations()
  }, [selectedAccountId])

  /* ── Filtered data ──────────────────────────────────────────────── */
  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      if (dateFrom) {
        const from = new Date(dateFrom)
        from.setHours(0, 0, 0, 0)
        if (m.tanggal < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (m.tanggal > to) return false
      }
      return true
    })
  }, [mutations, dateFrom, dateTo])

  /* ── CSV BCA Upload Handler ────────────────────────────────────────── */
  const handleTempRowChange = (rowId: string, field: string, value: string) => {
    setTempMutations(prev => {
      if (!prev) return null
      return prev.map(row => {
        if (row.id === rowId) {
          const updated = { ...row, [field]: value }
          if (field === 'category_id' && value && !row.branchId) {
            updated.branchId = branches[0]?.id || 'b1'
          }
          return updated
        }
        return row
      })
    })
  }

  const handleCancelImport = () => {
    setTempMutations(null)
    toast.success('Impor CSV dibatalkan. Silakan unggah file CSV baru jika diperlukan.')
  }

  const handleConfirmImport = async () => {
    if (!tempMutations || tempMutations.length === 0) return
    setLoading(true)

    let addedCount = 0

    try {
      if (supabaseActive) {
        const supabase = createClient()
        if (supabase) {
          const insertPromises: Promise<any>[] = []

          for (const row of tempMutations) {
            const isReconciled = !!row.matchedSaleId || !!row.category_id
            
            const insertMutation = async () => {
              const { data: inserted, error: insertError } = await supabase
                .from('bank_mutations')
                .insert({
                  bank_account_id: selectedAccountId,
                  mutation_date: row.dateStr,
                  amount: row.amount,
                  description: row.description,
                  reference_number: row.signature,
                  is_reconciled: isReconciled,
                  created_by: profile?.id
                })
                .select()
              
              if (insertError) throw insertError

              // If matched with daily sales reconciliation, update status
              if (row.matchedSaleId && inserted && inserted.length > 0) {
                const { error: updateReconError } = await supabase
                  .from('reconciliations')
                  .update({
                    status: 'matched',
                    actual_amount: row.amount
                  })
                  .eq('id', row.matchedSaleId)
                
                if (updateReconError) throw updateReconError
              }

              // If expense categorized, create petty cash record
              if (row.category_id && inserted && inserted.length > 0) {
                const { error: insertPCError } = await supabase
                  .from('petty_cash')
                  .insert({
                    branch_id: row.branchId || 'b1',
                    transaction_date: row.dateStr,
                    category_id: row.category_id,
                    description: `[Auto-import Mutasi] ${row.description}`,
                    amount: Math.abs(row.amount),
                    type: 'expense',
                    created_by: profile?.id
                  })
                if (insertPCError) throw insertPCError
              }
            }

            insertPromises.push(insertMutation())
            addedCount++
          }

          const results = await Promise.all(insertPromises)
          const hasError = results.some((r: any) => r && r.error)
          if (hasError) throw new Error('Beberapa transaksi gagal diimpor ke server.')
        }
      } else {
        // Demo Mode (localStorage)
        const localMutsStr = localStorage.getItem('raja-aksesoris-bank-mutations') || '[]'
        const localMuts: any[] = JSON.parse(localMutsStr)

        const localReconsStr = localStorage.getItem('raja-aksesoris-reconciliations') || '[]'
        const localRecons: any[] = JSON.parse(localReconsStr)

        const localPCStr = localStorage.getItem('raja-aksesoris-petty-cash') || '[]'
        const localPC: any[] = JSON.parse(localPCStr)

        for (const row of tempMutations) {
          const isReconciled = !!row.matchedSaleId || !!row.category_id
          const newMutId = `mut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

          // 1. Save Bank Mutation
          localMuts.push({
            id: newMutId,
            tanggal: row.dateStr,
            jumlah: row.amount,
            keterangan: row.description,
            noRef: row.signature,
            reconciled: isReconciled,
            bankAccountId: selectedAccountId
          })

          // 2. If matched with daily sales reconciliation, update status
          if (row.matchedSaleId) {
            const reconIndex = localRecons.findIndex(r => String(r.id) === String(row.matchedSaleId))
            if (reconIndex !== -1) {
              localRecons[reconIndex].status = 'matched'
              localRecons[reconIndex].actualAmount = row.amount
            }
          }

          // 3. If expense categorized, create petty cash record
          if (row.category_id) {
            localPC.push({
              id: `pc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              branchId: row.branchId || 'b1',
              dateStr: row.dateStr,
              type: 'expense',
              categoryId: row.category_id,
              description: `[Auto-import Mutasi] ${row.description}`,
              amount: Math.abs(row.amount),
              receiptPreview: ''
            })
          }

          addedCount++
        }

        localStorage.setItem('raja-aksesoris-bank-mutations', JSON.stringify(localMuts))
        localStorage.setItem('raja-aksesoris-reconciliations', JSON.stringify(localRecons))
        localStorage.setItem('raja-aksesoris-petty-cash', JSON.stringify(localPC))
      }

      toast.success(`Berhasil menyimpan ${addedCount} transaksi mutasi bank.`)
      setTempMutations(null)
      loadMutations()
    } catch (err: any) {
      console.error('Failed to confirm import:', err)
      toast.error(err.message || 'Gagal menyimpan hasil impor mutasi.')
    } finally {
      setLoading(false)
    }
  }

  const handleCSVUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const text = event.target?.result as string
      if (!text) return

      try {
        const currentYear = new Date().getFullYear()
        const parsedRows = parseBCACSV(text, currentYear)

        if (parsedRows.length === 0) {
          toast.warning('Tidak ada data transaksi yang valid ditemukan dalam file CSV.')
          return
        }

        // Fetch existing signatures to prevent duplicates
        let existingSignatures = new Set<string>()

        if (supabaseActive) {
          const supabase = createClient()
          if (supabase) {
            const { data: existingMuts, error } = await supabase
              .from('bank_mutations')
              .select('reference_number')
              .eq('bank_account_id', selectedAccountId)
            
            if (error) throw error
            existingSignatures = new Set(
              (existingMuts || []).map((m: any) => m.reference_number).filter(Boolean)
            )
          }
        } else {
          const localMutsStr = localStorage.getItem('raja-aksesoris-bank-mutations') || '[]'
          const localMuts: any[] = JSON.parse(localMutsStr)
          existingSignatures = new Set(localMuts.map(m => m.noRef).filter(Boolean))
        }

        // Load the latest unmatched sales for auto-matching
        const latestSales = await loadUnmatchedSales()

        const tempRows: any[] = []
        let duplicateCount = 0

        parsedRows.forEach((row, index) => {
          if (existingSignatures.has(row.signature)) {
            duplicateCount++
            return
          }

          const type = row.amount >= 0 ? 'CR' : 'DB'
          
          // Try to auto-suggest matchedSaleId
          let matchedSaleId = ''
          if (type === 'CR') {
            const exactMatch = latestSales.find(sale => {
              const dateDiff = Math.abs(new Date(sale.date).getTime() - new Date(row.dateStr).getTime()) / (1000 * 60 * 60 * 24)
              return Math.abs(sale.amount - row.amount) <= (sale.amount * 0.01) && dateDiff <= 3
            })
            if (exactMatch) {
              matchedSaleId = exactMatch.id
            }
          }

          tempRows.push({
            id: `temp-${index}-${Date.now()}`,
            dateStr: row.dateStr,
            description: row.description,
            amount: row.amount,
            balance: row.balance,
            signature: row.signature,
            type,
            category_id: '',
            branchId: branches[0]?.id || 'b1',
            matchedSaleId
          })
        })

        if (tempRows.length === 0) {
          toast.warning(`Impor CSV selesai. Semua ${duplicateCount} transaksi di dalam file CSV sudah ada sebelumnya (duplikat).`)
          return
        }

        setTempMutations(tempRows)
        if (duplicateCount > 0) {
          toast.success(`Pratinjau impor berhasil dimuat. ${duplicateCount} transaksi duplikat dilewati.`)
        } else {
          toast.success('Pratinjau impor berhasil dimuat.')
        }
      } catch (err: any) {
        console.error('Error importing CSV:', err)
        toast.error(err.message || 'Gagal membaca dan mengimpor file CSV.')
      } finally {
        e.target.value = ''
      }
    }
    reader.readAsText(file)
  }

  /* ── Add Manual Mutation ────────────────────────────────────────── */
  const handleFormChange = useCallback((field: keyof MutationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleAddMutation = async () => {
    const newErrors: Record<string, string> = {}
    if (!formData.tanggal) newErrors.tanggal = 'Tanggal wajib diisi'
    if (!formData.jumlah || isNaN(parseFloat(formData.jumlah))) newErrors.jumlah = 'Jumlah harus berupa angka'
    if (!formData.keterangan.trim()) newErrors.keterangan = 'Keterangan wajib diisi'

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors)
      return
    }

    const amountVal = parseFloat(formData.jumlah)

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const { error } = await supabase
            .from('bank_mutations')
            .insert({
              bank_account_id: selectedAccountId,
              mutation_date: formData.tanggal,
              amount: amountVal,
              description: formData.keterangan.trim(),
              reference_number: formData.noRef.trim() || `manual_${Date.now()}`,
              is_reconciled: false,
              created_by: profile?.id
            })

          if (error) throw error
          toast.success('Mutasi manual berhasil ditambahkan.')
          setModalOpen(false)
          loadMutations()
        }
      } catch (err) {
        console.error('Failed to add manual mutation:', err)
        toast.error('Gagal menyimpan mutasi ke server.')
      }
    } else {
      // Demo Mode
      try {
        const localMutsStr = localStorage.getItem('raja-aksesoris-bank-mutations') || '[]'
        const localMuts = JSON.parse(localMutsStr) as any[]

        const newMutation = {
          id: `mut-manual-${Date.now()}`,
          tanggal: formData.tanggal,
          jumlah: amountVal,
          keterangan: formData.keterangan.trim(),
          noRef: formData.noRef.trim() || `manual_${Date.now()}`,
          reconciled: false,
          bankAccountId: selectedAccountId
        }

        localMuts.push(newMutation)
        localStorage.setItem('raja-aksesoris-bank-mutations', JSON.stringify(localMuts))
        toast.success('Mutasi manual disimpan secara lokal.')
        setModalOpen(false)
        loadMutations()
      } catch (err) {
        console.error('Failed to save manual mutation:', err)
        toast.error('Gagal menyimpan mutasi secara lokal.')
      }
    }

    // Reset form
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      jumlah: '',
      keterangan: '',
      noRef: '',
    })
    setFormErrors({})
  }

  const handleDeleteMutation = async (id: string) => {
    if (!confirm('Hapus transaksi mutasi bank ini?')) return
    setLoading(true)

    try {
      if (supabaseActive) {
        const supabase = createClient()
        if (supabase) {
          // 1. Reset any reconciliation referencing this bank mutation
          const { error: resetReconError } = await supabase
            .from('reconciliations')
            .update({
              status: 'pending',
              actual_amount: 0,
              bank_mutation_id: null,
              settlement_date: null,
              discrepancy_amount: null
            })
            .eq('bank_mutation_id', id)
          
          if (resetReconError) {
            console.error('Failed to reset linked reconciliation:', resetReconError)
          }

          // 2. Delete the bank mutation
          const { error: deleteError } = await supabase
            .from('bank_mutations')
            .delete()
            .eq('id', id)
          
          if (deleteError) throw deleteError
        }
      } else {
        // Demo Mode (localStorage)
        const localMutsStr = localStorage.getItem('raja-aksesoris-bank-mutations') || '[]'
        let localMuts: any[] = JSON.parse(localMutsStr)
        
        const targetMut = localMuts.find(m => String(m.id) === String(id))

        if (targetMut) {
          // Remove the mutation
          localMuts = localMuts.filter(m => String(m.id) !== String(id))
          localStorage.setItem('raja-aksesoris-bank-mutations', JSON.stringify(localMuts))

          // Reset reconciliation if linked
          const localReconsStr = localStorage.getItem('raja-aksesoris-reconciliations') || '[]'
          const localRecons: any[] = JSON.parse(localReconsStr)

          let reconChanged = false
          const updatedRecons = localRecons.map(r => {
            if (String(r.bankMutationId) === String(id) || String(r.id) === String(targetMut.noRef)) {
              reconChanged = true
              return {
                ...r,
                status: 'pending',
                actualAmount: 0,
                bankMutationId: null,
                discrepancyAmount: null
              }
            }
            return r
          })

          if (reconChanged) {
            localStorage.setItem('raja-aksesoris-reconciliations', JSON.stringify(updatedRecons))
          }
        }
      }

      toast.success('Mutasi bank berhasil dihapus.')
      loadMutations()
    } catch (err: any) {
      console.error('Failed to delete bank mutation:', err)
      toast.error(err.message || 'Gagal menghapus mutasi bank.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAllMutations = async () => {
    if (!confirm('Apakah Anda yakin ingin menghapus semua mutasi bank untuk rekening ini? Transaksi yang sudah dicocokkan (reconciled) akan dikembalikan statusnya menjadi pending.')) return
    setLoading(true)

    try {
      if (supabaseActive) {
        const supabase = createClient()
        if (supabase) {
          // 1. Fetch mutations of this account first to get their IDs
          const { data: muts, error: fetchMutsError } = await supabase
            .from('bank_mutations')
            .select('id')
            .eq('bank_account_id', selectedAccountId)
          
          if (fetchMutsError) throw fetchMutsError

          if (muts && muts.length > 0) {
            const mutIds = muts.map(m => m.id)
            
            // Reset any reconciliations referencing these mutations
            const { error: resetReconError } = await supabase
              .from('reconciliations')
              .update({
                status: 'pending',
                actual_amount: 0,
                bank_mutation_id: null,
                settlement_date: null,
                discrepancy_amount: null
              })
              .in('bank_mutation_id', mutIds)
            
            if (resetReconError) {
              console.error('Failed to reset linked reconciliations:', resetReconError)
            }

            // 2. Delete all mutations for this account
            const { error: deleteMutsError } = await supabase
              .from('bank_mutations')
              .delete()
              .eq('bank_account_id', selectedAccountId)
            
            if (deleteMutsError) throw deleteMutsError
          }
        }
      } else {
        // Demo Mode (localStorage)
        const localMutsStr = localStorage.getItem('raja-aksesoris-bank-mutations') || '[]'
        let localMuts: any[] = JSON.parse(localMutsStr)
        
        // Filter out mutations belonging to this bank account
        const mutsToDelete = localMuts.filter(m => String(m.bankAccountId) === String(selectedAccountId))
        const deleteIds = new Set(mutsToDelete.map(m => String(m.id)))

        if (mutsToDelete.length > 0) {
          // Keep only mutations NOT belonging to this bank account
          const keptMuts = localMuts.filter(m => String(m.bankAccountId) !== String(selectedAccountId))
          localStorage.setItem('raja-aksesoris-bank-mutations', JSON.stringify(keptMuts))

          // Reset all reconciliations linked to these mutations
          const localReconsStr = localStorage.getItem('raja-aksesoris-reconciliations') || '[]'
          const localRecons: any[] = JSON.parse(localReconsStr)

          let reconChanged = false
          const updatedRecons = localRecons.map(r => {
            if (r.bankMutationId && deleteIds.has(String(r.bankMutationId))) {
              reconChanged = true
              return {
                ...r,
                status: 'pending',
                actualAmount: 0,
                bankMutationId: null,
                discrepancyAmount: null
              }
            }
            return r
          })

          if (reconChanged) {
            localStorage.setItem('raja-aksesoris-reconciliations', JSON.stringify(updatedRecons))
          }
        }
      }

      toast.success('Semua mutasi bank untuk rekening ini berhasil dihapus.')
      loadMutations()
    } catch (err: any) {
      console.error('Failed to delete all bank mutations:', err)
      toast.error(err.message || 'Gagal menghapus semua mutasi bank.')
    } finally {
      setLoading(false)
    }
  }

  /* ── Table Columns ──────────────────────────────────────────────── */
  const columns: TableColumn<MutationRow>[] = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (val) => formatDate(val as Date),
    },
    {
      key: 'jumlah',
      label: 'Jumlah',
      render: (val) => (
        <span className={(val as number) < 0 ? 'text-danger font-semibold' : 'text-success font-semibold'}>
          {(val as number) < 0 ? '-' : '+'}{formatCurrency(Math.abs(val as number))}
        </span>
      ),
    },
    { key: 'keterangan', label: 'Keterangan' },
    { key: 'noRef', label: 'No Ref / Signature' },
    {
      key: 'reconciled',
      label: 'Status',
      render: (val) => (
        <Badge variant={val ? 'success' : 'warning'}>
          {val ? 'Reconciled' : 'Belum'}
        </Badge>
      ),
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (_, row) => (
        <button
          className="btn btn-ghost btn-sm text-danger"
          style={{ minHeight: '32px', padding: '4px 8px' }}
          onClick={() => handleDeleteMutation(row.id)}
          title="Hapus Transaksi"
          aria-label="Hapus Transaksi"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
          </svg>
          Hapus
        </button>
      )
    }
  ]

  /* ── Summary counts ─────────────────────────────────────────────── */
  const reconciledCount = filteredMutations.filter((m) => m.reconciled).length
  const unreconciledCount = filteredMutations.filter((m) => !m.reconciled).length

  return (
    <div className="animate-fade-in">
      {/* ── Back Navigation ──────────────────────────────────────────── */}
      <Link
        href="/reconciliation"
        className="btn btn-ghost btn-sm mb-4"
        style={{ gap: 'var(--space-1)' }}
      >
        <IconArrowLeft />
        Kembali ke Rekonsiliasi
      </Link>

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="page-header flex-wrap gap-4">
        <div>
          <h1>Mutasi Bank</h1>
          <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-1)' }}>
            Kelola data transaksi masuk dan keluar dari rekening bank
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 items-center flex-wrap">
          <input
            type="file"
            id="csv-uploader"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={handleCSVUpload}
          />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => document.getElementById('csv-uploader')?.click()}
            disabled={!selectedAccountId || !!tempMutations}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import CSV BCA
          </button>
          
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
            disabled={!selectedAccountId || !!tempMutations}
          >
            <IconPlus />
            Tambah Mutasi
          </button>

          <button
            type="button"
            className="btn"
            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none' }}
            onClick={handleDeleteAllMutations}
            disabled={!selectedAccountId || !!tempMutations || mutations.length === 0}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}>
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
            </svg>
            Hapus Semua
          </button>
        </div>
      </div>

      {/* ── Account Selector & Summary ────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 animate-slide-up delay-1">
        {/* Account Selector */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-secondary" htmlFor="account-selector">Rekening Bank:</label>
          <select
            id="account-selector"
            className="select"
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            style={{ width: '280px', minHeight: '40px' }}
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.bank_name} - {acc.account_number} ({acc.account_name})
              </option>
            ))}
            {accounts.length === 0 && (
              <option value="">Tidak ada rekening aktif</option>
            )}
          </select>
        </div>

        {/* Count overview */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="badge badge-success">
              <span className="badge-dot" />
              Reconciled
            </span>
            <span className="font-semibold">{reconciledCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-warning">
              <span className="badge-dot" />
              Belum
            </span>
            <span className="font-semibold">{unreconciledCount}</span>
          </div>
          <span className="text-sm text-tertiary">
            Total: {filteredMutations.length} transaksi
          </span>
        </div>
      </div>

      {tempMutations ? (
        /* ── Preview Table for CSV import ────────────────────────────── */
        <div className="card mb-6 animate-slide-up">
          <div className="card-header flex items-center justify-between" style={{ borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3>Pratinjau Impor Mutasi Bank</h3>
              <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                Tinjau rincian transaksi dari CSV. Anda dapat mencocokkan kredit dengan Penjualan Harian atau mengategorikan debet pengeluaran ke Kas Kecil.
              </p>
            </div>
            <div className="flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={handleCancelImport} disabled={loading}>
                Batal Impor
              </button>
              <button type="button" className="btn btn-success" onClick={handleConfirmImport} disabled={loading}>
                Konfirmasi & Simpan ({tempMutations.length} Transaksi)
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tanggal</th>
                    <th>Keterangan</th>
                    <th>Tipe</th>
                    <th style={{ textAlign: 'right' }}>Jumlah</th>
                    <th style={{ textAlign: 'right' }}>Saldo</th>
                    <th style={{ width: '380px' }}>Aksi (Pencocokan / Kategori Biaya)</th>
                  </tr>
                </thead>
                <tbody>
                  {tempMutations.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="font-semibold">{formatDate(new Date(row.dateStr))}</span>
                      </td>
                      <td style={{ fontSize: 'var(--text-xs)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.description}>
                        {row.description}
                      </td>
                      <td>
                        <Badge variant={row.type === 'CR' ? 'success' : 'danger'}>
                          {row.type === 'CR' ? 'Credit (CR)' : 'Debit (DB)'}
                        </Badge>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 'var(--font-semibold)', color: row.type === 'CR' ? 'var(--color-success-text)' : 'inherit' }}>
                        {row.type === 'CR' ? '+' : ''}{formatCurrency(row.amount)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-text-secondary)', fontSize: 'var(--text-xs)' }}>
                        {formatCurrency(row.balance)}
                      </td>
                      <td>
                        {row.type === 'CR' ? (
                          <select
                            className="select w-full"
                            style={{ fontSize: 'var(--text-xs)', minHeight: '34px', padding: '4px 8px' }}
                            value={row.matchedSaleId || ''}
                            onChange={(e) => handleTempRowChange(row.id, 'matchedSaleId', e.target.value)}
                            aria-label="Pilih data penjualan"
                          >
                            <option value="">-- Simpan Saja (Tidak Dicocokkan) --</option>
                            {unmatchedSales.map((sale) => (
                              <option key={sale.id} value={sale.id}>
                                {formatDate(new Date(sale.date))} - {sale.branchName} - {sale.methodName} ({formatCurrency(sale.amount)})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex gap-2">
                            <select
                              className="select"
                              style={{ fontSize: 'var(--text-xs)', minHeight: '34px', padding: '4px 8px', flex: 1 }}
                              value={row.category_id || ''}
                              onChange={(e) => handleTempRowChange(row.id, 'category_id', e.target.value)}
                              aria-label="Pilih kategori biaya"
                            >
                              <option value="">-- Kategori Pengeluaran --</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>
                            {row.category_id && (
                              <select
                                className="select"
                                style={{ fontSize: 'var(--text-xs)', minHeight: '34px', padding: '4px 8px', width: '130px' }}
                                value={row.branchId || ''}
                                onChange={(e) => handleTempRowChange(row.id, 'branchId', e.target.value)}
                                aria-label="Pilih cabang"
                              >
                                {branches.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Date Range Filter ────────────────────────────────────────── */}
          <div className="card mb-6 animate-slide-up delay-2">
            <div className="card-body">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <IconFilter />
                  <span className="font-medium text-sm">Filter Tanggal:</span>
                </div>
                <div className="input-group" style={{ maxWidth: '200px', margin: 0 }}>
                  <label className="input-label" htmlFor="date-from">Dari</label>
                  <input
                    id="date-from"
                    type="date"
                    className="input"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    style={{ minHeight: '40px' }}
                  />
                </div>
                <div className="input-group" style={{ maxWidth: '200px', margin: 0 }}>
                  <label className="input-label" htmlFor="date-to">Sampai</label>
                  <input
                    id="date-to"
                    type="date"
                    className="input"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    style={{ minHeight: '40px' }}
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => { setDateFrom(''); setDateTo('') }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Mutations Table ──────────────────────────────────────────── */}
          {loading ? (
            <div className="card">
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-12)' }}>
                <span className="spinner spinner-lg" />
                <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>Memuat data mutasi bank...</p>
              </div>
            </div>
          ) : (
            <div className="animate-slide-up delay-3">
              <Table
                columns={columns}
                data={filteredMutations}
                emptyMessage="Tidak ada data mutasi bank untuk rekening atau periode ini."
              />
            </div>
          )}
        </>
      )}

      {/* ── Add Mutation Modal ───────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setFormErrors({})
        }}
        title="Tambah Mutasi Bank"
        footer={
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setModalOpen(false)
                setFormErrors({})
              }}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddMutation}
            >
              <IconPlus />
              Tambah
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          {/* Tanggal */}
          <div className="input-group">
            <label className="input-label" htmlFor="modal-tanggal">
              Tanggal <span className="required">*</span>
            </label>
            <input
              id="modal-tanggal"
              type="date"
              className={`input ${formErrors.tanggal ? 'input-error-state' : ''}`}
              value={formData.tanggal}
              onChange={(e) => handleFormChange('tanggal', e.target.value)}
            />
            {formErrors.tanggal && (
              <p className="input-error" role="alert">{formErrors.tanggal}</p>
            )}
          </div>

          {/* Jumlah */}
          <div className="input-group">
            <label className="input-label" htmlFor="modal-jumlah">
              Jumlah (Rp) <span className="required">*</span>
            </label>
            <input
              id="modal-jumlah"
              type="text"
              inputMode="numeric"
              className={`input ${formErrors.jumlah ? 'input-error-state' : ''}`}
              placeholder="Contoh: 1500000 (negatif untuk pengeluaran)"
              value={formData.jumlah}
              onChange={(e) => handleFormChange('jumlah', e.target.value)}
            />
            {formErrors.jumlah && (
              <p className="input-error" role="alert">{formErrors.jumlah}</p>
            )}
            <p className="input-helper">Gunakan angka negatif (misal: -500000) untuk pengeluaran</p>
          </div>

          {/* Keterangan */}
          <div className="input-group">
            <label className="input-label" htmlFor="modal-keterangan">
              Keterangan <span className="required">*</span>
            </label>
            <input
              id="modal-keterangan"
              type="text"
              className={`input ${formErrors.keterangan ? 'input-error-state' : ''}`}
              placeholder="Contoh: Settlement QRIS - BCA"
              value={formData.keterangan}
              onChange={(e) => handleFormChange('keterangan', e.target.value)}
            />
            {formErrors.keterangan && (
              <p className="input-error" role="alert">{formErrors.keterangan}</p>
            )}
          </div>

          {/* No Referensi */}
          <div className="input-group">
            <label className="input-label" htmlFor="modal-noref">
              No Referensi / Unique Key
            </label>
            <input
              id="modal-noref"
              type="text"
              className="input"
              placeholder="Opsional (akan terbuat otomatis jika dikosongkan)"
              value={formData.noRef}
              onChange={(e) => handleFormChange('noRef', e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default function MutationsPage() {
  return (
    <ToastProvider>
      <MutationsPageContent />
    </ToastProvider>
  )
}
