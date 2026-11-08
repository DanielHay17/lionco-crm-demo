import type { KitItem } from './types'

/**
 * FICTIONAL demo price list. Derived from unit weight so every catalogue item gets sensible numbers.
 * Not real rates; the app lets you edit every value on the Kit & Inventory page.
 */
export function defaultPricing(item: Pick<KitItem, 'unitWeightKg' | 'category'>): Pick<KitItem, 'weeklyRentalPrice' | 'weeklyCost' | 'labourHoursPerUnit'> {
  const w = Math.max(0.5, item.unitWeightKg)
  const sheeting = item.category === 'Sheeting'
  const price = Math.round((sheeting ? 1.2 : 0.42) * w * 100) / 100
  return {
    weeklyRentalPrice: price,
    weeklyCost: Math.round(price * 0.35 * 100) / 100,
    labourHoursPerUnit: Math.round(Math.max(0.01, w * (sheeting ? 0.03 : 0.02)) * 1000) / 1000,
  }
}
