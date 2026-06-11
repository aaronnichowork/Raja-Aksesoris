'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { formatCurrency, formatMonth } from '@/lib/utils'
import { getPnlData } from '@/lib/pnl'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/hooks/useBranch'

function calcTotals(data) {
  const totalRevenue = (data.revenue.omset || 0) + (data.revenue.pendapatanLainRevenue || 0)
  const totalHpp = data.hpp.cogs || 0
  const grossProfit = totalRevenue - totalHpp
  const totalOpex =
    (data.opex.kasKecil || 0) +
    (data.opex.gajiKomisi || 0) +
    (data.opex.sewaToko || 0) +
    (data.opex.marketing || 0) +
    (data.opex.penyusutan || 0)
  const operatingProfit = grossProfit - totalOpex
  const totalOther = (data.other.pendapatanLain || 0) - (data.other.bebanLain || 0)
  const netProfit = operatingProfit + totalOther
  const grossMargin = totalRevenue ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0.0'
  const netMargin = totalRevenue ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0.0'

  return {
    totalRevenue,
    totalHpp,
    grossProfit,
    totalOpex,
    operatingProfit,
    totalOther,
    netProfit,
    grossMargin,
    netMargin,
  }
}

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: formatMonth(i + 1),
}))

const currentDate = new Date()

// ---------------------------------------------------------------------------
// SVG Icons (no emoji)
// ---------------------------------------------------------------------------
function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 7H16" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6 1V4M12 1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function BranchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2 15V6L5 3L8 6V15M8 15V8L11 5.5L14 8V15M14 15V10L16 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 15H16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function CompareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2V16M3 6H7M11 6H15M3 10H7M11 10H15M3 14H7M11 14H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function PrintIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M5 6V2H13V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="2" y="6" width="14" height="8" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 11H13V16H5V11Z" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M9 2V12M9 12L5 8M9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 13V15C2 15.5523 2.44772 16 3 16H15C15.5523 16 16 15.5523 16 15V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function AutoBadge() {
  return <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 8px' }}>Otomatis</span>
}

function ManualBadge() {
  return <span className="badge" style={{ fontSize: '10px', padding: '1px 8px' }}>Manual</span>
}

function DeltaCell({ current, previous }) {
  const diff = (current || 0) - (previous || 0)
  const pct = previous !== 0 && previous !== undefined ? ((diff / Math.abs(previous)) * 100).toFixed(1) : '—'
  const isPositive = diff >= 0

  return (
    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
      <span style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: 600 }}>
        {isPositive ? '+' : ''}{formatCurrency(diff)}
      </span>
      <br />
      <span className="text-xs text-tertiary">
        {pct !== '—' ? `${isPositive ? '+' : ''}${pct}%` : '—'}
      </span>
    </td>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PnlReportPage() {
  const { profile } = useAuth()
  const { branches } = useBranch(profile)

  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [year, setYear] = useState(currentDate.getFullYear())
  const [branch, setBranch] = useState('all')
  const [multiPeriod, setMultiPeriod] = useState(false)

  const [currentData, setCurrentData] = useState(null)
  const [prevData, setPrevData] = useState(null)
  const [loading, setLoading] = useState(true)

  // Map branches list dynamically
  const branchOptions = useMemo(() => {
    return [
      { id: 'all', name: 'Semua Cabang (Konsolidasi)' },
      ...branches.map(b => ({ id: b.id, name: b.name }))
    ]
  }, [branches])

  // Load P&L data
  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const curr = await getPnlData(month, year, branch)
        setCurrentData(curr)

        const prevMonth = month === 1 ? 12 : month - 1
        const prevYear = month === 1 ? year - 1 : year
        const prev = await getPnlData(prevMonth, prevYear, branch)
        setPrevData(prev)
      } catch (err) {
        console.error('Error loading P&L data:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [month, year, branch, branches])

  const current = useMemo(() => {
    if (!currentData) return null
    return calcTotals(currentData)
  }, [currentData])

  const prev = useMemo(() => {
    if (!prevData) return null
    return calcTotals(prevData)
  }, [prevData])

  const branchName = branchOptions.find(b => String(b.id) === String(branch))?.name || ''
  const periodLabel = `${formatMonth(month)} ${year}`
  
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const prevPeriodLabel = `${formatMonth(prevMonth)} ${prevYear}`

  if (loading || !current || !prev) {
    return (
      <div className="card" style={{ maxWidth: 960, margin: '2rem auto', textAlign: 'center', padding: '4rem' }}>
        <span className="spinner spinner-lg" />
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Memuat Laporan Laba Rugi...</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Laporan Laba Rugi</h1>
          <p className="text-secondary text-sm" style={{ marginTop: 4 }}>
            Profit & Loss Statement — {branchName}
          </p>
        </div>
        <div className="btn-group no-print">
          <button className="btn btn-secondary btn-sm" onClick={() => window.print()} aria-label="Cetak laporan">
            <PrintIcon /> Cetak
          </button>
          <button className="btn btn-secondary btn-sm" aria-label="Unduh PDF">
            <DownloadIcon /> Unduh PDF
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="card no-print" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-body" style={{ padding: 'var(--space-4) var(--space-6)' }}>
          <div className="flex flex-wrap items-center gap-4">
            {/* Month */}
            <div className="input-group" style={{ minWidth: 140 }}>
              <label className="input-label" htmlFor="pnl-month">
                <CalendarIcon /> Bulan
              </label>
              <select
                id="pnl-month"
                className="select"
                value={month}
                onChange={e => setMonth(Number(e.target.value))}
              >
                {MONTHS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Year */}
            <div className="input-group" style={{ minWidth: 100 }}>
              <label className="input-label" htmlFor="pnl-year">Tahun</label>
              <select
                id="pnl-year"
                className="select"
                value={year}
                onChange={e => setYear(Number(e.target.value))}
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Branch */}
            <div className="input-group" style={{ minWidth: 200 }}>
              <label className="input-label" htmlFor="pnl-branch">
                <BranchIcon /> Cabang
              </label>
              <select
                id="pnl-branch"
                className="select"
                value={branch}
                onChange={e => setBranch(e.target.value)}
              >
                {branchOptions.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            {/* Multi-period toggle */}
            <div className="input-group" style={{ minWidth: 140, alignSelf: 'flex-end' }}>
              <label className="checkbox" style={{ minHeight: 44, gap: 'var(--space-2)' }}>
                <input
                  type="checkbox"
                  checked={multiPeriod}
                  onChange={e => setMultiPeriod(e.target.checked)}
                />
                <CompareIcon />
                <span className="text-sm">Bandingkan</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Margin Badges */}
      <div className="flex flex-wrap gap-3" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="stat-card" style={{ flex: '1 1 180px', padding: 'var(--space-3) var(--space-4)' }}>
          <span className="text-xs text-secondary font-medium">Gross Margin</span>
          <span className="text-xl font-bold" style={{ color: 'var(--color-success)' }}>
            {current.grossMargin}%
          </span>
        </div>
        <div className="stat-card" style={{ flex: '1 1 180px', padding: 'var(--space-3) var(--space-4)' }}>
          <span className="text-xs text-secondary font-medium">Net Margin</span>
          <span className="text-xl font-bold text-primary">
            {current.netMargin}%
          </span>
        </div>
        <div className="stat-card" style={{ flex: '1 1 180px', padding: 'var(--space-3) var(--space-4)' }}>
          <span className="text-xs text-secondary font-medium">Total Pendapatan</span>
          <span className="text-xl font-bold">{formatCurrency(current.totalRevenue)}</span>
        </div>
        <div className="stat-card" style={{ flex: '1 1 180px', padding: 'var(--space-3) var(--space-4)' }}>
          <span className="text-xs text-secondary font-medium">Laba Bersih</span>
          <span className="text-xl font-bold text-primary">{formatCurrency(current.netProfit)}</span>
        </div>
      </div>

      {/* P&L Statement Table */}
      <div className="card">
        <div className="card-header">
          <h3>Laporan Laba Rugi</h3>
          <span className="badge badge-primary">{periodLabel}</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: multiPeriod ? 700 : 500 }}>
            <thead>
              <tr>
                <th style={{ width: '45%' }}>Keterangan</th>
                <th style={{ textAlign: 'right' }}>{periodLabel}</th>
                {multiPeriod && <th style={{ textAlign: 'right' }}>{prevPeriodLabel}</th>}
                {multiPeriod && <th style={{ textAlign: 'right' }}>Selisih</th>}
                <th style={{ width: 80, textAlign: 'center' }}>Sumber</th>
              </tr>
            </thead>
            <tbody>
              {/* PENDAPATAN */}
              <tr style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                <td colSpan={multiPeriod ? 5 : 3} className="font-bold text-xs" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Pendapatan
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-8)' }}>Omset Penjualan</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(currentData.revenue.omset)}</td>
                {multiPeriod && <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prevData.revenue.omset)}</td>}
                {multiPeriod && <DeltaCell current={currentData.revenue.omset} previous={prevData.revenue.omset} />}
                <td style={{ textAlign: 'center' }}><AutoBadge /></td>
              </tr>
              {currentData.revenue.pendapatanLainRevenue > 0 && (
                <tr>
                  <td style={{ paddingLeft: 'var(--space-8)' }}>Pendapatan Lain (Revenue)</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(currentData.revenue.pendapatanLainRevenue)}</td>
                  {multiPeriod && <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prevData.revenue.pendapatanLainRevenue)}</td>}
                  {multiPeriod && <DeltaCell current={currentData.revenue.pendapatanLainRevenue} previous={prevData.revenue.pendapatanLainRevenue} />}
                  <td style={{ textAlign: 'center' }}><ManualBadge /></td>
                </tr>
              )}
              <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                <td className="font-semibold">Total Pendapatan</td>
                <td className="font-semibold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(current.totalRevenue)}</td>
                {multiPeriod && <td className="font-semibold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prev.totalRevenue)}</td>}
                {multiPeriod && <DeltaCell current={current.totalRevenue} previous={prev.totalRevenue} />}
                <td></td>
              </tr>

              {/* Spacer */}
              <tr><td colSpan={multiPeriod ? 5 : 3} style={{ height: 8, padding: 0, borderBottom: 'none' }}></td></tr>

              {/* HPP */}
              <tr style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                <td colSpan={multiPeriod ? 5 : 3} className="font-bold text-xs" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Harga Pokok Penjualan
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-8)' }}>HPP / COGS</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(currentData.hpp.cogs)}</td>
                {multiPeriod && <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prevData.hpp.cogs)}</td>}
                {multiPeriod && <DeltaCell current={currentData.hpp.cogs} previous={prevData.hpp.cogs} />}
                <td style={{ textAlign: 'center' }}><ManualBadge /></td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                <td className="font-semibold">Total HPP</td>
                <td className="font-semibold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(current.totalHpp)}</td>
                {multiPeriod && <td className="font-semibold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prev.totalHpp)}</td>}
                {multiPeriod && <DeltaCell current={current.totalHpp} previous={prev.totalHpp} />}
                <td></td>
              </tr>

              {/* LABA KOTOR */}
              <tr style={{ backgroundColor: 'var(--color-success-light)', borderTop: '2px solid var(--color-success-border)' }}>
                <td className="font-bold" style={{ fontSize: 'var(--text-base)' }}>Laba Kotor</td>
                <td className="font-bold" style={{ textAlign: 'right', fontSize: 'var(--text-base)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(current.grossProfit)}
                </td>
                {multiPeriod && <td className="font-bold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prev.grossProfit)}</td>}
                {multiPeriod && <DeltaCell current={current.grossProfit} previous={prev.grossProfit} />}
                <td style={{ textAlign: 'center' }}>
                  <span className="badge badge-success" style={{ fontSize: '10px', padding: '1px 8px' }}>
                    {current.grossMargin}%
                  </span>
                </td>
              </tr>

              {/* Spacer */}
              <tr><td colSpan={multiPeriod ? 5 : 3} style={{ height: 8, padding: 0, borderBottom: 'none' }}></td></tr>

              {/* BEBAN OPERASIONAL */}
              <tr style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                <td colSpan={multiPeriod ? 5 : 3} className="font-bold text-xs" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Beban Operasional
                </td>
              </tr>
              {[
                { label: 'Biaya Operasional (Kas Kecil)', key: 'kasKecil', auto: true },
                { label: 'Gaji & Komisi Karyawan', key: 'gajiKomisi', auto: true },
                { label: 'Sewa Toko', key: 'sewaToko', auto: false },
                { label: 'Marketing / Iklan', key: 'marketing', auto: false },
                { label: 'Penyusutan Aset', key: 'penyusutan', auto: false },
              ].map(item => (
                <tr key={item.key}>
                  <td style={{ paddingLeft: 'var(--space-8)' }}>{item.label}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(currentData.opex[item.key])}</td>
                  {multiPeriod && <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prevData.opex[item.key])}</td>}
                  {multiPeriod && <DeltaCell current={currentData.opex[item.key]} previous={prevData.opex[item.key]} />}
                  <td style={{ textAlign: 'center' }}>{item.auto ? <AutoBadge /> : <ManualBadge />}</td>
                </tr>
              ))}
              <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                <td className="font-semibold">Total Beban Operasional</td>
                <td className="font-semibold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(current.totalOpex)}</td>
                {multiPeriod && <td className="font-semibold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prev.totalOpex)}</td>}
                {multiPeriod && <DeltaCell current={current.totalOpex} previous={prev.totalOpex} />}
                <td></td>
              </tr>

              {/* LABA OPERASIONAL */}
              <tr style={{ backgroundColor: 'var(--color-info-light)', borderTop: '2px solid var(--color-info-border)' }}>
                <td className="font-bold" style={{ fontSize: 'var(--text-base)' }}>Laba Operasional</td>
                <td className="font-bold" style={{ textAlign: 'right', fontSize: 'var(--text-base)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatCurrency(current.operatingProfit)}
                </td>
                {multiPeriod && <td className="font-bold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prev.operatingProfit)}</td>}
                {multiPeriod && <DeltaCell current={current.operatingProfit} previous={prev.operatingProfit} />}
                <td></td>
              </tr>

              {/* Spacer */}
              <tr><td colSpan={multiPeriod ? 5 : 3} style={{ height: 8, padding: 0, borderBottom: 'none' }}></td></tr>

              {/* PENDAPATAN / BEBAN LAIN-LAIN */}
              <tr style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                <td colSpan={multiPeriod ? 5 : 3} className="font-bold text-xs" style={{ letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                  Pendapatan / Beban Lain-lain
                </td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-8)' }}>Pendapatan Lain-lain</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(currentData.other.pendapatanLain)}</td>
                {multiPeriod && <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prevData.other.pendapatanLain)}</td>}
                {multiPeriod && <DeltaCell current={currentData.other.pendapatanLain} previous={prevData.other.pendapatanLain} />}
                <td style={{ textAlign: 'center' }}><ManualBadge /></td>
              </tr>
              <tr>
                <td style={{ paddingLeft: 'var(--space-8)' }}>Beban Lain-lain</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-danger)' }}>({formatCurrency(currentData.other.bebanLain)})</td>
                {multiPeriod && <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--color-danger)' }}>({formatCurrency(prevData.other.bebanLain)})</td>}
                {multiPeriod && <DeltaCell current={currentData.other.bebanLain} previous={prevData.other.bebanLain} />}
                <td style={{ textAlign: 'center' }}><ManualBadge /></td>
              </tr>
              <tr style={{ borderTop: '2px solid var(--color-border)' }}>
                <td className="font-semibold">Total Lain-lain</td>
                <td className="font-semibold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(current.totalOther)}</td>
                {multiPeriod && <td className="font-semibold" style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(prev.totalOther)}</td>}
                {multiPeriod && <DeltaCell current={current.totalOther} previous={prev.totalOther} />}
                <td></td>
              </tr>

              {/* Spacer */}
              <tr><td colSpan={multiPeriod ? 5 : 3} style={{ height: 8, padding: 0, borderBottom: 'none' }}></td></tr>

              {/* LABA BERSIH */}
              <tr style={{
                background: 'linear-gradient(135deg, rgba(255,107,0,0.08), rgba(255,140,0,0.12))',
                borderTop: '3px solid var(--color-primary)',
              }}>
                <td className="font-bold" style={{ fontSize: 'var(--text-lg)' }}>
                  Laba Bersih
                </td>
                <td className="font-bold" style={{
                  textAlign: 'right',
                  fontSize: 'var(--text-lg)',
                  color: 'var(--color-primary)',
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatCurrency(current.netProfit)}
                </td>
                {multiPeriod && (
                  <td className="font-bold" style={{
                    textAlign: 'right',
                    fontSize: 'var(--text-base)',
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {formatCurrency(prev.netProfit)}
                  </td>
                )}
                {multiPeriod && <DeltaCell current={current.netProfit} previous={prev.netProfit} />}
                <td style={{ textAlign: 'center' }}>
                  <span className="badge badge-primary" style={{ fontSize: '10px', padding: '1px 8px' }}>
                    {current.netMargin}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card-footer no-print">
          <a href="/pnl/input" className="btn btn-primary btn-sm">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M12.5 2.5L13.5 3.5L7 10L5 10.5L5.5 8.5L12.5 2.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Input / Edit Data P&L
          </a>
        </div>
      </div>
    </div>
  )
}
