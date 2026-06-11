'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui'

/* ── SVG Icons ─────────────────────────────────────────────────────────── */

function IconArrowLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

function IconZap() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function IconX() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function IconLink() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

/* ── Demo Data ─────────────────────────────────────────────────────────── */

const DEMO_SALES = [
  { id: 's1', date: new Date(2026, 5, 2), amount: 2450000, branch: 'Pusat', method: 'QRIS', mdr: 17150, net: 2432850 },
  { id: 's2', date: new Date(2026, 5, 2), amount: 1800000, branch: 'Cabang Depok', method: 'Debit', mdr: 10800, net: 1789200 },
  { id: 's3', date: new Date(2026, 5, 3), amount: 3200000, branch: 'Cabang Bekasi', method: 'Kartu Kredit', mdr: 70400, net: 3129600 },
  { id: 's4', date: new Date(2026, 5, 3), amount: 950000, branch: 'Pusat', method: 'Transfer', mdr: 0, net: 950000 },
  { id: 's5', date: new Date(2026, 5, 4), amount: 4100000, branch: 'Cabang Tangerang', method: 'Shopee', mdr: 123000, net: 3977000 },
  { id: 's6', date: new Date(2026, 5, 5), amount: 1500000, branch: 'Cabang Cibubur', method: 'QRIS', mdr: 10500, net: 1489500 },
  { id: 's7', date: new Date(2026, 5, 6), amount: 2750000, branch: 'Pusat', method: 'Debit', mdr: 16500, net: 2733500 },
  { id: 's8', date: new Date(2026, 5, 7), amount: 680000, branch: 'Cabang Depok', method: 'QRIS', mdr: 4760, net: 675240 },
]

const DEMO_MUTATIONS = [
  { id: 'm1', date: new Date(2026, 5, 2), amount: 2432850, description: 'Settlement QRIS - BCA', ref: 'REF2026060201' },
  { id: 'm2', date: new Date(2026, 5, 2), amount: 1789200, description: 'Settlement EDC Debit - BRI', ref: 'REF2026060202' },
  { id: 'm3', date: new Date(2026, 5, 3), amount: 3125000, description: 'Settlement Kartu Kredit - Mandiri', ref: 'REF2026060301' },
  { id: 'm4', date: new Date(2026, 5, 3), amount: 950000, description: 'Transfer Masuk - Customer', ref: 'REF2026060302' },
  { id: 'm5', date: new Date(2026, 5, 4), amount: 3977000, description: 'Transfer Masuk - Tokopedia', ref: 'REF2026060401' },
  { id: 'm6', date: new Date(2026, 5, 5), amount: 1489500, description: 'Settlement QRIS - Mandiri', ref: 'REF2026060501' },
  { id: 'm7', date: new Date(2026, 5, 6), amount: 2740000, description: 'Settlement EDC Debit - BCA', ref: 'REF2026060601' },
  { id: 'm8', date: new Date(2026, 5, 8), amount: 500000, description: 'Transfer Masuk - Unknown', ref: 'REF2026060801' },
]

/* ── Page Component ───────────────────────────────────────────────────── */

export default function MatchPage() {
  const [unmatchedSales, setUnmatchedSales] = useState(DEMO_SALES)
  const [unmatchedMutations, setUnmatchedMutations] = useState(DEMO_MUTATIONS)
  const [matches, setMatches] = useState([]) // { id, sale, mutation, status: 'proposed' | 'approved' }
  const [selectedSale, setSelectedSale] = useState(null)
  const [selectedMutation, setSelectedMutation] = useState(null)

  /* ── Stats ──────────────────────────────────────────────────────── */
  const stats = useMemo(() => ({
    unmatchedSales: unmatchedSales.length,
    unmatchedMutations: unmatchedMutations.length,
    totalMatched: matches.length,
    approved: matches.filter((m) => m.status === 'approved').length,
  }), [unmatchedSales, unmatchedMutations, matches])

  /* ── Auto Match Logic (1% tolerance) ────────────────────────────── */
  const handleAutoMatch = useCallback(() => {
    const remainingSales = [...unmatchedSales]
    const remainingMutations = [...unmatchedMutations]
    const newMatches = []
    let matchId = matches.length

    for (let si = remainingSales.length - 1; si >= 0; si--) {
      const sale = remainingSales[si]

      for (let mi = remainingMutations.length - 1; mi >= 0; mi--) {
        const mutation = remainingMutations[mi]
        const tolerance = sale.net * 0.01
        const diff = Math.abs(sale.net - mutation.amount)

        if (diff <= tolerance) {
          matchId++
          newMatches.push({
            id: `match-${matchId}`,
            sale,
            mutation,
            diff: mutation.amount - sale.net,
            status: 'proposed',
          })
          remainingSales.splice(si, 1)
          remainingMutations.splice(mi, 1)
          break
        }
      }
    }

    if (newMatches.length === 0) {
      alert('Tidak ditemukan kecocokan otomatis dalam toleransi 1%')
      return
    }

    setUnmatchedSales(remainingSales)
    setUnmatchedMutations(remainingMutations)
    setMatches((prev) => [...prev, ...newMatches])
    setSelectedSale(null)
    setSelectedMutation(null)

    console.log(`✅ Auto-match menemukan ${newMatches.length} kecocokan`)
  }, [unmatchedSales, unmatchedMutations, matches.length])

  /* ── Manual Match ───────────────────────────────────────────────── */
  const handleManualMatch = useCallback(() => {
    if (!selectedSale || !selectedMutation) return

    const sale = unmatchedSales.find((s) => s.id === selectedSale)
    const mutation = unmatchedMutations.find((m) => m.id === selectedMutation)

    if (!sale || !mutation) return

    const newMatch = {
      id: `match-manual-${Date.now()}`,
      sale,
      mutation,
      diff: mutation.amount - sale.net,
      status: 'proposed',
    }

    setMatches((prev) => [...prev, newMatch])
    setUnmatchedSales((prev) => prev.filter((s) => s.id !== selectedSale))
    setUnmatchedMutations((prev) => prev.filter((m) => m.id !== selectedMutation))
    setSelectedSale(null)
    setSelectedMutation(null)

    console.log('✅ Manual match dibuat:', newMatch)
  }, [selectedSale, selectedMutation, unmatchedSales, unmatchedMutations])

  /* ── Approve / Reject ───────────────────────────────────────────── */
  const handleApprove = useCallback((matchId) => {
    setMatches((prev) =>
      prev.map((m) => (m.id === matchId ? { ...m, status: 'approved' } : m))
    )
  }, [])

  const handleReject = useCallback((matchId) => {
    const match = matches.find((m) => m.id === matchId)
    if (!match) return

    setUnmatchedSales((prev) => [...prev, match.sale])
    setUnmatchedMutations((prev) => [...prev, match.mutation])
    setMatches((prev) => prev.filter((m) => m.id !== matchId))
  }, [matches])

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
          <h1>Cocokkan Data</h1>
          <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-1)' }}>
            Cocokkan data penjualan dengan mutasi bank secara otomatis atau manual
          </p>
        </div>
        <div className="btn-group">
          {selectedSale && selectedMutation && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleManualMatch}
            >
              <IconLink />
              Pasangkan Manual
            </button>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAutoMatch}
            disabled={unmatchedSales.length === 0 || unmatchedMutations.length === 0}
          >
            <IconZap />
            Auto Match
          </button>
        </div>
      </div>

      {/* ── Summary Stats ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-slide-up delay-1">
        <div className="stat-card">
          <span className="stat-card-label">Penjualan Belum Cocok</span>
          <span className="stat-card-value">{stats.unmatchedSales}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Mutasi Belum Cocok</span>
          <span className="stat-card-value">{stats.unmatchedMutations}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Total Dipasangkan</span>
          <span className="stat-card-value">{stats.totalMatched}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Disetujui</span>
          <span className="stat-card-value" style={{ color: 'var(--color-success)' }}>{stats.approved}</span>
        </div>
      </div>

      {/* ── Selection hint ───────────────────────────────────────────── */}
      {(selectedSale || selectedMutation) && (
        <div className="card mb-4 animate-scale-in" style={{ borderColor: 'var(--color-primary)', borderWidth: '2px' }}>
          <div className="card-body">
            <div className="flex items-center gap-3 flex-wrap">
              <IconLink />
              <span className="text-sm font-medium">
                {selectedSale && !selectedMutation && 'Pilih satu mutasi bank di sisi kanan untuk membuat pasangan'}
                {!selectedSale && selectedMutation && 'Pilih satu data penjualan di sisi kiri untuk membuat pasangan'}
                {selectedSale && selectedMutation && 'Klik "Pasangkan Manual" untuk mencocokkan kedua item ini'}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm ml-auto"
                onClick={() => { setSelectedSale(null); setSelectedMutation(null) }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Split View ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-slide-up delay-2">
        {/* Left: Unmatched Sales */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 'var(--text-base)' }}>
              Penjualan Belum Cocok
              <span className="badge badge-count" style={{ marginLeft: 'var(--space-2)' }}>
                {unmatchedSales.length}
              </span>
            </h3>
          </div>
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {unmatchedSales.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
                <p className="text-sm text-secondary">Semua penjualan sudah dicocokkan</p>
              </div>
            ) : (
              unmatchedSales.map((sale) => (
                <button
                  key={sale.id}
                  type="button"
                  className="w-full"
                  onClick={() => setSelectedSale(selectedSale === sale.id ? null : sale.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--color-border-light)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 150ms ease',
                    backgroundColor: selectedSale === sale.id ? 'var(--color-primary-light)' : 'transparent',
                    borderLeft: selectedSale === sale.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                    minHeight: '44px',
                  }}
                  aria-pressed={selectedSale === sale.id}
                  aria-label={`Pilih penjualan ${sale.branch} ${formatCurrency(sale.net)}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">{formatCurrency(sale.net)}</span>
                    <span className="text-xs text-tertiary">{formatDate(sale.date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-secondary">{sale.branch}</span>
                    <span className="text-xs text-tertiary">•</span>
                    <span className="text-xs text-secondary">{sale.method}</span>
                  </div>
                  <span className="text-xs text-tertiary">
                    Omset: {formatCurrency(sale.amount)} | MDR: {formatCurrency(sale.mdr)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Unmatched Mutations */}
        <div className="card">
          <div className="card-header">
            <h3 style={{ fontSize: 'var(--text-base)' }}>
              Mutasi Bank Belum Cocok
              <span className="badge badge-count" style={{ marginLeft: 'var(--space-2)' }}>
                {unmatchedMutations.length}
              </span>
            </h3>
          </div>
          <div style={{ maxHeight: '480px', overflowY: 'auto' }}>
            {unmatchedMutations.length === 0 ? (
              <div className="empty-state" style={{ padding: 'var(--space-8) var(--space-4)' }}>
                <p className="text-sm text-secondary">Semua mutasi sudah dicocokkan</p>
              </div>
            ) : (
              unmatchedMutations.map((mutation) => (
                <button
                  key={mutation.id}
                  type="button"
                  className="w-full"
                  onClick={() => setSelectedMutation(selectedMutation === mutation.id ? null : mutation.id)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-1)',
                    padding: 'var(--space-3) var(--space-4)',
                    borderBottom: '1px solid var(--color-border-light)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 150ms ease',
                    backgroundColor: selectedMutation === mutation.id ? 'var(--color-primary-light)' : 'transparent',
                    borderLeft: selectedMutation === mutation.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                    minHeight: '44px',
                  }}
                  aria-pressed={selectedMutation === mutation.id}
                  aria-label={`Pilih mutasi ${mutation.description} ${formatCurrency(mutation.amount)}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="font-semibold text-sm">{formatCurrency(mutation.amount)}</span>
                    <span className="text-xs text-tertiary">{formatDate(mutation.date)}</span>
                  </div>
                  <span className="text-xs text-secondary">{mutation.description}</span>
                  <span className="text-xs text-tertiary">Ref: {mutation.ref}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Matched Pairs ────────────────────────────────────────────── */}
      {matches.length > 0 && (
        <div className="animate-slide-up delay-3">
          <div className="card">
            <div className="card-header">
              <h3>Hasil Pencocokan</h3>
            </div>
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Penjualan</th>
                    <th>Net Amount</th>
                    <th style={{ textAlign: 'center' }}>Selisih</th>
                    <th>Mutasi Bank</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match.id} style={{
                      backgroundColor: match.status === 'approved'
                        ? 'var(--color-success-light)'
                        : undefined,
                    }}>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{match.sale.branch}</span>
                          <span className="text-xs text-tertiary">{formatDate(match.sale.date)} • {match.sale.method}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-semibold">{formatCurrency(match.sale.net)}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {match.diff === 0 ? (
                          <Badge variant="success">Exact</Badge>
                        ) : (
                          <span className="text-xs font-semibold" style={{ color: Math.abs(match.diff) < match.sale.net * 0.005 ? 'var(--color-warning)' : 'var(--color-danger)' }}>
                            {formatCurrency(match.diff)}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{match.mutation.description}</span>
                          <span className="text-xs text-tertiary">{formatDate(match.mutation.date)} • {match.mutation.ref}</span>
                        </div>
                      </td>
                      <td>
                        <span className="font-semibold">{formatCurrency(match.mutation.amount)}</span>
                      </td>
                      <td>
                        <Badge variant={match.status === 'approved' ? 'success' : 'warning'}>
                          {match.status === 'approved' ? 'Disetujui' : 'Menunggu'}
                        </Badge>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-2">
                          {match.status !== 'approved' && (
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                backgroundColor: 'var(--color-success)',
                                color: '#fff',
                                padding: '4px 10px',
                                minHeight: '32px',
                              }}
                              onClick={() => handleApprove(match.id)}
                              aria-label="Setujui pasangan"
                              title="Setujui"
                            >
                              <IconCheck />
                            </button>
                          )}
                          <button
                            type="button"
                            className="btn btn-sm btn-danger"
                            style={{ padding: '4px 10px', minHeight: '32px' }}
                            onClick={() => handleReject(match.id)}
                            aria-label="Tolak pasangan"
                            title="Batalkan"
                          >
                            <IconX />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
