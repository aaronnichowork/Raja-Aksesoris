import { createClient, isSupabaseConfigured } from '@/lib/supabase/client'
import type { PnlData, PnlSaveValues, LocalSaleRecord, LocalPettyCashRecord, LocalPnlEntry } from '@/types'

// Baseline multipliers for branch mock data fallback
const BRANCH_MULTIPLIERS: Record<string, number> = {
  all: 5,
  b1: 1.3, // Mojokerto
  b2: 1.0, // Jombang
  b3: 1.1, // Kediri
  b4: 0.85, // Mojoagung
  b5: 0.75, // Tulungagung
}

// Generate baseline mock data for a branch/consolidated
export function getPnlBaseline(month: number, year: number, branchId: string): PnlData {
  const m: number = BRANCH_MULTIPLIERS[branchId] || 1
  return {
    revenue: {
      omset: Math.round(185_000_000 * m),
      pendapatanLainRevenue: 0,
    },
    hpp: {
      cogs: Math.round(111_000_000 * m),
    },
    opex: {
      kasKecil: Math.round(8_500_000 * m),
      gajiKomisi: Math.round(18_000_000 * m),
      sewaToko: Math.round(7_500_000 * m),
      marketing: Math.round(3_200_000 * m),
      penyusutan: Math.round(2_000_000 * m),
    },
    other: {
      pendapatanLain: Math.round(1_500_000 * m),
      bebanLain: Math.round(800_000 * m),
    },
  }
}

// Fetch PnL data from Supabase or LocalStorage
export async function getPnlData(month: number, year: number, branchId: string): Promise<PnlData> {
  const supabaseActive: boolean = isSupabaseConfigured

  // 1. Load actual sales (Omset)
  let actualOmset = 0
  let actualKasKecil = 0
  let hasActualSales = false
  let hasActualPC = false

  if (supabaseActive) {
    try {
      const supabase = createClient()
      const startDate: string = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const endDate: string = new Date(year, month, 0).toISOString().split('T')[0]

      // Fetch daily sales sum
      let salesQuery = supabase!
        .from('daily_sales')
        .select('amount')
        .gte('sale_date', startDate)
        .lte('sale_date', endDate)

      if (branchId !== 'all') {
        salesQuery = salesQuery.eq('branch_id', branchId)
      }

      const { data: salesData, error: salesError } = await salesQuery
      if (salesError) throw salesError
      if (salesData && salesData.length > 0) {
        actualOmset = salesData.reduce((sum: number, row: { amount: string | number }) => sum + (parseFloat(String(row.amount)) || 0), 0)
        hasActualSales = true
      }

      // Fetch petty cash expenses sum
      let pcQuery = supabase!
        .from('petty_cash')
        .select('amount')
        .eq('type', 'expense')
        .gte('transaction_date', startDate)
        .lte('transaction_date', endDate)

      if (branchId !== 'all') {
        pcQuery = pcQuery.eq('branch_id', branchId)
      }

      const { data: pcData, error: pcError } = await pcQuery
      if (pcError) throw pcError
      if (pcData && pcData.length > 0) {
        actualKasKecil = pcData.reduce((sum: number, row: { amount: string | number }) => sum + (parseFloat(String(row.amount)) || 0), 0)
        hasActualPC = true
      }

    } catch (err) {
      console.error('Failed to fetch transaction sums from Supabase:', err)
    }
  } else {
    // LocalStorage mode
    try {
      const localSales: string | null = localStorage.getItem('raja-aksesoris-daily-sales')
      if (localSales) {
        const parsedSales: LocalSaleRecord[] = JSON.parse(localSales)
        const filteredSales = parsedSales.filter((item: LocalSaleRecord) => {
          const itemDate = new Date(item.dateStr)
          const dateMatch = itemDate.getMonth() === (month - 1) && itemDate.getFullYear() === year
          const branchMatch = branchId === 'all' || String(item.branchId) === String(branchId)
          return dateMatch && branchMatch
        })
        if (filteredSales.length > 0) {
          actualOmset = filteredSales.reduce((sum: number, item: LocalSaleRecord) => sum + (item.totalOmset || 0), 0)
          hasActualSales = true
        }
      }

      const localPC: string | null = localStorage.getItem('raja-aksesoris-petty-cash')
      if (localPC) {
        const parsedPC: LocalPettyCashRecord[] = JSON.parse(localPC)
        const filteredPC = parsedPC.filter((item: LocalPettyCashRecord) => {
          const itemDate = new Date(item.dateStr)
          const dateMatch = itemDate.getMonth() === (month - 1) && itemDate.getFullYear() === year
          const branchMatch = branchId === 'all' || String(item.branchId) === String(branchId)
          const typeMatch = item.type === 'expense'
          return dateMatch && branchMatch && typeMatch
        })
        if (filteredPC.length > 0) {
          actualKasKecil = filteredPC.reduce((sum: number, item: LocalPettyCashRecord) => sum + (item.amount || 0), 0)
          hasActualPC = true
        }
      }
    } catch (err) {
      console.error('Failed to fetch transaction sums from LocalStorage:', err)
    }
  }

  // 2. Load manual entries (COGS, Sewa Toko, etc.)
  const baseline: PnlData = getPnlBaseline(month, year, branchId)
  
  // Start with baseline defaults
  const data: PnlData = {
    revenue: {
      omset: hasActualSales ? actualOmset : baseline.revenue.omset,
      pendapatanLainRevenue: baseline.revenue.pendapatanLainRevenue,
    },
    hpp: {
      cogs: baseline.hpp.cogs,
    },
    opex: {
      kasKecil: hasActualPC ? actualKasKecil : baseline.opex.kasKecil,
      gajiKomisi: baseline.opex.gajiKomisi,
      sewaToko: baseline.opex.sewaToko,
      marketing: baseline.opex.marketing,
      penyusutan: baseline.opex.penyusutan,
    },
    other: {
      pendapatanLain: baseline.other.pendapatanLain,
      bebanLain: baseline.other.bebanLain,
    }
  }

  if (supabaseActive) {
    try {
      const supabase = createClient()
      
      // Get pnl categories to map names
      const { data: catData } = await supabase!.from('pnl_categories').select('id, name, type')
      
      if (catData && catData.length > 0) {
        let entryQuery = supabase!
          .from('pnl_entries')
          .select('amount, category_id, branch_id')
          .eq('period_month', month)
          .eq('period_year', year)
          
        if (branchId !== 'all') {
          entryQuery = entryQuery.eq('branch_id', branchId)
        }
        
        const { data: entries, error } = await entryQuery
        if (!error && entries && entries.length > 0) {
          const nameMap: Record<string, string> = {}
          catData.forEach((c: { id: string; name: string }) => { nameMap[c.id] = c.name })
          
          // Reset manual fields to 0 to sum up database records
          data.hpp.cogs = 0
          data.opex.sewaToko = 0
          data.opex.marketing = 0
          data.opex.penyusutan = 0
          data.other.pendapatanLain = 0
          data.other.bebanLain = 0
          data.revenue.pendapatanLainRevenue = 0
          
          let hasManualEntries = false
          entries.forEach((entry: { amount: string | number; category_id: string; branch_id: string }) => {
            const catName: string | undefined = nameMap[entry.category_id]
            const amt: number = parseFloat(String(entry.amount)) || 0
            if (catName === 'HPP / COGS') { data.hpp.cogs += amt; hasManualEntries = true; }
            else if (catName === 'Sewa Toko') { data.opex.sewaToko += amt; hasManualEntries = true; }
            else if (catName === 'Marketing / Iklan') { data.opex.marketing += amt; hasManualEntries = true; }
            else if (catName === 'Penyusutan Aset') { data.opex.penyusutan += amt; hasManualEntries = true; }
            else if (catName === 'Pendapatan Lain-lain') { data.other.pendapatanLain += amt; hasManualEntries = true; }
            else if (catName === 'Beban Lain-lain') { data.other.bebanLain += amt; hasManualEntries = true; }
            else if (catName === 'Pendapatan Lain (Revenue)') { data.revenue.pendapatanLainRevenue += amt; hasManualEntries = true; }
          })
          
          // Restore baseline defaults if no entries exist for that field
          if (!hasManualEntries) {
            data.hpp.cogs = baseline.hpp.cogs
            data.opex.sewaToko = baseline.opex.sewaToko
            data.opex.marketing = baseline.opex.marketing
            data.opex.penyusutan = baseline.opex.penyusutan
            data.other.pendapatanLain = baseline.other.pendapatanLain
            data.other.bebanLain = baseline.other.bebanLain
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch manual P&L entries from Supabase:', err)
    }
  } else {
    // LocalStorage mode
    try {
      const localEntries: string | null = localStorage.getItem('raja-aksesoris-pnl-entries')
      if (localEntries) {
        const parsed: LocalPnlEntry[] = JSON.parse(localEntries)
        const filtered = parsed.filter((item: LocalPnlEntry) => {
          const dateMatch = item.month === month && item.year === year
          const branchMatch = branchId === 'all' || String(item.branchId) === String(branchId)
          return dateMatch && branchMatch
        })
        
        if (filtered.length > 0) {
          // Reset manual fields to sum actuals
          data.hpp.cogs = 0
          data.opex.sewaToko = 0
          data.opex.marketing = 0
          data.opex.penyusutan = 0
          data.other.pendapatanLain = 0
          data.other.bebanLain = 0
          data.revenue.pendapatanLainRevenue = 0
          
          filtered.forEach((item: LocalPnlEntry) => {
            data.hpp.cogs += (item.cogs || 0)
            data.opex.sewaToko += (item.sewaToko || 0)
            data.opex.marketing += (item.marketing || 0)
            data.opex.penyusutan += (item.penyusutan || 0)
            data.other.pendapatanLain += (item.pendapatanLain || 0)
            data.other.bebanLain += (item.bebanLain || 0)
            data.revenue.pendapatanLainRevenue += (item.pendapatanLainRevenue || 0)
          })
        }
      }
    } catch (err) {
      console.error('Failed to fetch manual P&L entries from LocalStorage:', err)
    }
  }

  return data
}

// Save PnL data to Supabase or LocalStorage
export async function savePnlData(month: number, year: number, branchId: string, values: PnlSaveValues): Promise<boolean> {
  const supabaseActive: boolean = isSupabaseConfigured

  if (supabaseActive) {
    const supabase = createClient()
    
    // Fetch categories first to get UUIDs
    const { data: catData, error: catError } = await supabase!
      .from('pnl_categories')
      .select('id, name')
      
    if (catError) throw catError
    
    const catMap: Record<string, string> = {}
    catData!.forEach((c: { id: string; name: string }) => { catMap[c.name] = c.id })
    
    // Helper to get category ID or create if missing (e.g. Pendapatan Lain (Revenue))
    const getCatId = async (name: string, type: string): Promise<string> => {
      if (catMap[name]) return catMap[name]
      
      const { data: newCat, error: insError } = await supabase!
        .from('pnl_categories')
        .insert({ name, type, is_auto: false })
        .select('id')
        .single()
        
      if (insError) throw insError
      return newCat!.id as string
    }
    
    const upsertPromises: Promise<any>[] = []
    
    interface PnlMapping {
      name: string
      type: string
      amount: number | undefined
    }

    const mappings: PnlMapping[] = [
      { name: 'HPP / COGS', type: 'cogs', amount: values.cogs },
      { name: 'Sewa Toko', type: 'operating_expense', amount: values.sewaToko },
      { name: 'Marketing / Iklan', type: 'operating_expense', amount: values.marketing },
      { name: 'Penyusutan Aset', type: 'operating_expense', amount: values.penyusutan },
      { name: 'Pendapatan Lain-lain', type: 'other_income', amount: values.pendapatanLain },
      { name: 'Beban Lain-lain', type: 'other_expense', amount: values.bebanLain },
      { name: 'Pendapatan Lain (Revenue)', type: 'revenue', amount: values.pendapatanLainRevenue },
    ]
    
    for (const item of mappings) {
      if (item.amount !== undefined) {
        const catId: string = await getCatId(item.name, item.type)
        const upsertEntry = async () => {
          return await supabase!.from('pnl_entries').upsert({
            branch_id: branchId,
            period_month: month,
            period_year: year,
            category_id: catId,
            amount: parseFloat(String(item.amount)) || 0,
            is_auto_calculated: false
          }, {
            onConflict: 'branch_id, period_month, period_year, category_id'
          })
        }
        upsertPromises.push(upsertEntry())
      }
    }
    
    const results = await Promise.all(upsertPromises)
    const hasError: boolean = results.some((res: { error: unknown }) => res.error)
    if (hasError) {
      console.error('Upsert errors:', results.filter((r: { error: unknown }) => r.error))
      throw new Error('Gagal menyimpan beberapa entri P&L')
    }
    return true
  } else {
    // LocalStorage mode
    const localEntriesStr: string = localStorage.getItem('raja-aksesoris-pnl-entries') || '[]'
    let localEntries: LocalPnlEntry[] = JSON.parse(localEntriesStr)
    
    // Remove old entry if it exists
    localEntries = localEntries.filter((item: LocalPnlEntry) => 
      !(String(item.branchId) === String(branchId) && item.month === month && item.year === year)
    )
    
    // Add new entry
    localEntries.push({
      branchId: String(branchId),
      month: month,
      year: year,
      cogs: parseFloat(String(values.cogs)) || 0,
      sewaToko: parseFloat(String(values.sewaToko)) || 0,
      marketing: parseFloat(String(values.marketing)) || 0,
      penyusutan: parseFloat(String(values.penyusutan)) || 0,
      pendapatanLain: parseFloat(String(values.pendapatanLain)) || 0,
      bebanLain: parseFloat(String(values.bebanLain)) || 0,
      pendapatanLainRevenue: parseFloat(String(values.pendapatanLainRevenue)) || 0
    })
    
    localStorage.setItem('raja-aksesoris-pnl-entries', JSON.stringify(localEntries))
    return true
  }
}
