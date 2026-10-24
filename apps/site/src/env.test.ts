import { describe, expect, it } from 'vitest'

import { isIndexable, originOf, readEnv, readMailEnv, reviewBranch } from './env'

const DATABASE_URL = 'mysql://root@127.0.0.1:3306/fansite'
const SMTP = {
  MAIL_FROM: 'sc Heerenveen Fansite <fansite@example.org>',
  SMTP_HOST: 'mail.example.org',
  SMTP_PASSWORD: 'geheim-wachtwoord',
  SMTP_PORT: '465',
  SMTP_USER: 'fansite@example.org',
}

describe('readEnv', () => {
  it.each(['local', 'acceptance', 'production'])('accepts SITE_ENV=%s', (siteEnv) => {
    expect(readEnv({ ...SMTP, DATABASE_URL, SITE_ENV: siteEnv })).toEqual({
      ...SMTP,
      DATABASE_URL,
      SITE_ENV: siteEnv,
      SMTP_PORT: 465,
    })
  })

  it('needs no SMTP settings on local', () => {
    expect(readEnv({ DATABASE_URL, SITE_ENV: 'local' })).toEqual({ DATABASE_URL, SITE_ENV: 'local' })
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

describe('readEnv, the mail settings', () => {
  it.each(['acceptance', 'production'])(
    'names every missing SMTP setting on %s, so the site does not start',
    (siteEnv) => {
      expect(() => readEnv({ DATABASE_URL, SITE_ENV: siteEnv })).toThrow(
        /- MAIL_FROM is missing\n- SMTP_HOST is missing\n- SMTP_PASSWORD is missing\n- SMTP_PORT is missing\n- SMTP_USER is missing/,
      )
    },
  )

  it('names the one that is missing on acceptance', () => {
    expect(() => readEnv({ ...SMTP, DATABASE_URL, SITE_ENV: 'acceptance', SMTP_PASSWORD: undefined })).toThrow(
      'SMTP_PASSWORD is missing',
    )
  })

  it('treats an empty setting as missing, as a copy of .env.example has them', () => {
    expect(() => readEnv({ ...SMTP, DATABASE_URL, SITE_ENV: 'production', SMTP_HOST: '' })).toThrow(
      'SMTP_HOST is missing',
    )
  })

  it('refuses half a set on local, because the developer would only find out when sending', () => {
    expect(() => readEnv({ DATABASE_URL, SITE_ENV: 'local', SMTP_HOST: 'mail.example.org' })).toThrow(
      'SMTP_PORT is missing',
    )
  })

  it.each(['0', '65536', '25.5', 'tweeduizend'])('rejects the port %s', (SMTP_PORT) => {
    expect(() => readEnv({ ...SMTP, DATABASE_URL, SITE_ENV: 'local', SMTP_PORT })).toThrow(/SMTP_PORT/)
  })

  it.each(['smtps://mail.example.org', 'mail.example.org:465', 'mail example.org'])(
    'rejects the host %s',
    (SMTP_HOST) => {
      expect(() => readEnv({ ...SMTP, DATABASE_URL, SITE_ENV: 'local', SMTP_HOST })).toThrow(/SMTP_HOST/)
    },
  )

  it('rejects a MAIL_FROM that is not one email address, without repeating it or the password', () => {
    const attempt = () =>
      readEnv({ ...SMTP, DATABASE_URL, MAIL_FROM: 'redactie, iemand@example.net', SITE_ENV: 'local' })

    expect(attempt).toThrow(/MAIL_FROM/)
    expect(attempt).not.toThrow(/iemand|geheim-wachtwoord/)
  })
})

describe('readMailEnv', () => {
  it('reads the settings and SITE_ENV, and not DATABASE_URL', () => {
    expect(readMailEnv({ ...SMTP, SITE_ENV: 'production' })).toEqual({
      ...SMTP,
      SITE_ENV: 'production',
      SMTP_PORT: 465,
    })
  })

  it('needs the settings on acceptance, but not on local', () => {
    expect(() => readMailEnv({ SITE_ENV: 'acceptance' })).toThrow('SMTP_HOST is missing')
    expect(readMailEnv({ SITE_ENV: 'local' })).toEqual({ SITE_ENV: 'local' })
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
