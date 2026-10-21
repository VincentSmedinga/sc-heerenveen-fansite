import { describe, expect, it } from 'vitest'

import { isIndexable, readEnv } from './env'

describe('readEnv', () => {
  it.each(['local', 'acceptance', 'production'])('accepts SITE_ENV=%s', (siteEnv) => {
    expect(readEnv({ SITE_ENV: siteEnv })).toEqual({ SITE_ENV: siteEnv })
  })

  it('names a missing SITE_ENV', () => {
    expect(() => readEnv({})).toThrow('SITE_ENV is missing')
  })

  it('treats an empty SITE_ENV as missing', () => {
    expect(() => readEnv({ SITE_ENV: '' })).toThrow('SITE_ENV is missing')
  })

  it('rejects an unknown value without repeating it', () => {
    expect(() => readEnv({ SITE_ENV: 'productie' })).toThrow(/SITE_ENV/)
    expect(() => readEnv({ SITE_ENV: 'productie' })).not.toThrow(/productie/)
  })
})

describe('isIndexable', () => {
  it('lets search engines in on production only', () => {
    expect(isIndexable({ SITE_ENV: 'production' })).toBe(true)
    expect(isIndexable({ SITE_ENV: 'acceptance' })).toBe(false)
    expect(isIndexable({ SITE_ENV: 'local' })).toBe(false)
  })
})
