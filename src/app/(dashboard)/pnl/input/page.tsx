'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { formatCurrency, formatMonth } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useBranch } from '@/hooks/useBranch'
import { getPnlData, savePnlData } from '@/lib/pnl'
import type { PnlSaveValues } from '@/types'

const MONTHS = Array.from({ length: 12 }, (_, i) => ({
  value: i + 1,
  label: formatMonth(i + 1),
}))

const currentDate = new Date()

// ---------------------------------------------------------------------------
// SVG Icons
// ---------------------------------------------------------------------------
function SaveIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M14 16H4C3.44772 16 3 15.5523 3 15V3C3 2.44772 3.44772 2 4 2H11L15 6V15C15 15.5523 14.5523 16 14 16Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 2V6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 12H12M6 14H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M7 6V10M7 4.5V4.51" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Currency input helper — stores raw number, displays formatted
// ---------------------------------------------------------------------------
interface CurrencyInputProps {
  id: string
  label: string
  value: number
  onChange: (val: number) => void
  readOnly?: boolean
  source?: string
  helper?: string
}

function CurrencyInput({ id, label, value, onChange, readOnly, source, helper }: CurrencyInputProps) {
  const [focused, setFocused] = useState(false)

  const displayValue = focused
    ? String(value || '')
    : formatCurrency(Number(value) || 0)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^\d]/g, '')
    onChange(raw ? Number(raw) : 0)
  }

  return (
    <div className="input-group">
      <label className="input-label" htmlFor={id}>
        {label}
        {source && (
          <span className="badge badge-success" style={{ marginLeft: 8, fontSize: '10px', padding: '1px 6px', verticalAlign: 'middle' }}>
            {source}
          </span>
        )}
      </label>
      <div style={{ position: 'relative' }}>
        <span style={{
          position: 'absolute',
          left: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-text-tertiary)',
          fontSize: 'var(--text-sm)',
          pointerEvents: 'none',
        }}>
          Rp
        </span>
        <input
          id={id}
          type={focused ? 'number' : 'text'}
          className="input"
          style={{ paddingLeft: 40, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}
          value={focused ? (value === 0 ? '' : String(value || '')) : displayValue.replace('Rp ', '')}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          readOnly={readOnly}
          disabled={readOnly}
          aria-label={label}
        />
      </div>
      {helper && <span className="input-helper"><InfoIcon /> {helper}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section header component
// ---------------------------------------------------------------------------
interface SectionHeaderProps {
  title: string
  description?: string
}

function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div style={{ marginBottom: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
      <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-bold)', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-secondary)' }}>
        {title}
      </h3>
      {description && <p className="text-xs text-tertiary" style={{ marginTop: 2 }}>{description}</p>}
      <div className="divider" style={{ marginTop: 'var(--space-2)', marginBottom: 0 }} />
    </div>
  )
}

interface FormPnlState {
  omset: number
  pendapatanLainRevenue: number
  cogs: number
  kasKecil: number
  gajiKomisi: number
  sewaToko: number
  marketing: number
  penyusutan: number
  pendapatanLain: number
  bebanLain: number
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function PnlInputPage() {
  const { profile } = useAuth()
  const { branches } = useBranch(profile)

  const [month, setMonth] = useState(currentDate.getMonth() + 1)
  const [year, setYear] = useState(currentDate.getFullYear())
  const [branch, setBranch] = useState('')
  const [data, setData] = useState<FormPnlState | null>(null)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  // Initialize branch
  useEffect(() => {
    if (branches.length > 0 && !branch) {
      setBranch(branches[0].id)
    }
  }, [branches, branch])

  // Load P&L inputs
  useEffect(() => {
    if (!branch) return
    async function loadData() {
      setLoading(true)
      try {
        const pnlData = await getPnlData(month, year, branch)
        setData({
          omset: pnlData.revenue.omset,
          pendapatanLainRevenue: pnlData.revenue.pendapatanLainRevenue,
          cogs: pnlData.hpp.cogs,
          kasKecil: pnlData.opex.kasKecil,
          gajiKomisi: pnlData.opex.gajiKomisi,
          sewaToko: pnlData.opex.sewaToko,
          marketing: pnlData.opex.marketing,
          penyusutan: pnlData.opex.penyusutan,
          pendapatanLain: pnlData.other.pendapatanLain,
          bebanLain: pnlData.other.bebanLain,
        })
      } catch (err) {
        console.error('Error loading P&L inputs:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [month, year, branch])

  const updateField = useCallback((field: keyof FormPnlState, value: number) => {
    setData(prev => {
      if (!prev) return null
      return { ...prev, [field]: value }
    })
    setSaved(false)
  }, [])

  // Computed totals
  const totals = useMemo(() => {
    if (!data) return { totalRevenue: 0, totalHpp: 0, grossProfit: 0, totalOpex: 0, operatingProfit: 0, totalOther: 0, netProfit: 0 }
    const totalRevenue = (data.omset || 0) + (data.pendapatanLainRevenue || 0)
    const totalHpp = data.cogs || 0
    const grossProfit = totalRevenue - totalHpp
    const totalOpex =
      (data.kasKecil || 0) +
      (data.gajiKomisi || 0) +
      (data.sewaToko || 0) +
      (data.marketing || 0) +
      (data.penyusutan || 0)
    const operatingProfit = grossProfit - totalOpex
    const totalOther = (data.pendapatanLain || 0) - (data.bebanLain || 0)
    const netProfit = operatingProfit + totalOther

    return { totalRevenue, totalHpp, grossProfit, totalOpex, operatingProfit, totalOther, netProfit }
  }, [data])

  const handleSave = async () => {
    if (!branch || !data) return
    setLoading(true)
    try {
      // data implements the numeric fields that are expected in PnlSaveValues
      const saveValues: PnlSaveValues = {
        cogs: data.cogs,
        sewaToko: data.sewaToko,
        marketing: data.marketing,
        penyusutan: data.penyusutan,
        pendapatanLain: data.pendapatanLain,
        bebanLain: data.bebanLain,
        pendapatanLainRevenue: data.pendapatanLainRevenue
      }
      await savePnlData(month, year, branch, saveValues)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Error saving P&L inputs:', err)
    } finally {
      setLoading(false)
    }
  }

  const branchName = branches.find(b => String(b.id) === String(branch))?.name || ''
  const periodLabel = `${formatMonth(month)} ${year}`

  if (!branch || !data) {
    return (
      <div className="card" style={{ maxWidth: 720, margin: '2rem auto', textAlign: 'center', padding: '4rem' }}>
        <span className="spinner spinner-lg" />
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Memuat data formulir...</p>
      </div>
    )
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <a href="/pnl" className="btn btn-ghost btn-icon" aria-label="Kembali ke laporan">
            <BackIcon />
          </a>
          <div>
            <h1>Input Data P&L</h1>
            <p className="text-secondary text-sm" style={{ marginTop: 2 }}>
              {branchName} — {periodLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Period & Branch Selectors */}
      <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
        <div className="card-body" style={{ padding: 'var(--space-4) var(--space-6)' }}>
          <div className="flex flex-wrap gap-4">
            <div className="input-group" style={{ flex: '1 1 140px' }}>
              <label className="input-label" htmlFor="input-month">Bulan</label>
              <select id="input-month" className="select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ flex: '1 1 100px' }}>
              <label className="input-label" htmlFor="input-year">Tahun</label>
              <select id="input-year" className="select" value={year} onChange={e => setYear(Number(e.target.value))}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ flex: '1 1 180px' }}>
              <label className="input-label" htmlFor="input-branch">Cabang</label>
              <select id="input-branch" className="select" value={branch} onChange={e => setBranch(e.target.value)}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Form Sections */}
      <div className="card">
        <div className="card-body">
          {/* PENDAPATAN */}
          <SectionHeader title="Pendapatan" description="Omset otomatis diambil dari data penjualan harian jika ada" />
          <div className="form-row">
            <CurrencyInput
              id="omset"
              label="Omset Penjualan"
              value={data.omset}
              onChange={v => updateField('omset', v)}
              readOnly
              source="dari Penjualan Harian"
            />
            <CurrencyInput
              id="pendapatanLainRevenue"
              label="Pendapatan Lain (Revenue)"
              value={data.pendapatanLainRevenue}
              onChange={v => updateField('pendapatanLainRevenue', v)}
            />
          </div>
          <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
            <span className="font-semibold text-sm">Total Pendapatan</span>
            <span className="font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totals.totalRevenue)}</span>
          </div>

          {/* HPP */}
          <SectionHeader title="Harga Pokok Penjualan (HPP)" description="Input manual berdasarkan perhitungan stok" />
          <CurrencyInput
            id="cogs"
            label="HPP / COGS"
            value={data.cogs}
            onChange={v => updateField('cogs', v)}
            helper="Cost of Goods Sold — dihitung dari harga modal × qty terjual"
          />
          <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
            <span className="font-semibold text-sm">Total HPP</span>
            <span className="font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totals.totalHpp)}</span>
          </div>

          {/* LABA KOTOR live */}
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-success-light)',
            border: '1px solid var(--color-success-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span className="font-bold" style={{ color: 'var(--color-success-text)' }}>Laba Kotor</span>
            <span className="font-bold text-lg" style={{ color: 'var(--color-success-text)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totals.grossProfit)}
            </span>
          </div>

          {/* BEBAN OPERASIONAL */}
          <SectionHeader title="Beban Operasional" description="Beberapa beban otomatis diambil dari modul terkait" />
          <div className="flex flex-col gap-4">
            <CurrencyInput
              id="kasKecil"
              label="Biaya Operasional (Kas Kecil)"
              value={data.kasKecil}
              onChange={v => updateField('kasKecil', v)}
              readOnly
              source="dari Kas Kecil"
            />
            <CurrencyInput
              id="gajiKomisi"
              label="Gaji & Komisi Karyawan"
              value={data.gajiKomisi}
              onChange={v => updateField('gajiKomisi', v)}
              readOnly
              source="dari Payroll (Phase 3)"
            />
            <div className="form-row">
              <CurrencyInput
                id="sewaToko"
                label="Sewa Toko"
                value={data.sewaToko}
                onChange={v => updateField('sewaToko', v)}
              />
              <CurrencyInput
                id="marketing"
                label="Marketing / Iklan"
                value={data.marketing}
                onChange={v => updateField('marketing', v)}
              />
            </div>
            <CurrencyInput
              id="penyusutan"
              label="Penyusutan Aset"
              value={data.penyusutan}
              onChange={v => updateField('penyusutan', v)}
            />
          </div>
          <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
            <span className="font-semibold text-sm">Total Beban Operasional</span>
            <span className="font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totals.totalOpex)}</span>
          </div>

          {/* LABA OPERASIONAL live */}
          <div style={{
            marginTop: 'var(--space-4)',
            padding: 'var(--space-3) var(--space-4)',
            background: 'var(--color-info-light)',
            border: '1px solid var(--color-info-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span className="font-bold" style={{ color: 'var(--color-info-text)' }}>Laba Operasional</span>
            <span className="font-bold text-lg" style={{ color: 'var(--color-info-text)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(totals.operatingProfit)}
            </span>
          </div>

          {/* PENDAPATAN / BEBAN LAIN-LAIN */}
          <SectionHeader title="Pendapatan / Beban Lain-lain" />
          <div className="form-row">
            <CurrencyInput
              id="pendapatanLain"
              label="Pendapatan Lain-lain"
              value={data.pendapatanLain}
              onChange={v => updateField('pendapatanLain', v)}
            />
            <CurrencyInput
              id="bebanLain"
              label="Beban Lain-lain"
              value={data.bebanLain}
              onChange={v => updateField('bebanLain', v)}
            />
          </div>
          <div className="flex justify-between items-center" style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-3)', background: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' }}>
            <span className="font-semibold text-sm">Total Lain-lain</span>
            <span className="font-bold" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(totals.totalOther)}</span>
          </div>
        </div>

        {/* Footer with save */}
        <div className="card-footer">
          <a href="/pnl" className="btn btn-secondary">Batal</a>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            <SaveIcon />
            {loading ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </div>

      {/* Sticky Summary */}
      <div style={{
        position: 'sticky',
        bottom: 0,
        zIndex: 'var(--z-sticky)',
        marginTop: 'var(--space-4)',
        padding: 'var(--space-4)',
        background: 'linear-gradient(135deg, rgba(255,107,0,0.1), rgba(255,140,0,0.15))',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,107,0,0.2)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 'var(--space-4)',
        justifyContent: 'space-around',
      }}>
        <div style={{ textAlign: 'center', minWidth: 120 }}>
          <div className="text-xs text-secondary font-medium">Laba Kotor</div>
          <div className="font-bold" style={{ color: 'var(--color-success)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(totals.grossProfit)}
          </div>
        </div>
        <div className="divider-vertical hide-mobile" />
        <div style={{ textAlign: 'center', minWidth: 120 }}>
          <div className="text-xs text-secondary font-medium">Laba Operasional</div>
          <div className="font-bold" style={{ color: 'var(--color-info)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(totals.operatingProfit)}
          </div>
        </div>
        <div className="divider-vertical hide-mobile" />
        <div style={{ textAlign: 'center', minWidth: 140 }}>
          <div className="text-xs text-secondary font-medium">Laba Bersih</div>
          <div className="font-bold text-lg" style={{ color: 'var(--color-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {formatCurrency(totals.netProfit)}
          </div>
        </div>
      </div>

      {/* Success toast */}
      {saved && (
        <div className="toast-container">
          <div className="toast toast-success animate-slide-in">
            <svg className="toast-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
              <path d="M7 10L9 12L13 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="toast-content">
              <div className="toast-title">Berhasil Disimpan</div>
              <div className="toast-message">Data P&L {branchName} — {periodLabel} telah disimpan.</div>
            </div>
            <button className="toast-close" onClick={() => setSaved(false)} aria-label="Tutup notifikasi">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
