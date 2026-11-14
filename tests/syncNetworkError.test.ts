/**
 * A dropped connection must pause the sync queue, not count against the row. Otherwise the sale
 * burns a try and every line item after it fails because its sale isn't on the server.
 */
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/backend/data/local/db', () => ({ db: {} }))
vi.mock('../src/lib/supabase', () => ({ supabase: {} }))

const { isNetworkError } = await import('../src/backend/data/local/syncqueue')

describe('isNetworkError', () => {
  it('knows the iOS "connection was lost" error', () => {
    expect(
      isNetworkError({
        code: '',
        message:
          'Error: fetch failed: UnexpectedException: The network connection was lost. (at ExpoModulesCore/Promise.swift:56)',
      }),
    ).toBe(true)
  })

  it('knows the older wordings', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true)
    expect(isNetworkError({ message: 'Failed to fetch' })).toBe(true)
  })

  it('leaves real server answers alone', () => {
    expect(
      isNetworkError({ code: '23503', message: 'violates foreign key constraint' }),
    ).toBe(false)
  })
})
