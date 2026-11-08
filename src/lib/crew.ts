export interface CrewResult {
  /** people = ceil(totalPersonHours / (days × hoursPerDay)); 0 when there is nothing to staff or inputs are invalid. */
  people: number
  valid: boolean
  reason?: string
}

const ok = (n: number) => Number.isFinite(n)

/**
 * Crew size. ASSUMPTION (demo): mirrors the "people = ceil(total person-hours / (days × hours per day))"
 * spreadsheet concept. It is a planning aid, not a safety or staffing rule.
 */
export function crewSize(totalPersonHours: number, days: number, hoursPerDay: number): CrewResult {
  if (!ok(totalPersonHours) || totalPersonHours < 0) return { people: 0, valid: false, reason: 'Total person-hours must be a number ≥ 0' }
  if (!ok(days) || days <= 0) return { people: 0, valid: false, reason: 'Days must be greater than 0' }
  if (!ok(hoursPerDay) || hoursPerDay <= 0) return { people: 0, valid: false, reason: 'Hours per day must be greater than 0' }
  if (totalPersonHours === 0) return { people: 0, valid: true }
  // small epsilon so 24 / (3 × 8) is exactly 1, not 2, despite float noise
  return { people: Math.max(1, Math.ceil(totalPersonHours / (days * hoursPerDay) - 1e-9)), valid: true }
}
