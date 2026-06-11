'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge, Table, Modal, ToastProvider, useToast } from '@/components/ui'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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

        let addedCount = 0
        let duplicateCount = 0

        if (supabaseActive) {
          const supabase = createClient()
          if (supabase) {
            // Fetch existing signatures in database to prevent duplicates
            const { data: existingMuts, error } = await supabase
              .from('bank_mutations')
              .select('reference_number')
              .eq('bank_account_id', selectedAccountId)
            
            if (error) throw error
            const existingSignatures = new Set(
              (existingMuts || []).map((m: any) => m.reference_number).filter(Boolean)
            )

            const insertPromises: Promise<any>[] = []

            for (const row of parsedRows) {
              if (existingSignatures.has(row.signature)) {
                duplicateCount++
                continue
              }

              const insertMutation = async () => {
                return await supabase.from('bank_mutations').insert({
                  bank_account_id: selectedAccountId,
                  mutation_date: row.dateStr,
                  amount: row.amount,
                  description: row.description,
                  reference_number: row.signature,
                  is_reconciled: false,
                  created_by: profile?.id
                })
              }
              insertPromises.push(insertMutation())
              addedCount++
            }

            if (insertPromises.length > 0) {
              const results = await Promise.all(insertPromises)
              const hasError = results.some(r => r.error)
              if (hasError) throw new Error('Beberapa transaksi gagal diimpor ke server.')
            }
          }
        } else {
          // Demo Mode
          const localMutsStr = localStorage.getItem('raja-aksesoris-bank-mutations') || '[]'
          const localMuts: any[] = JSON.parse(localMutsStr)
          
          const existingSignatures = new Set(localMuts.map(m => m.noRef).filter(Boolean))

          for (const row of parsedRows) {
            if (existingSignatures.has(row.signature)) {
              duplicateCount++
              continue
            }

            localMuts.push({
              id: `mut-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              tanggal: row.dateStr,
              jumlah: row.amount,
              keterangan: row.description,
              noRef: row.signature,
              reconciled: false,
              bankAccountId: selectedAccountId
            })
            addedCount++
          }

          localStorage.setItem('raja-aksesoris-bank-mutations', JSON.stringify(localMuts))
        }

        toast.success(`Berhasil mengimpor ${addedCount} mutasi baru. (${duplicateCount} transaksi duplikat dilewati)`)
        loadMutations()
      } catch (err: any) {
        console.error('Error importing CSV:', err)
        toast.error(err.message || 'Gagal membaca dan mengimpor file CSV.')
      } finally {
        // Clear value of uploader input so it can trigger onChange again for same file
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
            disabled={!selectedAccountId}
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
            disabled={!selectedAccountId}
          >
            <IconPlus />
            Tambah Mutasi
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
