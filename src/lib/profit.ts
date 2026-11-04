export const HEALTHY_MARGIN_PCT = 20

export type MarginStatus = 'healthy' | 'thin' | 'loss'

export interface Financials {
  quote: number
  cogs: number
  profit: number
  marginPct: number
}

export function sumCogs(expenses: { amount: number }[]): number {
  return round2(expenses.reduce((s, e) => s + e.amount, 0))
}

/** Profit = quote − COGS; margin = profit / quote (0 when quote is 0). */
export function computeFinancials(quote: number, cogs: number): Financials {
  const profit = round2(quote - cogs)
  const marginPct = quote > 0 ? (profit / quote) * 100 : 0
  return { quote, cogs, profit, marginPct }
}

export function marginStatus(f: Pick<Financials, 'profit' | 'marginPct'>): MarginStatus {
  if (f.profit < 0) return 'loss'
  if (f.marginPct >= HEALTHY_MARGIN_PCT) return 'healthy'
  return 'thin'
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
