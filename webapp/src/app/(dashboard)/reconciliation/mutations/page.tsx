'use client'

import React, { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge, Table, Modal } from '@/components/ui'
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

/* ── Demo Data ─────────────────────────────────────────────────────────── */

interface DemoMutationRow extends Record<string, any> {
  id: number
  tanggal: Date
  jumlah: number
  keterangan: string
  noRef: string
  reconciled: boolean
}

function generateDemoMutations(): DemoMutationRow[] {
  const descriptions = [
    'Settlement QRIS - BCA',
    'Transfer Masuk - Tokopedia',
    'Settlement EDC Debit - BRI',
    'Transfer Masuk - Shopee',
    'Settlement Kartu Kredit - Mandiri',
    'Transfer Masuk - Customer',
    'Settlement QRIS - Mandiri',
    'Pembayaran Supplier',
    'Settlement EDC Debit - BCA',
    'Transfer Masuk - Lazada',
    'Settlement QRIS - BNI',
    'Refund Customer',
    'Settlement Kartu Kredit - BCA',
  ]

  const mutations: DemoMutationRow[] = []
  const year = 2026
  const month = 5 // June (0-indexed)

  for (let i = 0; i < 13; i++) {
    const day = Math.min(1 + Math.floor(i * 2.3), 28)
    const amount = Math.round((200000 + Math.random() * 8000000) / 1000) * 1000
    const isReconciled = Math.random() > 0.45

    mutations.push({
      id: i + 1,
      tanggal: new Date(year, month, day),
      jumlah: descriptions[i].includes('Supplier') || descriptions[i].includes('Refund') ? -amount : amount,
      keterangan: descriptions[i],
      noRef: `REF${String(year)}${String(month + 1).padStart(2, '0')}${String(day).padStart(2, '0')}${String(i + 1).padStart(3, '0')}`,
      reconciled: isReconciled,
    })
  }

  return mutations
}

const INITIAL_MUTATIONS = generateDemoMutations()

interface MutationFormData {
  tanggal: string
  jumlah: string
  keterangan: string
  noRef: string
}

/* ── Page Component ───────────────────────────────────────────────────── */

export default function MutationsPage() {
  const [mutations, setMutations] = useState<DemoMutationRow[]>(INITIAL_MUTATIONS)
  const [modalOpen, setModalOpen] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  /* ── Modal form state ───────────────────────────────────────────── */
  const [formData, setFormData] = useState<MutationFormData>({
    tanggal: new Date().toISOString().split('T')[0],
    jumlah: '',
    keterangan: '',
    noRef: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  /* ── Filtered data ──────────────────────────────────────────────── */
  const filteredMutations = useMemo(() => {
    return mutations.filter((m) => {
      if (dateFrom) {
        const from = new Date(dateFrom)
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

  /* ── Table Columns ──────────────────────────────────────────────── */
  const columns: TableColumn<DemoMutationRow>[] = [
    {
      key: 'tanggal',
      label: 'Tanggal',
      render: (val) => formatDate(val as Date),
    },
    {
      key: 'jumlah',
      label: 'Jumlah',
      render: (val) => (
        <span className={(val as number) < 0 ? 'text-danger' : ''} style={{ fontWeight: 600 }}>
          {formatCurrency(val as number)}
        </span>
      ),
    },
    { key: 'keterangan', label: 'Keterangan' },
    { key: 'noRef', label: 'No Ref' },
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

  /* ── Add mutation ───────────────────────────────────────────────── */
  const handleFormChange = useCallback((field: keyof MutationFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next[field]
      return next
    })
  }, [])

  const handleAddMutation = useCallback(() => {
    const newErrors: Record<string, string> = {}
    if (!formData.tanggal) newErrors.tanggal = 'Tanggal wajib diisi'
    if (!formData.jumlah || isNaN(parseInt(formData.jumlah, 10))) newErrors.jumlah = 'Jumlah harus berupa angka'
    if (!formData.keterangan.trim()) newErrors.keterangan = 'Keterangan wajib diisi'

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors)
      return
    }

    const newMutation: DemoMutationRow = {
      id: mutations.length + 1,
      tanggal: new Date(formData.tanggal),
      jumlah: parseInt(formData.jumlah, 10),
      keterangan: formData.keterangan.trim(),
      noRef: formData.noRef.trim() || '-',
      reconciled: false,
    }

    setMutations((prev) => [newMutation, ...prev])
    setModalOpen(false)
    setFormData({
      tanggal: new Date().toISOString().split('T')[0],
      jumlah: '',
      keterangan: '',
      noRef: '',
    })
    setFormErrors({})

    console.log('✅ Mutasi bank ditambahkan:', newMutation)
  }, [formData, mutations.length])

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
      <div className="page-header">
        <div>
          <h1>Mutasi Bank</h1>
          <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-1)' }}>
            Kelola data transaksi masuk dan keluar dari rekening bank
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setModalOpen(true)}
        >
          <IconPlus />
          Tambah Mutasi
        </button>
      </div>

      {/* ── Summary ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap mb-4 animate-slide-up delay-1">
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

      {/* ── Date Range Filter ────────────────────────────────────────── */}
      <div className="card mb-6 animate-slide-up delay-2">
        <div className="card-body">
          <div className="flex items-end gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <IconFilter />
              <span className="font-medium text-sm">Filter Tanggal:</span>
            </div>
            <div className="input-group" style={{ maxWidth: '200px' }}>
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
            <div className="input-group" style={{ maxWidth: '200px' }}>
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
      <div className="animate-slide-up delay-3">
        <Table
          columns={columns}
          data={filteredMutations}
          emptyMessage="Tidak ada data mutasi bank untuk periode ini."
        />
      </div>

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
              No Referensi
            </label>
            <input
              id="modal-noref"
              type="text"
              className="input"
              placeholder="Opsional"
              value={formData.noRef}
              onChange={(e) => handleFormChange('noRef', e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
