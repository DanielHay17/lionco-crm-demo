import { describe, expect, it } from 'vitest'
import { formatJobCode, nextJobCode, parseJobCode } from './jobCodes'

describe('job codes', () => {
  it('formats with zero padding', () => {
    expect(formatJobCode(2026, 14)).toBe('LC-2026-014')
    expect(formatJobCode(2026, 1)).toBe('LC-2026-001')
  })

  it('parses valid codes and rejects bad ones', () => {
    expect(parseJobCode('LC-2026-014')).toEqual({ year: 2026, seq: 14 })
    expect(parseJobCode('Brook St')).toBeNull()
    expect(parseJobCode('LC-26-1')).toBeNull()
  })

  it('starts at 001 for a new year / empty list', () => {
    expect(nextJobCode([], 2026)).toBe('LC-2026-001')
    expect(nextJobCode(['LC-2025-099'], 2026)).toBe('LC-2026-001')
  })

  it('is sequential from the highest existing code, not the count', () => {
    expect(nextJobCode(['LC-2026-001', 'LC-2026-014', 'LC-2026-003'], 2026)).toBe('LC-2026-015')
  })

  it('ignores junk codes', () => {
    expect(nextJobCode(['nonsense', 'LC-2026-002'], 2026)).toBe('LC-2026-003')
  })
})
