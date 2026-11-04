import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, articles, articleVersions, auditLog } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { type ArticleDocument, serialiseArticleDocument } from '@fansite/shared/article-document'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount, revokeAccount } from '#src/beheer/accounts'
import { emptyValues } from '#src/beheer/article-fields'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitArticle, submitNewArticle, submitWithdraw } from './actions'

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }))

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))
vi.mock('#src/database', () => ({ getDatabase: () => database }))

let database: TestDatabase
let userId: number
let moderatorId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM article_versions')
  await database.pool.query('DELETE FROM articles')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org')))[0]?.id ?? 0
  moderatorId =
    (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))
})

/** The JSON of the editor for a text of one paragraph. */
const json = (text: string) =>
  serialiseArticleDocument({
    content: [{ content: [{ text, type: 'text' }], type: 'paragraph' }],
    type: 'doc',
  } as unknown as ArticleDocument)

const fields = (overrides: Record<string, string> = {}) => {
  const formData = new FormData()

  for (const [name, value] of Object.entries({
    adres: 'welkom',
    auteur: 'de redactie',
    intro: 'We stellen ons voor.',
    tekst: json('Een alinea.'),
    titel: 'Welkom',
    ...overrides,
  })) {
    formData.set(name, value)
  }

  return formData
}

/** What an action returned, or where it redirected to. */
async function resultOf<T>(action: () => Promise<T>): Promise<T | { redirect: string }> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof Redirect) {
      return { redirect: error.url }
    }

    throw error
  }
}

const initial = { errors: {}, values: emptyValues }
const create = (overrides?: Record<string, string>) => resultOf(() => submitNewArticle(initial, fields(overrides)))
const save = (id: unknown, overrides?: Record<string, string>) =>
  resultOf(() => submitArticle(id as number, initial, fields(overrides)))
const withdraw = (id: unknown) => resultOf(() => submitWithdraw(id as number))

const stored = async () => database.db.select().from(articles).orderBy(articles.id)
const log = () => database.db.select().from(auditLog).orderBy(auditLog.id)
const versions = () => database.db.select().from(articleVersions).orderBy(articleVersions.id)

/** Makes a draft and returns its number. */
async function draft(overrides?: Record<string, string>) {
  await create(overrides)

  return (await stored()).at(-1)?.id ?? 0
}

describe('submitNewArticle', () => {
  it('stores a draft for the account of the session and leads to its page', async () => {
    expect(await create()).toMatchObject({
      redirect: expect.stringMatching(/^\/beheer\/artikelen\/\d+\?gedaan=gemaakt$/u),
    })
    expect(await stored()).toMatchObject([{ createdBy: userId, publishedAt: null, slug: 'welkom', title: 'Welkom' }])
    expect(await log()).toMatchObject([{ action: 'article.create', itemId: (await stored())[0]?.id, userId }])
  })

  it('takes the account from the session and never from the form', async () => {
    await create({
      createdBy: String(moderatorId),
      savedBy: String(moderatorId),
      updatedBy: String(moderatorId),
      userId: String(moderatorId),
    })

    expect((await stored())[0]).toMatchObject({ createdBy: userId, updatedBy: userId })
    expect(await versions()).toMatchObject([{ savedBy: userId, version: 1 }])
    expect((await log())[0]?.userId).toBe(userId)
  })

  it('returns the form with the errors and the values, and stores nothing, for fields that are wrong', async () => {
    const result = await create({ adres: 'Fout Adres', tekst: json('Wel ingevulde tekst'), titel: '' })

    expect(result).toMatchObject({
      errors: { adres: expect.stringContaining('kleine letters'), titel: 'Schrijf een titel.' },
      values: { adres: 'Fout Adres', tekst: json('Wel ingevulde tekst'), titel: '' },
    })
    expect(await stored()).toEqual([])
    expect(await log()).toEqual([])
  })

  it('proposes the address from the title when it is empty', async () => {
    await create({ adres: '', titel: 'Wij zijn terug!' })

    expect((await stored())[0]?.slug).toBe('wij-zijn-terug')
  })

  it('returns the form with an error at the address when another article has it', async () => {
    await create()

    expect(await create({ titel: 'Anders' })).toMatchObject({
      errors: { adres: 'Een ander artikel heeft dit adres al. Kies een ander adres.' },
      values: { titel: 'Anders' },
    })
    expect(await stored()).toHaveLength(1)
    expect(await log()).toHaveLength(1)
  })

  it('keeps a text that is too long in the values it returns, so nothing the editor wrote is lost', async () => {
    const tekst = json('x'.repeat(20_001))
    const result = await create({ tekst })

    expect(result).toMatchObject({ errors: { tekst: expect.stringContaining('20.000') }, values: { tekst } })
    expect(await stored()).toEqual([])
  })
})

describe('the text of an article', () => {
  const link = (href: string) =>
    JSON.stringify({
      content: [
        { content: [{ marks: [{ attrs: { href }, type: 'link' }], text: 'x', type: 'text' }], type: 'paragraph' },
      ],
      type: 'doc',
    })

  it.each([
    ['a script as text in a node of its own', '{"type":"doc","content":[{"type":"script","content":[]}]}'],
    ['an image', '{"type":"doc","content":[{"type":"image","attrs":{"src":"https://www.lc.nl/foto.jpg"}}]}'],
    ['a link to javascript:', link('javascript:alert(1)')],
    ['a link to //evil.example', link('//evil.example')],
    ['a link to http://', link('http://www.lc.nl')],
    ['a very deep nesting', `{"type":"doc","content":${'[{"type":"bulletList","content":'.repeat(5000)}[]`],
    ['a million characters', json('a'.repeat(1_000_000))],
    ['something that is no JSON', '<script>alert(1)</script>'],
  ])('is refused, with %s, at the field with the value kept, and nothing is stored', async (_name, tekst) => {
    const result = await create({ tekst })

    expect(result).toMatchObject({ errors: { tekst: expect.any(String) }, values: { tekst } })
    expect(await stored()).toEqual([])
    expect(await log()).toEqual([])
  })

  it('is refused when a save of an existing article has it, and the article stays as it was', async () => {
    const id = await draft()
    const result = await save(id, { tekst: link('javascript:alert(1)') })

    expect(result).toMatchObject({ errors: { tekst: expect.stringContaining('Een link wijst naar een adres') } })
    expect(await stored()).toMatchObject([{ body: json('Een alinea.') }])
    expect(await versions()).toHaveLength(1)
  })

  it('is stored as the JSON that was checked, with a mark of the editor in the fixed order', async () => {
    const id = await draft({
      tekst:
        '{"content":[{"content":[{"marks":[{"type":"bold"}],"text":"Vet","type":"text"}],"type":"paragraph"}],"type":"doc"}',
    })

    expect((await stored()).find((row) => row.id === id)?.body).toBe(
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"}],"text":"Vet"}]}]}',
    )
  })

  it('never ends up in the log', async () => {
    await create({ tekst: json('GEHEIME-TEKST') })

    expect(JSON.stringify(await log())).not.toContain('GEHEIME-TEKST')
  })
})

describe('submitArticle', () => {
  it('saves the fields, stays a draft and leads to the page with a notice', async () => {
    const id = await draft()

    expect(await save(id, { tekst: json('Nieuwe tekst') })).toEqual({
      redirect: `/beheer/artikelen/${id}?gedaan=opgeslagen`,
    })
    expect((await stored())[0]).toMatchObject({ body: json('Nieuwe tekst'), publishedAt: null })
    expect((await log()).map((row) => row.action)).toEqual(['article.create', 'article.update'])
    expect(await versions()).toMatchObject([
      { body: json('Een alinea.'), version: 1 },
      { body: json('Nieuwe tekst'), savedBy: userId, version: 2 },
    ])
  })

  it('says nothing was changed when nothing was, and writes nothing', async () => {
    const id = await draft()

    expect(await save(id)).toEqual({ redirect: `/beheer/artikelen/${id}?gedaan=ongewijzigd` })
    expect(await log()).toHaveLength(1)
    expect(await versions()).toHaveLength(1)
  })

  it('publishes what is on the screen when the button Publiceren was pressed', async () => {
    const id = await draft()
    const formData = fields({ tekst: json('Laatste versie') })

    formData.set('knop', 'publiceren')

    expect(await resultOf(() => submitArticle(id, initial, formData))).toEqual({
      redirect: `/beheer/artikelen/${id}?gedaan=gepubliceerd`,
    })
    expect((await stored())[0]).toMatchObject({ body: json('Laatste versie'), publishedAt: expect.any(Date) })
    expect((await log()).map((row) => row.action)).toEqual(['article.create', 'article.update', 'article.publish'])
  })

  it('says it was published already for a second click, and writes no second publish line', async () => {
    const id = await draft()
    const publish = () => {
      const formData = fields()

      formData.set('knop', 'publiceren')

      return resultOf(() => submitArticle(id, initial, formData))
    }

    expect(await publish()).toEqual({ redirect: `/beheer/artikelen/${id}?gedaan=gepubliceerd` })
    expect(await publish()).toEqual({ redirect: `/beheer/artikelen/${id}?gedaan=al-gepubliceerd` })
    expect((await log()).filter((row) => row.action === 'article.publish')).toHaveLength(1)
  })

  it('refuses a new address for a published article, with the error at the field and the values kept', async () => {
    const id = await draft()
    const formData = fields()

    formData.set('knop', 'publiceren')
    await resultOf(() => submitArticle(id, initial, formData))

    expect(await save(id, { adres: 'ander-adres', tekst: json('Nog een wijziging') })).toMatchObject({
      errors: { adres: expect.stringContaining('kan niet meer veranderen') },
      values: { adres: 'ander-adres', tekst: json('Nog een wijziging') },
    })
    expect((await stored())[0]).toMatchObject({ body: json('Een alinea.'), slug: 'welkom' })
  })

  it('returns the errors for fields that are wrong and stores nothing', async () => {
    const id = await draft()

    expect(await save(id, { intro: 'x'.repeat(301) })).toMatchObject({
      errors: { intro: expect.stringContaining('hoogstens 300') },
    })
    expect(await log()).toHaveLength(1)
  })

  it.each([0, -1, 1.5, '1e3', 'abc', undefined, null, {}])('refuses %j as an article', async (id) => {
    expect(await save(id)).toEqual({ redirect: '/beheer/artikelen?fout=weg' })
    expect(await log()).toEqual([])
  })

  it('says so for an article that does not exist', async () => {
    expect(await save(99_999)).toEqual({ redirect: '/beheer/artikelen?fout=weg' })
    expect(await stored()).toEqual([])
  })
})

describe('submitWithdraw', () => {
  it('makes a published article a draft, writes the log and leads to its page', async () => {
    const id = await draft()
    const formData = fields()

    formData.set('knop', 'publiceren')
    await resultOf(() => submitArticle(id, initial, formData))

    expect(await withdraw(id)).toEqual({ redirect: `/beheer/artikelen/${id}?gedaan=ingetrokken` })
    expect((await stored())[0]?.publishedAt).toBeNull()
    expect((await log()).map((row) => row.action)).toEqual(['article.create', 'article.publish', 'article.unpublish'])
  })

  it('says it was a draft already for a second click, and writes nothing', async () => {
    const id = await draft()

    expect(await withdraw(id)).toEqual({ redirect: `/beheer/artikelen/${id}?gedaan=al-ingetrokken` })
    expect(await log()).toHaveLength(1)
  })

  it.each([0, 'abc', undefined])('refuses %j as an article', async (id) => {
    expect(await withdraw(id)).toEqual({ redirect: '/beheer/artikelen?fout=weg' })
  })

  it('says so for an article that does not exist', async () => {
    expect(await withdraw(99_999)).toEqual({ redirect: '/beheer/artikelen?fout=weg' })
  })
})

describe('who may call the actions', () => {
  it('refuses a moderator, who may not write articles, before it reads the form, and changes nothing', async () => {
    const id = await draft()

    jar.set(sessionCookieName, await startSession(database.db, moderatorId))

    await expect(create({ adres: 'ander' })).rejects.toThrow('not found')
    await expect(save(id, { tekst: json('Gekraakt') })).rejects.toThrow('not found')
    await expect(withdraw(id)).rejects.toThrow('not found')
    expect(await stored()).toMatchObject([{ body: json('Een alinea.') }])
    expect(await log()).toHaveLength(1)
    expect(await versions()).toHaveLength(1)
  })

  it('sends a call without a session, and one with a session that ended, to the login page', async () => {
    jar.clear()
    expect(await create()).toEqual({ redirect: '/beheer/inloggen' })

    jar.set(sessionCookieName, 'x'.repeat(43))
    expect(await save(1)).toEqual({ redirect: '/beheer/inloggen' })
    expect(await withdraw(1)).toEqual({ redirect: '/beheer/inloggen' })
    expect(await stored()).toEqual([])
  })

  it('sends an account that was turned off to the login page', async () => {
    await revokeAccount(database.db, 'sanne@example.org')

    expect(await create()).toEqual({ redirect: '/beheer/inloggen' })
    expect(await stored()).toEqual([])
  })
})
