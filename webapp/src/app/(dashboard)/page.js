'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useBranch } from '@/hooks/useBranch'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency, formatNumber, calculatePercentageChange, formatMonth } from '@/lib/utils'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CHART_COLORS = ['#FF6B00', '#FF8C00', '#FFB347', '#4ADE80', '#60A5FA', '#A78BFA']

export default function DashboardPage() {
  const { profile } = useAuth()
  const { branches, selectedBranch } = useBranch(profile)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    todaySales: 0,
    monthSales: 0,
    prevMonthSales: 0,
    pendingReconciliation: 0,
    monthExpenses: 0,
  })
  const [dailySalesData, setDailySalesData] = useState([])
  const [branchSalesData, setBranchSalesData] = useState([])
  const [paymentBreakdown, setPaymentBreakdown] = useState([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Simulate loading with demo data for now
    const timer = setTimeout(() => {
      loadDemoData()
      setLoading(false)
    }, 800)
    return () => clearTimeout(timer)
  }, [selectedBranch])

  const loadDemoData = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()

    // Generate daily sales trend data
    const dailyData = []
    for (let i = 1; i <= Math.min(now.getDate(), daysInMonth); i++) {
      const baseAmount = 3000000 + Math.random() * 5000000
      dailyData.push({
        tanggal: `${i}`,
        omset: Math.round(baseAmount),
      })
    }
    setDailySalesData(dailyData)

    // Branch sales comparison
    const branchNames = ['Mojokerto', 'Jombang', 'Kediri', 'Mojoagung', 'Tulungagung']
    const branchData = branchNames.map((name) => ({
      cabang: name,
      omset: Math.round(20000000 + Math.random() * 30000000),
    }))
    setBranchSalesData(branchData)

    // Payment method breakdown
    const payments = [
      { name: 'Cash', value: Math.round(35000000 + Math.random() * 10000000) },
      { name: 'QRIS', value: Math.round(25000000 + Math.random() * 10000000) },
      { name: 'Transfer', value: Math.round(20000000 + Math.random() * 10000000) },
      { name: 'Debit', value: Math.round(15000000 + Math.random() * 5000000) },
      { name: 'Shopee', value: Math.round(7000000 + Math.random() * 5000000) },
      { name: 'TikTok', value: Math.round(3000000 + Math.random() * 3000000) },
      { name: 'Kartu Kredit', value: Math.round(5000000 + Math.random() * 3000000) },
    ]
    setPaymentBreakdown(payments)

    // Stats
    const todayTotal = dailyData[dailyData.length - 1]?.omset || 0
    const monthTotal = dailyData.reduce((acc, d) => acc + d.omset, 0)
    const prevMonthTotal = monthTotal * (0.85 + Math.random() * 0.3)

    setStats({
      todaySales: todayTotal,
      monthSales: monthTotal,
      prevMonthSales: Math.round(prevMonthTotal),
      pendingReconciliation: Math.floor(Math.random() * 8) + 2,
      monthExpenses: Math.round(monthTotal * 0.15),
    })
  }

  const monthTrend = useMemo(() => {
    return calculatePercentageChange(stats.monthSales, stats.prevMonthSales)
  }, [stats.monthSales, stats.prevMonthSales])

  const currentMonthName = formatMonth(new Date().getMonth() + 1)

  if (!mounted) return null

  return (
    <div className="dashboard-page animate-fade-in">
      <div className="dashboard-page-header">
        <h1 className="dashboard-page-title">Dashboard</h1>
        <p className="dashboard-page-subtitle">
          Ringkasan bisnis {currentMonthName} {new Date().getFullYear()}
          {selectedBranch && branches.length > 0
            ? ` — ${branches.find((b) => b.id === (selectedBranch?.id || selectedBranch))?.name || selectedBranch.name || ''}`
            : ' — Semua Cabang'}
        </p>
      </div>

      {/* Stat Cards */}
      <div className="stat-grid">
        <div className={`stat-card ${loading ? 'skeleton-wrapper' : ''}`}>
          {loading ? (
            <div className="skeleton stat-skeleton" />
          ) : (
            <>
              <div className="stat-card-header">
                <span className="stat-card-label">Omset Hari Ini</span>
                <div className="stat-card-icon stat-card-icon-primary">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 17V7L7 3L11 7V17M11 17V10L15 7L19 10V17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 17H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.todaySales)}</div>
              <div className="stat-card-footer">
                <span className="stat-card-subtitle">Total 5 cabang</span>
              </div>
            </>
          )}
        </div>

        <div className={`stat-card ${loading ? 'skeleton-wrapper' : ''}`}>
          {loading ? (
            <div className="skeleton stat-skeleton" />
          ) : (
            <>
              <div className="stat-card-header">
                <span className="stat-card-label">Omset Bulan Ini</span>
                <div className="stat-card-icon stat-card-icon-success">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 3V17H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M7 13L10 9L13 11L17 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.monthSales)}</div>
              <div className="stat-card-footer">
                <span className={`stat-trend ${monthTrend.positive ? 'stat-trend-up' : 'stat-trend-down'}`}>
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d={monthTrend.positive ? 'M6 10V2M3 5L6 2L9 5' : 'M6 2V10M3 7L6 10L9 7'}
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {monthTrend.value}%
                </span>
                <span className="stat-card-subtitle">vs bulan lalu</span>
              </div>
            </>
          )}
        </div>

        <div className={`stat-card ${loading ? 'skeleton-wrapper' : ''}`}>
          {loading ? (
            <div className="skeleton stat-skeleton" />
          ) : (
            <>
              <div className="stat-card-header">
                <span className="stat-card-label">Reconciliation Pending</span>
                <div className="stat-card-icon stat-card-icon-warning">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M2 8H18" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M6 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div className="stat-card-value">{stats.pendingReconciliation} <span className="stat-card-value-unit">transaksi</span></div>
              <div className="stat-card-footer">
                <span className="stat-card-subtitle">Belum dicocokan</span>
              </div>
            </>
          )}
        </div>

        <div className={`stat-card ${loading ? 'skeleton-wrapper' : ''}`}>
          {loading ? (
            <div className="skeleton stat-skeleton" />
          ) : (
            <>
              <div className="stat-card-header">
                <span className="stat-card-label">Pengeluaran Bulan Ini</span>
                <div className="stat-card-icon stat-card-icon-danger">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2V18M14 5H8C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11H12C13.6569 11 15 12.3431 15 14C15 15.6569 13.6569 17 12 17H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
              <div className="stat-card-value">{formatCurrency(stats.monthExpenses)}</div>
              <div className="stat-card-footer">
                <span className="stat-card-subtitle">Kas kecil + operasional</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Charts Row */}
      <div className="chart-grid">
        {/* Sales Trend Chart */}
        <div className="card chart-card chart-card-wide">
          <div className="card-header">
            <h3 className="card-title">Tren Omset Harian</h3>
            <span className="card-subtitle">{currentMonthName} {new Date().getFullYear()}</span>
          </div>
          <div className="card-body chart-container">
            {loading ? (
              <div className="skeleton chart-skeleton" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySalesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                  <XAxis
                    dataKey="tanggal"
                    stroke="var(--color-text-secondary)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="var(--color-text-secondary)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text)',
                      fontSize: '13px',
                    }}
                    formatter={(value) => [formatCurrency(value), 'Omset']}
                    labelFormatter={(label) => `Tanggal ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="omset"
                    stroke="#FF6B00"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: '#FF6B00', stroke: '#fff', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Branch Comparison Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title">Omset per Cabang</h3>
            <span className="card-subtitle">Bulan ini</span>
          </div>
          <div className="card-body chart-container">
            {loading ? (
              <div className="skeleton chart-skeleton" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={branchSalesData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="var(--color-text-secondary)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`}
                  />
                  <YAxis
                    type="category"
                    dataKey="cabang"
                    stroke="var(--color-text-secondary)"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text)',
                      fontSize: '13px',
                    }}
                    formatter={(value) => [formatCurrency(value), 'Omset']}
                  />
                  <Bar dataKey="omset" radius={[0, 6, 6, 0]} maxBarSize={32}>
                    {branchSalesData.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Payment Breakdown Chart */}
        <div className="card chart-card">
          <div className="card-header">
            <h3 className="card-title">Metode Pembayaran</h3>
            <span className="card-subtitle">Distribusi bulan ini</span>
          </div>
          <div className="card-body chart-container">
            {loading ? (
              <div className="skeleton chart-skeleton" />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {paymentBreakdown.map((_, index) => (
                      <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text)',
                      fontSize: '13px',
                    }}
                    formatter={(value) => [formatCurrency(value)]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value) => <span style={{ color: 'var(--color-text)', fontSize: '12px' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginTop: 'var(--space-6)' }}>
        <div className="card-header">
          <h3 className="card-title">Aksi Cepat</h3>
        </div>
        <div className="card-body">
          <div className="quick-actions">
            <a href="/reconciliation/input" className="quick-action-item">
              <div className="quick-action-icon quick-action-icon-primary">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7 14H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span>Input Reconciliation</span>
            </a>
            <a href="/penjualan" className="quick-action-item">
              <div className="quick-action-icon quick-action-icon-success">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span>Input Penjualan</span>
            </a>
            <a href="/kas-kecil" className="quick-action-item">
              <div className="quick-action-icon quick-action-icon-warning">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3V21M16 6H10C8.34315 6 7 7.34315 7 9C7 10.6569 8.34315 12 10 12H14C15.6569 12 17 13.3431 17 15C17 16.6569 15.6569 18 14 18H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
              <span>Kas Kecil</span>
            </a>
            <a href="/pnl" className="quick-action-item">
              <div className="quick-action-icon quick-action-icon-info">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M4 4V20H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 16L12 10L16 13L20 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span>Laporan P&L</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
