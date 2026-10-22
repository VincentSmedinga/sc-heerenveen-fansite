import { describe, expect, it } from 'vitest'

import { isIndexable, originOf, readEnv, reviewBranch } from './env'

const DATABASE_URL = 'mysql://root@127.0.0.1:3306/fansite'

describe('readEnv', () => {
  it.each(['local', 'acceptance', 'production'])('accepts SITE_ENV=%s', (siteEnv) => {
    expect(readEnv({ DATABASE_URL, SITE_ENV: siteEnv })).toEqual({ DATABASE_URL, SITE_ENV: siteEnv })
  })

  it('names a missing SITE_ENV', () => {
    expect(() => readEnv({ DATABASE_URL })).toThrow('SITE_ENV is missing')
  })

  it('treats an empty SITE_ENV as missing', () => {
    expect(() => readEnv({ DATABASE_URL, SITE_ENV: '' })).toThrow('SITE_ENV is missing')
  })

  it('rejects an unknown value without repeating it', () => {
    expect(() => readEnv({ DATABASE_URL, SITE_ENV: 'productie' })).toThrow(/SITE_ENV/)
    expect(() => readEnv({ DATABASE_URL, SITE_ENV: 'productie' })).not.toThrow(/productie/)
  })

  it('names a missing DATABASE_URL, because the site reads the source register', () => {
    expect(() => readEnv({ SITE_ENV: 'local' })).toThrow('DATABASE_URL is missing')
  })

  it('rejects a DATABASE_URL that is not for MariaDB, without repeating it', () => {
    const postgres = 'postgres://user:secret@localhost:5432/fansite'

    expect(() => readEnv({ DATABASE_URL: postgres, SITE_ENV: 'local' })).toThrow(/DATABASE_URL/)
    expect(() => readEnv({ DATABASE_URL: postgres, SITE_ENV: 'local' })).not.toThrow(/secret/)
  })
})

describe('isIndexable', () => {
  it('lets search engines in on production only', () => {
    expect(isIndexable({ SITE_ENV: 'production' })).toBe(true)
    expect(isIndexable({ SITE_ENV: 'acceptance' })).toBe(false)
    expect(isIndexable({ SITE_ENV: 'local' })).toBe(false)
  })
})

describe('originOf', () => {
  it('gives the address of each environment', () => {
    expect(originOf({ SITE_ENV: 'production' })).toBe('https://sc.heerenveen.org')
    expect(originOf({ SITE_ENV: 'acceptance' })).toBe('https://acc.sc.heerenveen.org')
    expect(originOf({ SITE_ENV: 'local' })).toBe('http://localhost:3000')
  })

  it('names a missing SITE_ENV', () => {
    expect(() => originOf({})).toThrow('SITE_ENV is missing')
  })
})

describe('reviewBranch', () => {
  it('gives the branch in the dev server', () => {
    expect(reviewBranch({ NODE_ENV: 'development', REVIEW_BRANCH: 'feat/120-bigger-type' })).toBe(
      'feat/120-bigger-type',
    )
  })

  it('gives nothing without a branch, or with an empty one', () => {
    expect(reviewBranch({ NODE_ENV: 'development' })).toBeUndefined()
    expect(reviewBranch({ NODE_ENV: 'development', REVIEW_BRANCH: '' })).toBeUndefined()
  })

  it.each(['production', 'test', undefined])('never shows the branch when NODE_ENV is %s', (nodeEnv) => {
    expect(reviewBranch({ NODE_ENV: nodeEnv, REVIEW_BRANCH: 'feat/120-bigger-type' })).toBeUndefined()
  })

  it('rejects a value that is not a branch name, without repeating it', () => {
    expect(() => reviewBranch({ NODE_ENV: 'development', REVIEW_BRANCH: '<b>x</b>' })).toThrow(/REVIEW_BRANCH/)
    expect(() => reviewBranch({ NODE_ENV: 'development', REVIEW_BRANCH: '<b>x</b>' })).not.toThrow(/<b>/)
  })
})
