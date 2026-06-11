'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { useBranch } from '@/hooks/useBranch'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency, formatNumber, calculatePercentageChange, formatMonth } from '@/lib/utils'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const CHART_COLORS = ['#FF6B00', '#FF8C00', '#FFB347', '#4ADE80', '#60A5FA', '#A78BFA']

interface DashboardStats {
  todaySales: number
  monthSales: number
  prevMonthSales: number
  pendingReconciliation: number
  monthExpenses: number
}

interface DailySalesDataPoint {
  tanggal: string
  omset: number
}

interface BranchSalesDataPoint {
  cabang: string
  omset: number
}

interface PaymentBreakdownItem {
  name: string
  value: number
}

export default function DashboardPage() {
  const { profile } = useAuth()
  const { branches, selectedBranch } = useBranch(profile)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthSales: 0,
    prevMonthSales: 0,
    pendingReconciliation: 0,
    monthExpenses: 0,
  })
  const [dailySalesData, setDailySalesData] = useState<DailySalesDataPoint[]>([])
  const [branchSalesData, setBranchSalesData] = useState<BranchSalesDataPoint[]>([])
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdownItem[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    loadDashboardData()
  }, [selectedBranch, branches])

  const loadRealData = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1)
    const prevMonth = prevMonthDate.getMonth()
    const prevYear = prevMonthDate.getFullYear()

    const activeBranchId = selectedBranch?.id || (typeof selectedBranch === 'string' ? selectedBranch : undefined)

    // 1. Load Daily Sales
    const localSalesStr = localStorage.getItem('raja-aksesoris-daily-sales') || '[]'
    let localSales: any[] = []
    try {
      localSales = JSON.parse(localSalesStr)
    } catch (e) {
      console.error(e)
    }

    // Filter by branch if selected
    let branchSales = localSales
    if (activeBranchId) {
      branchSales = localSales.filter(item => String(item.branchId) === String(activeBranchId))
    }

    // Stats variables
    let todaySales = 0
    let monthSales = 0
    let prevMonthSales = 0

    const todayStr = now.toISOString().split('T')[0]

    // Daily sales trend map
    const dailyMap: Record<number, number> = {}
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    for (let d = 1; d <= daysInMonth; d++) {
      dailyMap[d] = 0
    }

    // Branch sales map
    const branchMap: Record<string, number> = {}
    branches.forEach(b => {
      branchMap[b.name] = 0
    })

    // Payment breakdown map
    const paymentMap: Record<string, number> = {}
    const paymentMethodNames: Record<string, string> = {
      'pay-1': 'Cash',
      'pay-2': 'Transfer Bank',
      'pay-3': 'QRIS',
      'pay-4': 'Debit',
      'pay-5': 'Kartu Kredit',
      'pay-6': 'Shopee',
      'pay-7': 'TikTok'
    }
    Object.values(paymentMethodNames).forEach(name => {
      paymentMap[name] = 0
    })

    branchSales.forEach((item: any) => {
      const itemDate = new Date(item.dateStr)
      const itemMonth = itemDate.getMonth()
      const itemYear = itemDate.getFullYear()
      const itemDay = itemDate.getDate()

      // Today's Sales
      if (item.dateStr === todayStr) {
        todaySales += item.totalOmset || 0
      }

      // Current Month's Sales
      if (itemMonth === currentMonth && itemYear === currentYear) {
        monthSales += item.totalOmset || 0
        dailyMap[itemDay] = (dailyMap[itemDay] || 0) + (item.totalOmset || 0)

        const branchObj = branches.find(b => String(b.id) === String(item.branchId))
        const branchName = branchObj ? branchObj.name : 'Unknown'
        branchMap[branchName] = (branchMap[branchName] || 0) + (item.totalOmset || 0)

        if (item.sales) {
          Object.entries(item.sales).forEach(([methodId, amount]: [string, any]) => {
            const name = paymentMethodNames[methodId] || 'Unknown'
            const amt = parseFloat(amount) || 0
            paymentMap[name] = (paymentMap[name] || 0) + amt
          })
        }
      }

      // Previous Month's Sales
      if (itemMonth === prevMonth && itemYear === prevYear) {
        prevMonthSales += item.totalOmset || 0
      }
    })

    // Prepare Daily Sales Trend Data Points
    const dailyData: DailySalesDataPoint[] = []
    const maxDay = now.getDate()
    for (let i = 1; i <= maxDay; i++) {
      dailyData.push({
        tanggal: `${i}`,
        omset: dailyMap[i] || 0
      })
    }
    setDailySalesData(dailyData)

    // Prepare Branch Sales Data Points
    const branchSalesDataPoints: BranchSalesDataPoint[] = Object.entries(branchMap).map(([name, omset]) => ({
      cabang: name,
      omset
    }))
    setBranchSalesData(branchSalesDataPoints)

    // Prepare Payment Breakdown
    const paymentBreakdownData: PaymentBreakdownItem[] = Object.entries(paymentMap).map(([name, value]) => ({
      name,
      value
    }))
    setPaymentBreakdown(paymentBreakdownData)

    // 2. Load Pending Reconciliations Count
    const localReconsStr = localStorage.getItem('raja-aksesoris-reconciliations') || '[]'
    let localRecons: any[] = []
    try {
      localRecons = JSON.parse(localReconsStr)
    } catch (e) {
      console.error(e)
    }
    if (activeBranchId) {
      localRecons = localRecons.filter(r => String(r.branchId) === String(activeBranchId))
    }
    const pendingReconciliationCount = localRecons.filter(r => {
      const rDate = new Date(r.date)
      return (r.status === 'pending' || r.status === 'discrepancy') &&
             rDate.getMonth() === currentMonth && rDate.getFullYear() === currentYear
    }).length

    // 3. Load Petty Cash Expenses this month
    const localPCStr = localStorage.getItem('raja-aksesoris-petty-cash') || '[]'
    let localPC: any[] = []
    try {
      localPC = JSON.parse(localPCStr)
    } catch (e) {
      console.error(e)
    }
    if (activeBranchId) {
      localPC = localPC.filter(t => String(t.branchId) === String(activeBranchId))
    }
    let monthExpenses = 0
    localPC.forEach(item => {
      const itemDate = new Date(item.dateStr)
      if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear && item.type === 'expense') {
        monthExpenses += item.amount || 0
      }
    })

    setStats({
      todaySales,
      monthSales,
      prevMonthSales,
      pendingReconciliation: pendingReconciliationCount,
      monthExpenses
    })
  }

  const loadDashboardData = async () => {
    setLoading(true)
    if (isSupabaseConfigured) {
      try {
        const supabase = createClient()
        if (supabase) {
          const now = new Date()
          const currentMonth = now.getMonth()
          const currentYear = now.getFullYear()
          
          const startDate = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0]
          const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split('T')[0]
          
          const prevStartDate = new Date(currentYear, currentMonth - 1, 1).toISOString().split('T')[0]
          const prevEndDate = new Date(currentYear, currentMonth, 0).toISOString().split('T')[0]
          
          const todayStr = now.toISOString().split('T')[0]

          const activeBranchId = selectedBranch?.id || (typeof selectedBranch === 'string' ? selectedBranch : undefined)

          // 1. Fetch Daily Sales
          let salesQuery = supabase
            .from('daily_sales')
            .select(`
              sale_date,
              branch_id,
              amount,
              payment_methods (id, name),
              branches (name)
            `)
            .gte('sale_date', prevStartDate)
            .lte('sale_date', endDate)

          if (activeBranchId) {
            salesQuery = salesQuery.eq('branch_id', activeBranchId)
          }

          const { data: salesData, error: salesError } = await salesQuery
          if (salesError) throw salesError

          let todaySales = 0
          let monthSales = 0
          let prevMonthSales = 0

          const dailyMap: Record<number, number> = {}
          const maxDay = now.getDate()
          for (let i = 1; i <= maxDay; i++) {
            dailyMap[i] = 0
          }

          const branchMap: Record<string, number> = {}
          branches.forEach(b => {
            branchMap[b.name] = 0
          })

          const paymentMap: Record<string, number> = {}

          if (salesData) {
            salesData.forEach((row: any) => {
              const rowDateStr = row.sale_date
              const rowDate = new Date(rowDateStr)
              const amount = parseFloat(row.amount) || 0
              const rowMonth = rowDate.getMonth()
              const rowYear = rowDate.getFullYear()
              const rowDay = rowDate.getDate()

              if (rowDateStr === todayStr) {
                todaySales += amount
              }

              if (rowMonth === currentMonth && rowYear === currentYear) {
                monthSales += amount
                dailyMap[rowDay] = (dailyMap[rowDay] || 0) + amount
                
                const branchName = row.branches?.name || 'Unknown'
                branchMap[branchName] = (branchMap[branchName] || 0) + amount

                const methodName = row.payment_methods?.name || 'Unknown'
                paymentMap[methodName] = (paymentMap[methodName] || 0) + amount
              }

              if (rowMonth === (currentMonth === 0 ? 11 : currentMonth - 1) && rowYear === (currentMonth === 0 ? currentYear - 1 : currentYear)) {
                prevMonthSales += amount
              }
            })
          }

          const dailyData: DailySalesDataPoint[] = []
          for (let i = 1; i <= maxDay; i++) {
            dailyData.push({
              tanggal: `${i}`,
              omset: dailyMap[i] || 0
            })
          }
          setDailySalesData(dailyData)

          const branchSalesDataPoints: BranchSalesDataPoint[] = Object.entries(branchMap).map(([name, omset]) => ({
            cabang: name,
            omset
          }))
          setBranchSalesData(branchSalesDataPoints)

          const paymentBreakdownData: PaymentBreakdownItem[] = Object.entries(paymentMap).map(([name, value]) => ({
            name,
            value
          }))
          setPaymentBreakdown(paymentBreakdownData)

          // 2. Fetch Pending Reconciliations
          let reconQuery = supabase
            .from('reconciliations')
            .select('id', { count: 'exact', head: true })
            .or('status.eq.pending,status.eq.discrepancy')
            .gte('sale_date', startDate)
            .lte('sale_date', endDate)

          if (activeBranchId) {
            reconQuery = reconQuery.eq('branch_id', activeBranchId)
          }

          const { count: pendingCount, error: reconError } = await reconQuery
          if (reconError) throw reconError

          // 3. Fetch Petty Cash Expenses
          let pcQuery = supabase
            .from('petty_cash')
            .select('amount')
            .eq('type', 'expense')
            .gte('transaction_date', startDate)
            .lte('transaction_date', endDate)

          if (activeBranchId) {
            pcQuery = pcQuery.eq('branch_id', activeBranchId)
          }

          const { data: pcData, error: pcError } = await pcQuery
          if (pcError) throw pcError

          let monthExpenses = 0
          if (pcData) {
            pcData.forEach((row: any) => {
              monthExpenses += parseFloat(row.amount) || 0
            })
          }

          setStats({
            todaySales,
            monthSales,
            prevMonthSales,
            pendingReconciliation: pendingCount || 0,
            monthExpenses
          })
        }
      } catch (err) {
        console.error('Failed to load dashboard data from Supabase:', err)
      } finally {
        setLoading(false)
      }
    } else {
      // Demo Mode
      try {
        loadRealData()
      } catch (err) {
        console.error('Failed to load local dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }
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
                    tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}jt`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface-elevated)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px',
                      color: 'var(--color-text)',
                      fontSize: '13px',
                    }}
                    formatter={(value: any) => [formatCurrency(value as number), 'Omset']}
                    labelFormatter={(label: any) => `Tanggal ${label}`}
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
                    tickFormatter={(v: number) => `${(v / 1000000).toFixed(0)}jt`}
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
                    formatter={(value: any) => [formatCurrency(value as number), 'Omset']}
                  />
                  <Bar dataKey="omset" radius={[0, 6, 6, 0]} maxBarSize={32}>
                    {branchSalesData.map((_: BranchSalesDataPoint, index: number) => (
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
                    {paymentBreakdown.map((_: PaymentBreakdownItem, index: number) => (
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
                    formatter={(value: any) => [formatCurrency(value as number)]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => <span style={{ color: 'var(--color-text)', fontSize: '12px' }}>{value}</span>}
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
