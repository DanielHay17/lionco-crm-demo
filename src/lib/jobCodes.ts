export const JOB_CODE_PREFIX = 'LC'

export interface ParsedJobCode {
  year: number
  seq: number
}

export function formatJobCode(year: number, seq: number): string {
  return `${JOB_CODE_PREFIX}-${year}-${String(seq).padStart(3, '0')}`
}

export function parseJobCode(code: string): ParsedJobCode | null {
  const m = /^LC-(\d{4})-(\d{3,})$/.exec(code)
  if (!m) return null
  return { year: Number(m[1]), seq: Number(m[2]) }
}

/** Next sequential job code for the given year. Never typed by users. */
export function nextJobCode(existingCodes: string[], year: number): string {
  let max = 0
  for (const c of existingCodes) {
    const p = parseJobCode(c)
    if (p && p.year === year && p.seq > max) max = p.seq
  }
  return formatJobCode(year, max + 1)
}
