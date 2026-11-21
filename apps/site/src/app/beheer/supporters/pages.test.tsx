import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, supporterBlockedAddresses, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { blockedAddressHash } from '#src/fans/blocked-addresses'
import { screenNameKey } from '#src/fans/screen-name'

import SupporterPage from './[id]/page'
import { blockAccount, renameAccount, unblockAccount } from './actions'
import { forgetAddress } from './adressen/actions'
import SupportersPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

let database: TestDatabase
const ids = { editor: 0, owner: 0 }
let rotzak = 0

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.db.delete(supporterBlockedAddresses)
  await database.db.delete(supporters)
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'redacteur@example.test', 'editor', 'Ruben')
  await createAccount(database.db, 'eigenaar@example.test', 'owner', 'Eva')

  const accounts = await database.db.select().from(adminUsers)

  ids.editor = accounts.find(({ role }) => role === 'editor')?.id ?? 0
  ids.owner = accounts.find(({ role }) => role === 'owner')?.id ?? 0

  const [inserted] = await database.db.insert(supporters).values({
    createdAt: new Date('2026-11-20T10:00:00Z'),
    email: 'rotzak@example.test',
    screenName: '<b>Rotzak</b>',
    screenNameKey: 'rotzak',
  })

  rotzak = inserted.insertId
  as('editor')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

function as(role: keyof typeof ids) {
  requireRole.mockResolvedValue({ email: '', firstName: '', role, userId: ids[role] })
}

const list = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await SupportersPage({ searchParams: Promise.resolve(searchParams) }))
const one = async (id = rotzak, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await SupporterPage({ params: Promise.resolve({ id: String(id) }), searchParams: Promise.resolve(searchParams) }),
  )
const formWith = (values: Record<string, string>) => {
  const data = new FormData()

  for (const [name, value] of Object.entries(values)) {
    data.set(name, value)
  }

  return data
}

describe('the screen of the supporters', () => {
  it('asks for the owner or an editor, and tells search engines to stay away', async () => {
    requireRole.mockRejectedValue(new Error('not found'))

    await expect(list()).rejects.toThrow('not found')
    await expect(one()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it('answers not found while the accounts are off', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    await expect(list()).rejects.toThrow()
    await expect(one()).rejects.toThrow()
  })

  it('lists the accounts as text, without an address, for the owner too', async () => {
    as('owner')

    const html = await list()

    expect(html).toContain('&lt;b&gt;Rotzak&lt;/b&gt;')
    expect(html).not.toContain('<b>Rotzak')
    expect(html).not.toContain('example.test')
    expect(html).toContain('href="/beheer/supporters/' + rotzak + '"')
    expect(html).toContain('Aangemaakt op 20 november 2026')
  })

  it('finds an account by a part of its name, and says when nothing matches', async () => {
    expect(await list({ zoek: 'ROTZ' })).toContain('Rotzak')
    expect(await list({ zoek: 'zzz' })).toContain('Geen enkele schermnaam bevat dit.')
  })

  it('shows the form to let a blocked address in only to the owner', async () => {
    expect(await list()).not.toContain('Laat dit adres weer aanmelden')

    as('owner')

    expect(await list()).toContain('Laat dit adres weer aanmelden')
  })
})

describe('the page of one account', () => {
  it('never holds the address for an editor, and has it for the owner', async () => {
    expect(await one()).not.toContain('rotzak@example.test')
    expect(await one()).not.toContain('E-mailadres')

    as('owner')

    expect(await one()).toContain('rotzak@example.test')
  })

  it('has buttons that say which account they belong to', async () => {
    const html = await one()

    expect(html).toContain('Pas de naam van &lt;b&gt;Rotzak&lt;/b&gt; aan')
    expect(html).toContain('Blokkeer &lt;b&gt;Rotzak&lt;/b&gt;')
    expect(html).toContain('>Ongepaste schermnaam<')
    expect(html).toContain('>Doet zich voor als een ander<')
    expect(html).toContain('>Misbruik van een spel<')
    expect(html).toMatch(/>Anders</)
    expect(html).not.toContain('Hef de blokkade')
  })

  it('offers to lift the block of a blocked account, and says why it is blocked', async () => {
    await database.db
      .update(supporters)
      .set({ disabledAt: new Date('2026-11-21T09:00:00Z'), disabledReason: 'misbruik van een spel' })

    const html = await one()

    expect(html).toContain('Hef de blokkade van &lt;b&gt;Rotzak&lt;/b&gt; op')
    expect(html).toContain('sinds 21 november 2026: misbruik van een spel')
    expect(html).not.toContain('Blokkeer &lt;b&gt;')
  })

  it('answers not found for an account that is not there or a number that is not one', async () => {
    await expect(one(rotzak + 100)).rejects.toThrow('not found')
    await expect(one('abc' as never)).rejects.toThrow('not found')
  })
})

describe('the actions', () => {
  it('rename: shows the error of the field, or ends on the page of the account', async () => {
    expect(await renameAccount(rotzak, { value: '' }, formWith({ schermnaam: 'Redactie' }))).toEqual({
      error: 'Die naam lijkt op de club, de site of de redactie. Kies een andere.',
      value: 'Redactie',
    })
    await expect(renameAccount(rotzak, { value: '' }, formWith({ schermnaam: 'Vriendelijk' }))).rejects.toThrow(
      `redirect to /beheer/supporters/${rotzak}?gedaan=naam`,
    )
    await expect(renameAccount(rotzak + 100, { value: '' }, formWith({ schermnaam: 'Vriendelijk' }))).rejects.toThrow(
      'redirect to /beheer/supporters?fout=weg',
    )
    expect((await database.db.select().from(supporters))[0]?.screenNameKey).toBe(screenNameKey('Vriendelijk'))
  })

  it('block: needs a reason, and for "anders" an explanation, and writes a line', async () => {
    const empty = { errors: {}, values: { reden: '', toelichting: '' } }

    expect(await blockAccount(rotzak, empty, formWith({}))).toMatchObject({ errors: { reden: 'Kies een reden.' } })
    expect(await blockAccount(rotzak, empty, formWith({ reden: 'anders' }))).toMatchObject({
      errors: { toelichting: expect.any(String) as string },
    })
    await expect(blockAccount(rotzak, empty, formWith({ reden: 'misbruik' }))).rejects.toThrow(
      `redirect to /beheer/supporters/${rotzak}?gedaan=geblokkeerd`,
    )
    expect((await database.db.select().from(supporters))[0]?.disabledReason).toBe('misbruik van een spel')
    expect((await database.db.select().from(auditLog)).map(({ action, userId }) => ({ action, userId }))).toEqual([
      { action: 'supporter.block', userId: ids.editor },
    ])
  })

  it('unblock: lifts the block', async () => {
    await database.db.update(supporters).set({ disabledAt: new Date(), disabledReason: 'x' })
    await expect(unblockAccount(rotzak)).rejects.toThrow(`gedaan=vrijgegeven`)
    expect((await database.db.select().from(supporters).where(eq(supporters.id, rotzak)))[0]?.disabledAt).toBeNull()
  })

  it('refuse every action while the accounts are off, and for a role that may not', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    await expect(unblockAccount(rotzak)).rejects.toThrow('not found')
    await expect(renameAccount(rotzak, { value: '' }, formWith({ schermnaam: 'Vriendelijk' }))).rejects.toThrow(
      'not found',
    )

    vi.stubEnv('FANS_ACCOUNTS', 'on')
    requireRole.mockRejectedValue(new Error('not found'))

    await expect(unblockAccount(rotzak)).rejects.toThrow('not found')
    await expect(forgetAddress({ value: '' }, formWith({ adres: 'x@example.test' }))).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenLastCalledWith('owner')
  })

  it('forget the address: only the owner, with a line without the address', async () => {
    as('owner')
    await database.db
      .insert(supporterBlockedAddresses)
      .values({ addressHash: blockedAddressHash('rotzak@example.test'), blockedAt: new Date() })

    expect(await forgetAddress({ value: '' }, formWith({ adres: 'geen adres' }))).toMatchObject({
      error: expect.any(String) as string,
    })
    expect(await forgetAddress({ value: '' }, formWith({ adres: 'rotzak@example.test' }))).toEqual({
      done: 'removed',
      value: '',
    })
    expect(await forgetAddress({ value: '' }, formWith({ adres: 'rotzak@example.test' }))).toEqual({
      done: 'none',
      value: '',
    })
    expect(JSON.stringify(await database.db.select().from(auditLog))).not.toContain('example.test')
  })
})
