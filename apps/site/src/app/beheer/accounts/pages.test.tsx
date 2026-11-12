import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount, revokeAccount } from '#src/beheer/accounts'

import MyAccountPage, { metadata as myMetadata } from '../mijn-account/page'
import AccountPage, { metadata as accountMetadata } from './[id]/page'
import NewAccountPage, { metadata as newMetadata } from './nieuw/page'
import AccountsPage, { metadata as listMetadata } from './page'

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
const ids = { author: 0, editor: 0, owner: 0 }

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const idOf = async (email: string) =>
  (await database.db.select().from(adminUsers).where(eq(adminUsers.email, email)))[0]?.id ?? 0

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'redacteur@example.test', 'editor', 'Ruben')
  await createAccount(database.db, 'auteur@example.test', 'author', '')
  await createAccount(database.db, 'eigenaar@example.test', 'owner', 'Eva')
  ids.owner = await idOf('eigenaar@example.test')
  ids.editor = await idOf('redacteur@example.test')
  ids.author = await idOf('auteur@example.test')
  as('owner')
})

function as(role: keyof typeof ids) {
  const emails = { author: 'auteur@example.test', editor: 'redacteur@example.test', owner: 'eigenaar@example.test' }

  requireRole.mockResolvedValue({ email: emails[role], firstName: '', role, userId: ids[role] })
}

const list = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await AccountsPage({ searchParams: Promise.resolve(searchParams) }))
const form = async (id: number | string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await AccountPage({ params: Promise.resolve({ id: String(id) }), searchParams: Promise.resolve(searchParams) }),
  )
const mine = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await MyAccountPage({ searchParams: Promise.resolve(searchParams) }))

const headings = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)].map(([, level, text]) => `h${level} ${text}`)

describe('the pages of the accounts', () => {
  it.each([
    ['the list', listMetadata],
    ['the new account', newMetadata],
    ['an account', accountMetadata],
    ['my account', myMetadata],
  ])('tell search engines to stay away from %s', (_name, metadata) => {
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it.each([
    ['the list', () => list()],
    ['the new account', async () => renderToStaticMarkup(await NewAccountPage())],
    ['an account', () => form(1)],
  ])('ask for the owner: %s', async (_name, render) => {
    requireRole.mockRejectedValue(new Error('not found'))

    await expect(render()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('owner')
  })

  it('has my account for every role', async () => {
    requireRole.mockRejectedValue(new Error('not found'))

    await expect(mine()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('owner', 'editor', 'author')
  })
})

describe('the list', () => {
  it('shows the owner first, then the others, each with a link by its first name, or its address without one', async () => {
    await revokeAccount(database.db, 'auteur@example.test')

    const html = await list()

    expect(headings(html)).toEqual([
      'h1 Accounts',
      `h2 <a href="/beheer/accounts/${ids.owner}">Eva</a>`,
      `h2 <a href="/beheer/accounts/${ids.editor}">Ruben</a>`,
      `h2 <a href="/beheer/accounts/${ids.author}">auteur@example.test</a>`,
    ])
    expect(html).toContain('eigenaar@example.test · eigenaar · aan')
    expect(html).toContain('redacteur@example.test · redacteur · aan')
    expect(html).toContain('zonder voornaam · auteur · uit')
    expect(html).toContain('3 accounts.')
    expect(html).not.toMatch(/<(?:button|a)[^>]*>[^<]*verwijder/iu)
  })

  it('says an account is gone when the address says so', async () => {
    expect(await list({ fout: 'weg' })).toContain('Dit account bestaat niet')
  })
})

describe('the form of an account', () => {
  it('has a label for every field, and the role and the status for an editor or an author', async () => {
    const html = await form(ids.author)

    expect(headings(html)[0]).toBe('h1 Account wijzigen')
    expect(html).toContain('zonder voornaam, auteur, aan.')
    expect(html).toMatch(/<label[^>]*for="voornaam"[^>]*>Voornaam/u)
    expect(html).toMatch(/<label[^>]*for="adres"[^>]*>E-mailadres/u)
    expect(html).toMatch(/<legend>Rol/u)
    expect(html).toMatch(/<legend>Status/u)
    expect(html).toMatch(/<input[^>]*value="author"[^>]*checked=""|<input[^>]*checked=""[^>]*value="author"/u)
    expect(html).not.toContain('value="owner"')
  })

  it('has no role and no status for the owner, and says why', async () => {
    const html = await form(ids.owner)

    expect(html).not.toMatch(/<legend>Rol/u)
    expect(html).not.toMatch(/<legend>Status/u)
    expect(html).toContain('Dit is het account van de eigenaar.')
  })

  it('says what the last save did', async () => {
    expect(await form(ids.editor, { gedaan: 'opgeslagen' })).toContain('Opgeslagen')
    expect(await form(ids.editor, { gedaan: '<b>x</b>' })).not.toContain('<b>x</b>')
  })

  it('is "niet gevonden" for a number that is no account', async () => {
    await expect(form(999_999)).rejects.toThrow('not found')
    await expect(form('abc')).rejects.toThrow('not found')
  })
})

describe('the new account', () => {
  it('has a first name, an address and a role, and no status', async () => {
    const html = renderToStaticMarkup(await NewAccountPage())

    expect(headings(html)).toEqual(['h1 Nieuw account'])
    expect(html).toMatch(/<label[^>]*for="voornaam"/u)
    expect(html).toMatch(/<label[^>]*for="adres"/u)
    expect(html).toMatch(/<legend>Rol/u)
    expect(html).not.toMatch(/<legend>Status/u)
    expect(html).toContain('Er gaat nu geen mail uit.')
  })
})

describe('my account', () => {
  it('shows an editor his first name, address and role, and the choice for the mail, on by default', async () => {
    as('editor')

    const html = await mine()

    expect(html).toContain('<dd>Ruben</dd>')
    expect(html).toContain('<dd>redacteur@example.test</dd>')
    expect(html).toContain('<dd>redacteur</dd>')
    expect(html).toMatch(/<legend>Mail over afwijkingen van Wikipedia/u)
    expect(html).toMatch(/<input[^>]*value="aan"[^>]*checked=""|<input[^>]*checked=""[^>]*value="aan"/u)
  })

  it('shows an author his account without the choice for the mail', async () => {
    as('author')

    const html = await mine()

    expect(html).toContain('<dd>zonder voornaam</dd>')
    expect(html).toContain('<dd>auteur</dd>')
    expect(html).not.toContain('Mail over afwijkingen van Wikipedia')
  })
})
