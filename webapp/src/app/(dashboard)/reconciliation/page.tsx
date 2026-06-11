'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatCard, Badge, Table, DatePicker } from '@/components/ui'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'
import type { TableColumn } from '@/components/ui/Table'

/* ── SVG Icons ─────────────────────────────────────────────────────────── */

function IconWallet() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z" />
    </svg>
  )
}

function IconBank() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="10" width="18" height="11" rx="2" />
      <path d="M12 3L2 10h20L12 3z" />
      <path d="M7 14v4M12 14v4M17 14v4" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function IconDelta() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3L2 21h20L12 3z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  )
}

/* ── Demo Data ─────────────────────────────────────────────────────────── */

const BRANCHES = [
  'Pusat - Jl. Raya Bogor',
  'Cabang Depok',
  'Cabang Bekasi',
  'Cabang Tangerang',
  'Cabang Cibubur',
]

const PAYMENT_METHODS = ['Cash', 'Transfer Bank', 'QRIS', 'Debit', 'Kartu Kredit', 'Shopee', 'TikTok']

interface DemoDataRow {
  id: number
  tanggal: Date
  cabang: string
  metode: string
  omset: number
  mdr: number
  expected: number
  actual: number
  status: 'matched' | 'pending' | 'discrepancy'
}

function generateDemoData(month: number, year: number): DemoDataRow[] {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const rows: DemoDataRow[] = []
  let id = 1

  for (let day = 1; day <= Math.min(daysInMonth, 15); day++) {
    const branch = BRANCHES[day % BRANCHES.length]
    const method = PAYMENT_METHODS[day % PAYMENT_METHODS.length]
    const omset = Math.round((500000 + Math.random() * 5000000) / 1000) * 1000
    const mdrRate = method === 'Cash' ? 0 : method === 'Transfer Bank' ? 0 : method === 'QRIS' ? 0.7 : method === 'Debit' ? 0.6 : method === 'Kartu Kredit' ? 2.2 : 3
    const mdr = Math.round(omset * mdrRate / 100)
    const expected = omset - mdr
    const statusRoll = Math.random()
    const status = statusRoll < 0.5 ? 'matched' : statusRoll < 0.8 ? 'pending' : 'discrepancy'
    const actual = status === 'matched' ? expected : status === 'pending' ? 0 : expected + Math.round((Math.random() - 0.5) * 100000)

    rows.push({
      id: id++,
      tanggal: new Date(year, month, day),
      cabang: branch,
      metode: method,
      omset,
      mdr,
      expected,
      actual,
      status,
    })
  }

  return rows
}

/* ── Status Badge helper ──────────────────────────────────────────────── */

interface StatusBadgeProps {
  status: 'matched' | 'pending' | 'discrepancy' | string
}

function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, { variant: 'success' | 'warning' | 'danger' | 'secondary'; label: string }> = {
    matched: { variant: 'success', label: 'Matched' },
    pending: { variant: 'warning', label: 'Pending' },
    discrepancy: { variant: 'danger', label: 'Discrepancy' }
  }
  const config = map[status] || { variant: 'secondary', label: status }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

interface MappedReconRow extends Record<string, any> {
  id: string | number
  tanggal: Date
  cabang: string
  metode: string
  omset: number
  mdr: number
  expected: number
  actual: number
  status: 'matched' | 'pending' | 'discrepancy' | string
}

export default function ReconciliationPage() {
  const now = new Date()
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth())
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [data, setData] = useState<MappedReconRow[]>([])
  const [loading, setLoading] = useState(true)

  const supabaseActive = isSupabaseConfigured

  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear])

  const loadData = async () => {
    setLoading(true)
    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          const startDate = new Date(selectedYear, selectedMonth, 1).toISOString().split('T')[0]
          const endDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split('T')[0]

          const { data: dbData, error } = await supabase
            .from('reconciliations')
            .select(`
              id,
              sale_date,
              expected_amount,
              mdr_amount,
              expected_settlement,
              actual_amount,
              status,
              branches (name),
              payment_methods (name)
            `)
            .gte('sale_date', startDate)
            .lte('sale_date', endDate)

          if (error) throw error

          const mapped: MappedReconRow[] = (dbData || []).map((row: any) => ({
            id: row.id,
            tanggal: new Date(row.sale_date),
            cabang: row.branches?.name || 'Unknown',
            metode: row.payment_methods?.name || 'Unknown',
            omset: parseFloat(row.expected_amount) || 0,
            mdr: parseFloat(row.mdr_amount) || 0,
            expected: parseFloat(row.expected_settlement) || 0,
            actual: parseFloat(row.actual_amount) || 0,
            status: row.status
          }))
          setData(mapped.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()))
        }
      } catch (e) {
        console.error('Failed to load reconciliations:', e)
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode: read from localStorage
      let localRecons = localStorage.getItem('raja-aksesoris-reconciliations')
      if (!localRecons) {
        // Pre-fill local storage with 3 months of mock data if empty
        const initialRecons: any[] = []
        const today = new Date()
        for (let mOffset = -2; mOffset <= 0; mOffset++) {
          const targetMonth = new Date(today.getFullYear(), today.getMonth() + mOffset, 1)
          const m = targetMonth.getMonth()
          const y = targetMonth.getFullYear()
          const generated = generateDemoData(m, y)
          generated.forEach(item => {
            const dateStr = item.tanggal.toISOString().split('T')[0]
            initialRecons.push({
              id: `recon-demo-${m}-${item.id}`,
              branchId: item.cabang.includes('Depok') ? 'cab-2' : item.cabang.includes('Bekasi') ? 'cab-3' : 'cab-1',
              branchName: item.cabang,
              date: dateStr,
              paymentMethodId: item.metode === 'Cash' ? 'pay-1' : 'pay-3',
              paymentMethodName: item.metode,
              expectedAmount: item.omset,
              mdrAmount: item.mdr,
              expectedSettlement: item.expected,
              actualAmount: item.actual,
              status: item.status,
              notes: 'Data demo otomatis'
            })
          })
        }
        localStorage.setItem('raja-aksesoris-reconciliations', JSON.stringify(initialRecons))
        localRecons = JSON.stringify(initialRecons)
      }

      try {
        const parsed = JSON.parse(localRecons) as any[]
        const filtered = parsed.filter(item => {
          const itemDate = new Date(item.date)
          return itemDate.getMonth() === selectedMonth && itemDate.getFullYear() === selectedYear
        })

        const mapped: MappedReconRow[] = filtered.map(row => ({
          id: row.id,
          tanggal: new Date(row.date),
          cabang: row.branchName,
          metode: row.paymentMethodName,
          omset: row.expectedAmount,
          mdr: row.mdrAmount,
          expected: row.expectedSettlement,
          actual: row.actualAmount,
          status: row.status
        }))

        setData(mapped.sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime()))
      } catch (err) {
        console.error('Failed to parse recons:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  /* ── Aggregated Stats ─────────────────────────────────────────────── */
  const stats = useMemo(() => {
    const totalOmset = data.reduce((s, r) => s + r.omset, 0)
    const totalExpected = data.reduce((s, r) => s + r.expected, 0)
    const totalActual = data.reduce((s, r) => s + r.actual, 0)
    const totalSelisih = totalActual - totalExpected
    const matched = data.filter((r) => r.status === 'matched').length
    const pending = data.filter((r) => r.status === 'pending').length
    const discrepancy = data.filter((r) => r.status === 'discrepancy').length

    return { totalOmset, totalExpected, totalActual, totalSelisih, matched, pending, discrepancy }
  }, [data])

  /* ── Table Columns ────────────────────────────────────────────────── */
  const columns: TableColumn<MappedReconRow>[] = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (val) => formatDate(val as Date),
    },
    { key: 'cabang', label: 'Cabang' },
    { key: 'metode', label: 'Metode Bayar' },
    {
      key: 'omset',
      label: 'Omset',
      render: (val) => formatCurrency(val as number),
    },
    {
      key: 'mdr',
      label: 'MDR',
      render: (val) => formatCurrency(val as number),
    },
    {
      key: 'expected',
      label: 'Expected',
      render: (val) => formatCurrency(val as number),
    },
    {
      key: 'actual',
      label: 'Actual',
      render: (val) => formatCurrency(val as number),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge status={val as string} />,
    },
  ]

  return (
    <div className="animate-fade-in">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Rekonsiliasi Bank</h1>
          <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-1)' }}>
            Pantau dan cocokkan data omset dengan mutasi bank
          </p>
        </div>
      </div>

      {/* ── Period Selector + Navigation ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6 animate-slide-up delay-1">
        <DatePicker
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onChange={({ month, year }) => {
            setSelectedMonth(month)
            setSelectedYear(year)
          }}
        />

        <div className="btn-group">
          <Link href="/reconciliation/input" className="btn btn-primary">
            <IconWallet />
            Input Omset
          </Link>
          <Link href="/reconciliation/mutations" className="btn btn-secondary">
            <IconBank />
            Input Mutasi Bank
          </Link>
          <Link href="/reconciliation/match" className="btn btn-secondary">
            <IconTarget />
            Cocokkan Data
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-12)' }}>
            <span className="spinner spinner-lg" />
            <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>Memuat data rekonsiliasi...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Summary Stat Cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-slide-up delay-2">
            <StatCard
              title="Total Omset Dilaporkan"
              value={formatCurrency(stats.totalOmset)}
              icon={<IconWallet />}
            />
            <StatCard
              title="Expected Settlement"
              value={formatCurrency(stats.totalExpected)}
              subtitle="Setelah potongan MDR"
              icon={<IconBank />}
            />
            <StatCard
              title="Actual Settlement"
              value={formatCurrency(stats.totalActual)}
              subtitle="Diterima di rekening bank"
              icon={<IconTarget />}
            />
            <StatCard
              title="Total Selisih"
              value={formatCurrency(stats.totalSelisih)}
              subtitle={stats.totalSelisih === 0 ? 'Seimbang' : stats.totalSelisih > 0 ? 'Kelebihan' : 'Kekurangan'}
              icon={<IconDelta />}
            />
          </div>

          {/* ── Status Count Badges ──────────────────────────────────────── */}
          <div className="card mb-6 animate-slide-up delay-3">
            <div className="card-body">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="badge badge-success">
                    <span className="badge-dot" />
                    Matched
                  </span>
                  <span className="font-semibold text-lg">{stats.matched}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-warning">
                    <span className="badge-dot" />
                    Pending
                  </span>
                  <span className="font-semibold text-lg">{stats.pending}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-danger">
                    <span className="badge-dot" />
                    Discrepancy
                  </span>
                  <span className="font-semibold text-lg">{stats.discrepancy}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Daily Reconciliation Table ───────────────────────────────── */}
          <div className="animate-slide-up delay-4">
            <div className="card-header" style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0', border: '1px solid var(--color-border)', borderBottom: 'none' }}>
              <h3>Ringkasan Rekonsiliasi Harian</h3>
            </div>
            <Table columns={columns} data={data} />
          </div>
        </>
      )}
    </div>
  )
}
