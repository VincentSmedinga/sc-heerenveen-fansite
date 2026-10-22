import { existsSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { migrationsFolder, prepareDatabaseOnStart } from './instrumentation-node'

const prepareDatabase = vi.hoisted(() => vi.fn())

vi.mock('@fansite/db/prepare', () => ({ prepareDatabase }))

const DATABASE_URL = 'mysql://gebruiker:geheim@localhost:3306/fansite'

beforeEach(() => {
  prepareDatabase.mockResolvedValue(undefined)
  vi.spyOn(console, 'log').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.restoreAllMocks()
  prepareDatabase.mockReset()
})

describe('migrationsFolder', () => {
  it('finds the migrations from the folder of the site, where the server runs', () => {
    expect(existsSync(path.join(migrationsFolder(), 'meta/_journal.json'))).toBe(true)
  })
})

describe('prepareDatabaseOnStart', () => {
  it('migrates and seeds on acceptance', async () => {
    await prepareDatabaseOnStart({ DATABASE_URL, SITE_ENV: 'acceptance' })

    expect(prepareDatabase).toHaveBeenCalledExactlyOnceWith({
      migrationsFolder: migrationsFolder(),
      seed: true,
      url: DATABASE_URL,
    })
  })

  it.each(['local', 'production'] as const)('migrates without the seed on %s', async (siteEnv) => {
    await prepareDatabaseOnStart({ DATABASE_URL, SITE_ENV: siteEnv })

    expect(prepareDatabase).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ seed: false }))
  })

  it('logs a failure and goes on, so the site keeps running', async () => {
    const cause = new Error('connect ECONNREFUSED 127.0.0.1:3306')
    prepareDatabase.mockRejectedValue(new Error('Failed query: select 1\nparams: geheim', { cause }))

    await expect(prepareDatabaseOnStart({ DATABASE_URL, SITE_ENV: 'acceptance' })).resolves.toBeUndefined()

    const [message] = vi.mocked(console.error).mock.calls[0] ?? []

    expect(message).toContain('Could not bring the database up to date')
    expect(message).toContain('Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)')
    expect(message).not.toContain('geheim')
  })

  it('says it is done when the database is up to date', async () => {
    await prepareDatabaseOnStart({ DATABASE_URL, SITE_ENV: 'production' })

    expect(console.log).toHaveBeenCalledWith('The database is up to date.')
    expect(console.error).not.toHaveBeenCalled()
  })
})
