'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge, ToastProvider, useToast } from '@/components/ui'
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

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

/* ── Interfaces ────────────────────────────────────────────────────────── */

interface SaleRow {
  id: string
  date: Date
  amount: number // gross omset
  branch: string
  method: string
  mdr: number
  net: number // expected settlement
}

interface MutationRow {
  id: string
  date: Date
  amount: number
  description: string
  ref: string
}

interface MatchPair {
  id: string
  sale: SaleRow
  mutation: MutationRow
  diff: number
  status: 'proposed' | 'approved'
}

/* ── Page Component ───────────────────────────────────────────────────── */

function MatchPageContent() {
  const toast = useToast()
  const { profile } = useAuth()

  const [unmatchedSales, setUnmatchedSales] = useState<SaleRow[]>([])
  const [unmatchedMutations, setUnmatchedMutations] = useState<MutationRow[]>([])
  const [matches, setMatches] = useState<MatchPair[]>([])
  
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null)
  const [selectedMutationId, setSelectedMutationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const supabaseActive = isSupabaseConfigured

  // Load unmatched transactions
  const loadData = async () => {
    setLoading(true)
    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          // 1. Fetch pending/discrepant reconciliations
          const { data: dbRecons, error: reconsError } = await supabase
            .from('reconciliations')
            .select(`
              id,
              sale_date,
              expected_amount,
              mdr_amount,
              expected_settlement,
              branches (name),
              payment_methods (name)
            `)
            .in('status', ['pending', 'discrepancy'])

          if (reconsError) throw reconsError

          // 2. Fetch unreconciled bank mutations
          const { data: dbMutations, error: mutationsError } = await supabase
            .from('bank_mutations')
            .select('id, mutation_date, amount, description, reference_number')
            .eq('is_reconciled', false)

          if (mutationsError) throw mutationsError

          // Map recons
          const mappedSales: SaleRow[] = (dbRecons || []).map((row: any) => ({
            id: row.id,
            date: new Date(row.sale_date),
            amount: parseFloat(row.expected_amount) || 0,
            branch: row.branches?.name || 'Unknown',
            method: row.payment_methods?.name || 'Unknown',
            mdr: parseFloat(row.mdr_amount) || 0,
            net: parseFloat(row.expected_settlement) || 0
          }))

          // Map mutations
          const mappedMutations: MutationRow[] = (dbMutations || []).map((row: any) => ({
            id: row.id,
            date: new Date(row.mutation_date),
            amount: parseFloat(row.amount) || 0,
            description: row.description || '',
            ref: row.reference_number || '-'
          }))

          setUnmatchedSales(mappedSales.sort((a, b) => a.date.getTime() - b.date.getTime()))
          setUnmatchedMutations(mappedMutations.sort((a, b) => a.date.getTime() - b.date.getTime()))
        }
      } catch (e) {
        console.error('Failed to load match data:', e)
        toast.error('Gagal memuat data pencocokan dari server.')
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode
      try {
        const localReconsStr = localStorage.getItem('raja-aksesoris-reconciliations') || '[]'
        const localRecons: any[] = JSON.parse(localReconsStr)

        const localMutsStr = localStorage.getItem('raja-aksesoris-bank-mutations') || '[]'
        const localMuts: any[] = JSON.parse(localMutsStr)

        // Filter unmatched recons
        const pendingRecons = localRecons.filter(r => r.status === 'pending' || r.status === 'discrepancy')
        const mappedSales: SaleRow[] = pendingRecons.map(row => ({
          id: row.id,
          date: new Date(row.date),
          amount: row.expectedAmount,
          branch: row.branchName,
          method: row.paymentMethodName,
          mdr: row.mdrAmount,
          net: row.expectedSettlement
        }))

        // Filter unmatched mutations
        const pendingMuts = localMuts.filter(m => !m.reconciled)
        const mappedMutations: MutationRow[] = pendingMuts.map(row => ({
          id: row.id,
          date: new Date(row.tanggal),
          amount: row.jumlah,
          description: row.keterangan,
          ref: row.noRef
        }))

        setUnmatchedSales(mappedSales.sort((a, b) => a.date.getTime() - b.date.getTime()))
        setUnmatchedMutations(mappedMutations.sort((a, b) => a.date.getTime() - b.date.getTime()))
      } catch (err) {
        console.error('Error loading demo match data:', err)
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    loadData()
  }, [])

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
    const newMatches: MatchPair[] = []
    let matchId = matches.length

    for (let si = remainingSales.length - 1; si >= 0; si--) {
      const sale = remainingSales[si]

      for (let mi = remainingMutations.length - 1; mi >= 0; mi--) {
        const mutation = remainingMutations[mi]
        const tolerance = sale.net * 0.01 // 1% tolerance
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
      toast.warning('Tidak ditemukan kecocokan otomatis dalam toleransi 1%')
      return
    }

    setUnmatchedSales(remainingSales)
    setUnmatchedMutations(remainingMutations)
    setMatches((prev) => [...prev, ...newMatches])
    setSelectedSaleId(null)
    setSelectedMutationId(null)

    toast.success(`Menemukan ${newMatches.length} pasangan kecocokan otomatis!`)
  }, [unmatchedSales, unmatchedMutations, matches.length])

  /* ── Manual Match ───────────────────────────────────────────────── */
  const handleManualMatch = useCallback(() => {
    if (!selectedSaleId || !selectedMutationId) return

    const sale = unmatchedSales.find((s) => s.id === selectedSaleId)
    const mutation = unmatchedMutations.find((m) => m.id === selectedMutationId)

    if (!sale || !mutation) return

    const newMatch: MatchPair = {
      id: `match-manual-${Date.now()}`,
      sale,
      mutation,
      diff: mutation.amount - sale.net,
      status: 'proposed',
    }

    setMatches((prev) => [...prev, newMatch])
    setUnmatchedSales((prev) => prev.filter((s) => s.id !== selectedSaleId))
    setUnmatchedMutations((prev) => prev.filter((m) => m.id !== selectedMutationId))
    setSelectedSaleId(null)
    setSelectedMutationId(null)

    toast.success('Pencocokan manual berhasil dipasangkan.')
  }, [selectedSaleId, selectedMutationId, unmatchedSales, unmatchedMutations])

  /* ── Approve Match (Persist) ────────────────────────────────────── */
  const handleApprove = async (matchId: string) => {
    const match = matches.find((m) => m.id === matchId)
    if (!match) return

    const { sale, mutation } = match
    const isExact = match.diff === 0
    const finalStatus = isExact ? 'matched' : 'discrepancy'

    if (supabaseActive) {
      try {
        const supabase = createClient()
        if (supabase) {
          // 1. Update reconciliations table
          const { error: reconError } = await supabase
            .from('reconciliations')
            .update({
              status: finalStatus,
              actual_amount: mutation.amount,
              bank_mutation_id: mutation.id,
              settlement_date: mutation.date.toISOString().split('T')[0],
              discrepancy_amount: match.diff,
              reconciled_by: profile?.id
            })
            .eq('id', sale.id)

          if (reconError) throw reconError

          // 2. Update bank_mutations table
          const { error: mutationError } = await supabase
            .from('bank_mutations')
            .update({
              is_reconciled: true
            })
            .eq('id', mutation.id)

          if (mutationError) throw mutationError

          toast.success('Pencocokan transaksi berhasil disimpan ke server.')
          
          // Update local state to approved
          setMatches((prev) =>
            prev.map((m) => (m.id === matchId ? { ...m, status: 'approved' } : m))
          )
        }
      } catch (err) {
        console.error('Failed to save match:', err)
        toast.error('Gagal menyimpan pencocokan ke server.')
      }
    } else {
      // Demo Mode
      try {
        const localReconsStr = localStorage.getItem('raja-aksesoris-reconciliations') || '[]'
        const localRecons: any[] = JSON.parse(localReconsStr)

        const localMutsStr = localStorage.getItem('raja-aksesoris-bank-mutations') || '[]'
        const localMuts: any[] = JSON.parse(localMutsStr)

        // Update reconciliation status
        const updatedRecons = localRecons.map(r => {
          if (r.id === sale.id) {
            return {
              ...r,
              status: finalStatus,
              actualAmount: mutation.amount,
              bankMutationId: mutation.id,
              discrepancyAmount: match.diff,
            }
          }
          return r
        })

        // Update mutation status
        const updatedMuts = localMuts.map(m => {
          if (m.id === mutation.id) {
            return {
              ...m,
              reconciled: true
            }
          }
          return m
        })

        localStorage.setItem('raja-aksesoris-reconciliations', JSON.stringify(updatedRecons))
        localStorage.setItem('raja-aksesoris-bank-mutations', JSON.stringify(updatedMuts))

        toast.success('Pencocokan transaksi disimpan secara lokal.')
        
        // Update local state to approved
        setMatches((prev) =>
          prev.map((m) => (m.id === matchId ? { ...m, status: 'approved' } : m))
        )
      } catch (err) {
        console.error('Failed to save match locally:', err)
        toast.error('Gagal menyimpan pencocokan secara lokal.')
      }
    }
  }

  /* ── Reject Match Proposal (Remove from table, return to lists) ── */
  const handleReject = useCallback((matchId: string) => {
    const match = matches.find((m) => m.id === matchId)
    if (!match) return

    setUnmatchedSales((prev) => [...prev, match.sale].sort((a, b) => a.date.getTime() - b.date.getTime()))
    setUnmatchedMutations((prev) => [...prev, match.mutation].sort((a, b) => a.date.getTime() - b.date.getTime()))
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
          {selectedSaleId && selectedMutationId && (
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
      {(selectedSaleId || selectedMutationId) && (
        <div className="card mb-4 animate-scale-in" style={{ borderColor: 'var(--color-primary)', borderWidth: '2px' }}>
          <div className="card-body">
            <div className="flex items-center gap-3 flex-wrap">
              <IconLink />
              <span className="text-sm font-medium">
                {selectedSaleId && !selectedMutationId && 'Pilih satu mutasi bank di sisi kanan untuk membuat pasangan'}
                {!selectedSaleId && selectedMutationId && 'Pilih satu data penjualan di sisi kiri untuk membuat pasangan'}
                {selectedSaleId && selectedMutationId && 'Klik "Pasangkan Manual" untuk mencocokkan kedua item ini'}
              </span>
              <button
                type="button"
                className="btn btn-ghost btn-sm ml-auto"
                onClick={() => { setSelectedSaleId(null); setSelectedMutationId(null) }}
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card">
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 'var(--space-12)' }}>
            <span className="spinner spinner-lg" />
            <p style={{ marginTop: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>Memuat data transaksi...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ── Split View ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6 animate-slide-up delay-2">
            {/* Left: Unmatched Sales */}
            <div className="card">
              <div className="card-header">
                <h3 style={{ fontSize: 'var(--text-base)' }}>
                  Penjualan Belum Cocok (Daily Sales)
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
                      onClick={() => setSelectedSaleId(selectedSaleId === sale.id ? null : sale.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--color-border-light)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 150ms ease',
                        backgroundColor: selectedSaleId === sale.id ? 'var(--color-primary-light)' : 'transparent',
                        borderLeft: selectedSaleId === sale.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                        minHeight: '44px',
                      }}
                      aria-pressed={selectedSaleId === sale.id}
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
                      onClick={() => setSelectedMutationId(selectedMutationId === mutation.id ? null : mutation.id)}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--space-1)',
                        padding: 'var(--space-3) var(--space-4)',
                        borderBottom: '1px solid var(--color-border-light)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 150ms ease',
                        backgroundColor: selectedMutationId === mutation.id ? 'var(--color-primary-light)' : 'transparent',
                        borderLeft: selectedMutationId === mutation.id ? '3px solid var(--color-primary)' : '3px solid transparent',
                        minHeight: '44px',
                      }}
                      aria-pressed={selectedMutationId === mutation.id}
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
                  <h3>Hasil Pencocokan (Konfirmasi Rekonsiliasi)</h3>
                </div>
                <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Penjualan</th>
                        <th>Net Expected</th>
                        <th style={{ textAlign: 'center' }}>Selisih</th>
                        <th>Mutasi Bank</th>
                        <th>Nominal Mutasi</th>
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
                              {match.status === 'approved' ? 'Disetujui' : 'Menunggu Persetujuan'}
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
                                  title="Setujui & Simpan"
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
        </>
      )}
    </div>
  )
}

export default function MatchPage() {
  return (
    <ToastProvider>
      <MatchPageContent />
    </ToastProvider>
  )
}
