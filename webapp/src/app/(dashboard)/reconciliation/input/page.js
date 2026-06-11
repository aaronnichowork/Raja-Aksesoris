'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

/* ── SVG Icons ─────────────────────────────────────────────────────────── */

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function IconSave() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

/* ── Constants ─────────────────────────────────────────────────────────── */

const BRANCHES = [
  { id: 'pusat', name: 'Pusat - Jl. Raya Bogor' },
  { id: 'depok', name: 'Cabang Depok' },
  { id: 'bekasi', name: 'Cabang Bekasi' },
  { id: 'tangerang', name: 'Cabang Tangerang' },
  { id: 'cibubur', name: 'Cabang Cibubur' },
]

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Cash', mdrRate: 0 },
  { id: 'transfer', name: 'Transfer Bank', mdrRate: 0 },
  { id: 'qris', name: 'QRIS', mdrRate: 0.7 },
  { id: 'debit', name: 'Debit', mdrRate: 0.6 },
  { id: 'credit', name: 'Kartu Kredit', mdrRate: 2.2 },
  { id: 'shopee', name: 'Shopee', mdrRate: 3 },
  { id: 'tiktok', name: 'TikTok', mdrRate: 3 },
]

/* ── Component ─────────────────────────────────────────────────────────── */

export default function InputOmsetPage() {
  const today = new Date().toISOString().split('T')[0]
  const [selectedBranch, setSelectedBranch] = useState(BRANCHES[0].id)
  const [selectedDate, setSelectedDate] = useState(today)
  const [amounts, setAmounts] = useState(() => {
    const initial = {}
    PAYMENT_METHODS.forEach((pm) => {
      initial[pm.id] = ''
    })
    return initial
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  /* ── Amount Change Handler ──────────────────────────────────────── */
  const handleAmountChange = useCallback((methodId, rawValue) => {
    // Allow empty or valid numeric input
    const cleaned = rawValue.replace(/[^0-9]/g, '')
    setAmounts((prev) => ({ ...prev, [methodId]: cleaned }))
    setErrors((prev) => {
      const next = { ...prev }
      delete next[methodId]
      return next
    })
  }, [])

  /* ── Calculated values ──────────────────────────────────────────── */
  const rows = useMemo(() => {
    return PAYMENT_METHODS.map((pm) => {
      const amount = amounts[pm.id] === '' ? 0 : parseInt(amounts[pm.id], 10)
      const mdrAmount = Math.round((amount * pm.mdrRate) / 100)
      const netAmount = amount - mdrAmount
      return { ...pm, amount, mdrAmount, netAmount }
    })
  }, [amounts])

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => ({
        amount: acc.amount + r.amount,
        mdrAmount: acc.mdrAmount + r.mdrAmount,
        netAmount: acc.netAmount + r.netAmount,
      }),
      { amount: 0, mdrAmount: 0, netAmount: 0 }
    )
  }, [rows])

  /* ── Validation & Save ──────────────────────────────────────────── */
  const handleSave = useCallback(() => {
    const newErrors = {}

    PAYMENT_METHODS.forEach((pm) => {
      const raw = amounts[pm.id]
      if (raw !== '' && (isNaN(parseInt(raw, 10)) || parseInt(raw, 10) < 0)) {
        newErrors[pm.id] = 'Jumlah harus >= 0'
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSaving(true)

    // Simulate save
    const branchName = BRANCHES.find((b) => b.id === selectedBranch)?.name
    console.log('✅ Data omset disimpan:', {
      cabang: branchName,
      tanggal: selectedDate,
      items: rows.filter((r) => r.amount > 0).map((r) => ({
        metode: r.name,
        omset: r.amount,
        mdr: r.mdrAmount,
        net: r.netAmount,
      })),
      totalOmset: totals.amount,
      totalMDR: totals.mdrAmount,
      totalNet: totals.netAmount,
    })

    setTimeout(() => {
      setSaving(false)
      alert('Data omset berhasil disimpan!')
    }, 600)
  }, [amounts, selectedBranch, selectedDate, rows, totals])

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
      <div className="page-header">
        <div>
          <h1>Input Omset Harian</h1>
          <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-1)' }}>
            Masukkan data penjualan harian per cabang dan metode pembayaran
          </p>
        </div>
      </div>

      {/* ── Branch & Date Selection ──────────────────────────────────── */}
      <div className="card mb-6 animate-slide-up delay-1">
        <div className="card-body">
          <div className="form-row">
            <div className="input-group">
              <label className="input-label" htmlFor="branch-select">
                Cabang <span className="required" aria-hidden="true">*</span>
              </label>
              <select
                id="branch-select"
                className="select"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                aria-label="Pilih cabang"
              >
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="date-input">
                Tanggal <span className="required" aria-hidden="true">*</span>
              </label>
              <input
                id="date-input"
                type="date"
                className="input"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                aria-label="Pilih tanggal"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment Methods Table ────────────────────────────────────── */}
      <div className="card animate-slide-up delay-2">
        <div className="card-header">
          <h3>Data Penjualan per Metode Pembayaran</h3>
        </div>
        <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>Metode Pembayaran</th>
                <th>Jumlah (Rp)</th>
                <th>MDR Rate</th>
                <th>MDR (Rp)</th>
                <th>Net (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <span className="font-medium">{row.name}</span>
                  </td>
                  <td>
                    <div className="input-group" style={{ maxWidth: '220px', margin: 0 }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        className={`input ${errors[row.id] ? 'input-error-state' : ''}`}
                        placeholder="0"
                        value={amounts[row.id]}
                        onChange={(e) => handleAmountChange(row.id, e.target.value)}
                        aria-label={`Jumlah ${row.name}`}
                        style={{ minHeight: '40px' }}
                      />
                      {errors[row.id] && (
                        <p className="input-error" role="alert">{errors[row.id]}</p>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="text-secondary">{row.mdrRate}%</span>
                  </td>
                  <td>
                    <span className="text-secondary">{formatCurrency(row.mdrAmount)}</span>
                  </td>
                  <td>
                    <span className="font-semibold">{formatCurrency(row.netAmount)}</span>
                  </td>
                </tr>
              ))}

              {/* ── Total Row ──────────────────────────────────────────── */}
              <tr style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                <td>
                  <span className="font-bold">TOTAL</span>
                </td>
                <td>
                  <span className="font-bold">{formatCurrency(totals.amount)}</span>
                </td>
                <td />
                <td>
                  <span className="font-bold text-danger">{formatCurrency(totals.mdrAmount)}</span>
                </td>
                <td>
                  <span className="font-bold text-primary">{formatCurrency(totals.netAmount)}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Save Actions ───────────────────────────────────────────── */}
        <div className="card-footer">
          <Link href="/reconciliation" className="btn btn-secondary">
            Batal
          </Link>
          <button
            type="button"
            className={`btn btn-primary ${saving ? 'btn-loading' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            <IconSave />
            Simpan Data Omset
          </button>
        </div>
      </div>
    </div>
  )
}
