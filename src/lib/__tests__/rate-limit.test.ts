import { describe, it, expect } from 'vitest'
import { rateLimit } from '../rate-limit'

describe('rateLimit', () => {
  it('allows requests within the limit', () => {
    const key = 'test-within-limit-' + Date.now()

    const first = rateLimit(key, 3, 60_000)
    expect(first.success).toBe(true)
    expect(first.remaining).toBe(2)

    const second = rateLimit(key, 3, 60_000)
    expect(second.success).toBe(true)
    expect(second.remaining).toBe(1)

    const third = rateLimit(key, 3, 60_000)
    expect(third.success).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it('rejects requests over the limit', () => {
    const key = 'test-over-limit-' + Date.now()

    // Exhaust the limit
    rateLimit(key, 2, 60_000)
    rateLimit(key, 2, 60_000)

    // This one should fail
    const result = rateLimit(key, 2, 60_000)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
