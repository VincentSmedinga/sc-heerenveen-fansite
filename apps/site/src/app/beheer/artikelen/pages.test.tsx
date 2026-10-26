import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '../../../beheer/accounts'
import { createArticle, saveArticle, withdrawArticle } from '../../../beheer/articles'
import ArticlePage, { metadata as articleMetadata } from './[id]/page'
import VersionPage, { metadata as versionMetadata } from './[id]/versies/[nummer]/page'
import PreviewPage, { metadata as previewMetadata } from './[id]/voorbeeld/page'
import NewArticlePage, { metadata as newMetadata } from './nieuw/page'
import ArticlesPage, { metadata as listMetadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('../../../database', () => ({ getDatabase: () => database }))
vi.mock('../../../beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM article_versions')
  await database.pool.query('DELETE FROM articles')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId })
})

const values = (overrides: Record<string, string> = {}) => ({
  adres: 'welkom',
  auteur: 'de redactie',
  intro: 'We stellen ons voor.',
  tekst: 'Een alinea met **vet**.\n\n## Een kop\n\n- punt een\n- punt twee',
  titel: 'Welkom',
  ...overrides,
})

async function addArticle(overrides: Record<string, string> = {}, publishedAt?: Date) {
  const created = await createArticle(database.db, userId, values(overrides), new Date('2026-10-20T09:00:00Z'))

  if (created.status !== 'created') {
    throw new Error('not made')
  }

  if (publishedAt !== undefined) {
    await saveArticle(database.db, userId, created.id, values(overrides), true, publishedAt)
  }

  return created.id
}

const headings = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)].map(([, level, text]) => `h${level} ${text}`)

const list = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await ArticlesPage({ searchParams: Promise.resolve(searchParams) }))
const edit = async (id: number | string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await ArticlePage({ params: Promise.resolve({ id: String(id) }), searchParams: Promise.resolve(searchParams) }),
  )
const preview = async (id: number | string) =>
  renderToStaticMarkup(await PreviewPage({ params: Promise.resolve({ id: String(id) }) }))
const version = async (id: number | string, number: number | string) =>
  renderToStaticMarkup(await VersionPage({ params: Promise.resolve({ id: String(id), nummer: String(number) }) }))

describe('every page of the articles', () => {
  it.each([
    ['the list', listMetadata],
    ['the new article', newMetadata],
    ['the article', articleMetadata],
    ['the preview', previewMetadata],
    ['a version', versionMetadata],
  ])('tells search engines to stay away from %s', (_name, metadata) => {
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it.each([
    ['the list', () => list()],
    ['the new article', async () => renderToStaticMarkup(await NewArticlePage())],
    ['the article', () => edit(1)],
    ['the preview', () => preview(1)],
    ['a version', () => version(1, 1)],
  ])('is for the beheerder and not for the moderator: %s', async (_name, render) => {
    requireRole.mockImplementation((...roles: string[]) => {
      if (!roles.includes('moderator')) {
        return Promise.reject(new Error('not found'))
      }

      return Promise.resolve({})
    })

    await expect(render()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('beheerder')
  })

  it.each([
    ['the list', () => list()],
    ['the new article', async () => renderToStaticMarkup(await NewArticlePage())],
    ['the article', () => edit(1)],
    ['the preview', () => preview(1)],
    ['a version', () => version(1, 1)],
  ])('shows nothing to somebody without a session: %s', async (_name, render) => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(render()).rejects.toThrow('redirect to /beheer/inloggen')
  })
})

describe('the list', () => {
  it('has one h1, a button that is a form with method get, and a line when there are no articles', async () => {
    const html = await list()

    expect(headings(html)).toEqual(['h1 Artikelen'])
    expect(html).toMatch(
      /<form[^>]*action="\/beheer\/artikelen\/nieuw"[^>]*method="get"|<form[^>]*method="get"[^>]*action="\/beheer\/artikelen\/nieuw"/u,
    )
    expect(html).toMatch(/<button type="submit">.*Nieuw<\/span> artikel<\/button>/u)
    expect(html).toContain('Er zijn nog geen artikelen.')
  })

  it('lists the newest first with the state, the author, a link to edit and a link to the preview with its own name', async () => {
    const first = await addArticle({ adres: 'een', titel: 'Eerste artikel' }, new Date('2026-10-21T09:00:00Z'))
    const second = await addArticle({ adres: 'twee', auteur: 'Sanne', titel: 'Tweede artikel' })
    const html = await list()

    expect(html.indexOf('Tweede artikel')).toBeLessThan(html.indexOf('Eerste artikel'))
    expect(html).toContain('Concept')
    expect(html).toContain('Gepubliceerd op 21 oktober 2026')
    expect(html).toContain('Door Sanne')
    expect(html).toContain(`<a href="/beheer/artikelen/${first}">Eerste artikel</a>`)
    expect(html).toContain(`<a href="/beheer/artikelen/${second}">Tweede artikel</a>`)
    expect(html).toMatch(
      new RegExp(
        `<a href="/beheer/artikelen/${second}/voorbeeld">Voorbeeld<span[^>]*> van “Tweede artikel”</span></a>`,
        'u',
      ),
    )
    expect(html).toContain('2 artikelen.')
  })

  it('says an article is planned when its time of publication is still to come', async () => {
    await addArticle({}, new Date('2030-05-01T09:00:00Z'))

    expect(await list()).toContain('Gepland voor 1 mei 2030')
  })

  it('escapes the title and the author', async () => {
    await addArticle({ auteur: '<img src=x onerror=alert(2)>', titel: '<script>alert(1)</script>' })

    const html = await list()

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;script&gt;')
  })

  it('says an article is gone when the address says so', async () => {
    expect(await list({ fout: 'weg' })).toContain('Dit artikel bestaat niet')
    expect(await list({ fout: '<b>x</b>' })).not.toContain('<b>x</b>')
  })
})

describe('the new article', () => {
  it('has one h1, the help with the format, the five fields with labels, and one button that saves a draft', async () => {
    const html = renderToStaticMarkup(await NewArticlePage())

    expect(requireRole).toHaveBeenCalledWith('beheerder')
    expect(headings(html)).toEqual(['h1 Nieuw artikel', 'h2 Zo schrijf je de tekst'])

    for (const [name, label] of [
      ['titel', 'Titel'],
      ['adres', 'Adres'],
      ['intro', 'Intro'],
      ['tekst', 'Tekst'],
      ['auteur', 'Auteur'],
    ]) {
      expect(html, name).toMatch(new RegExp(`<label[^>]*for="${name}"[^>]*>${label}`, 'u'))
      expect(html, name).toMatch(new RegExp(`<(?:input|textarea)[^>]*name="${name}"`, 'u'))
    }

    expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual(['<button type="submit">Opslaan als concept</button>'])
    expect(html).toContain('de redactie')
    expect(html).toContain('Hoogstens 20.000 tekens')
    expect(html).not.toContain('Er is iets mis')
  })

  it('names every part of the format with an example', async () => {
    const html = renderToStaticMarkup(await NewArticlePage())

    for (const part of [
      '“## Wie zijn wij”',
      '“- Nieuws”',
      '“**dit is vet**”',
      '“*dit is cursief*”',
      '[de Leeuwarder Courant](https://www.lc.nl)',
    ]) {
      expect(html).toContain(part)
    }
  })
})

describe('the article', () => {
  it('shows a draft with its values, the buttons Opslaan then Publiceren, a link to the preview and no Intrekken', async () => {
    const id = await addArticle()
    const html = await edit(id)

    expect(headings(html)).toEqual([
      'h1 Artikel bewerken',
      'h2 Zo schrijf je de tekst',
      'h2 Eerdere versies',
      `h3 <a href="/beheer/artikelen/${id}/versies/1">Versie 1</a>`,
    ])
    expect(html).toContain('Dit artikel is een concept. Het staat nergens op de site.')
    expect(html).toContain(`<a href="/beheer/artikelen/${id}/voorbeeld">Voorbeeld</a>`)
    expect(html).toMatch(/<input[^>]*name="titel"[^>]*value="Welkom"|<input[^>]*value="Welkom"[^>]*name="titel"/u)
    expect(html).toMatch(/<textarea[^>]*name="tekst"[^>]*>Een alinea met \*\*vet\*\*\./u)
    expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual([
      '<button type="submit">Opslaan</button>',
      '<button class="hf-button-soft" type="submit" value="publiceren" name="knop">Publiceren</button>',
    ])
    expect(html).not.toContain('readonly')
  })

  it('shows a published article with a read-only address, Opslaan, and a card to withdraw it', async () => {
    const id = await addArticle({}, new Date('2026-10-21T09:00:00Z'))
    const html = await edit(id)

    expect(headings(html)).toEqual([
      'h1 Artikel bewerken',
      'h2 Zo schrijf je de tekst',
      'h2 Van de site halen',
      'h2 Eerdere versies',
      `h3 <a href="/beheer/artikelen/${id}/versies/1">Versie 1</a>`,
    ])
    expect(html).toContain('staat sinds 21 oktober 2026 op de site')
    expect(html).toMatch(/<input[^>]*name="adres"[^>]*readOnly=""|<input[^>]*readOnly=""[^>]*name="adres"/u)
    expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual([
      '<button type="submit">Opslaan</button>',
      '<button class="hf-button-soft" type="submit">Intrekken</button>',
    ])
  })

  it('has the text with its blank lines and special characters in the field as they were stored', async () => {
    const tekst = 'Eén “alinea” & <b>niet vet</b>\n\n\n- [de LC](https://www.lc.nl/a?b=1&c=2)'
    const id = await addArticle({ tekst })
    const html = await edit(id)

    expect(html).toContain(
      'Eén “alinea” &amp; &lt;b&gt;niet vet&lt;/b&gt;\n\n\n- [de LC](https://www.lc.nl/a?b=1&amp;c=2)',
    )
  })

  it('says "niet gevonden" for a number that is no article, and for one that is not a number', async () => {
    await expect(edit(99_999)).rejects.toThrow('not found')
    await expect(edit('abc')).rejects.toThrow('not found')
    await expect(edit('0')).rejects.toThrow('not found')
    await expect(edit('1e3')).rejects.toThrow('not found')
  })

  it('tells what the last action did only when the article is in that state', async () => {
    const draftId = await addArticle({ adres: 'concept', titel: 'Concept' })
    const liveId = await addArticle({ adres: 'live', titel: 'Live' }, new Date('2026-10-21T09:00:00Z'))

    expect(await edit(liveId, { gedaan: 'gepubliceerd' })).toContain('Het artikel staat nu op de site')
    expect(await edit(draftId, { gedaan: 'gepubliceerd' })).not.toContain('Gepubliceerd</h2>')
    expect(await edit(draftId, { gedaan: 'ingetrokken' })).toContain('Ingetrokken')
    expect(await edit(liveId, { gedaan: 'ingetrokken' })).not.toContain('Ingetrokken</h2>')
    expect(await edit(liveId, { gedaan: 'al-gepubliceerd' })).toContain('Het artikel stond al op de site')
    expect(await edit(draftId, { gedaan: 'al-gepubliceerd' })).not.toContain('Al gepubliceerd')
    expect(await edit(draftId, { gedaan: 'al-ingetrokken' })).toContain('Het artikel was al een concept')
    expect(await edit(liveId, { gedaan: 'al-ingetrokken' })).not.toContain('Al ingetrokken')
    expect(await edit(draftId, { gedaan: 'ongewijzigd' })).toContain('Niets veranderd')
  })

  it('tells a save or a new draft only for a few minutes, by the time of the article itself', async () => {
    const id = await addArticle()

    // The draft was made in 2026-10-20, long before now: the notice would be a claim about a
    // moment that is gone.
    expect(await edit(id, { gedaan: 'gemaakt' })).not.toContain('Concept gemaakt')
    expect(await edit(id, { gedaan: 'opgeslagen' })).not.toContain('Opgeslagen</h2>')

    await database.pool.query('UPDATE articles SET created_at = UTC_TIMESTAMP(), updated_at = UTC_TIMESTAMP()')

    expect(await edit(id, { gedaan: 'gemaakt' })).toContain('Concept gemaakt')
    expect(await edit(id, { gedaan: 'opgeslagen' })).toContain('Opgeslagen')
  })

  it('does not repeat what the address says, so a made-up address can write nothing on the page', async () => {
    const id = await addArticle()
    const html = await edit(id, { gedaan: '<script>alert(1)</script>' })

    expect(html).not.toContain('alert(1)')
    expect(html).not.toContain('<h2 id="gedaan-kop"')
  })

  it('shows a withdrawn article as a draft again', async () => {
    const id = await addArticle({}, new Date('2026-10-21T09:00:00Z'))

    await withdrawArticle(database.db, userId, id)

    const html = await edit(id)

    expect(html).toContain('Dit artikel is een concept')
    expect(html).not.toContain('Intrekken')
  })
})

describe('the preview', () => {
  it('shows a draft the way the page of an article does: the title as the h1, the author, a date, the intro and the text', async () => {
    const id = await addArticle()
    const html = await preview(id)

    expect(headings(html).filter((heading) => heading.startsWith('h1'))).toEqual(['h1 Welkom'])
    expect(html).toContain('Door de redactie')
    expect(html).toMatch(/<time dateTime="\d{4}-\d{2}-\d{2}">/u)
    expect(html).toContain('We stellen ons voor.')
    expect(html).toContain('<strong>vet</strong>')
    expect(html).toContain('<li>punt twee</li>')
    expect(html).toContain('Dit artikel is een concept.')
    expect(html).toContain(`<a href="/beheer/artikelen/${id}">Terug naar het formulier</a>`)
    expect(html).toMatch(/<article/u)
  })

  it('shows the date of publication for an article that is live, and says where visitors see it', async () => {
    const id = await addArticle({}, new Date('2026-10-21T09:00:00Z'))
    const html = await preview(id)

    expect(html).toContain('<time dateTime="2026-10-21">21 oktober 2026</time>')
    expect(html).toContain('Zo ziet een bezoeker dit artikel op /redactie/welkom.')
  })

  it('turns the text into elements and shows HTML, a script address and a link without https as text', async () => {
    const id = await addArticle({
      tekst:
        '<script>alert(1)</script> en <b>vet</b>\n\n[boos](javascript:alert(2)) [zonder](www.lc.nl) [goed](https://www.lc.nl/sport) [ons](/bronnen)',
    })
    const html = await preview(id)

    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>vet</b>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('href="javascript:')
    expect(html).not.toContain('href="www.lc.nl"')
    expect(html).toContain('href="https://www.lc.nl/sport"')
    expect(html).toContain('href="/bronnen"')
  })

  it('says "niet gevonden" for a number that is no article', async () => {
    await expect(preview(99_999)).rejects.toThrow('not found')
    await expect(preview('abc')).rejects.toThrow('not found')
  })
})

describe('the earlier versions on the page of the article', () => {
  async function editedArticle() {
    const id = await addArticle()

    await createAccount(database.db, 'jelle@example.org', 'beheerder')

    const other = (await database.db.select().from(adminUsers)).find((user) => user.email === 'jelle@example.org')

    await saveArticle(
      database.db,
      other?.id ?? 0,
      id,
      values({ tekst: 'Tweede tekst' }),
      false,
      new Date('2026-10-24T08:05:00Z'),
    )
    await saveArticle(
      database.db,
      userId,
      id,
      values({ tekst: 'Derde tekst' }),
      false,
      new Date('2026-10-25T10:30:00Z'),
    )

    return id
  }

  it('lists every version under the form, the newest first and marked as current, with time and account', async () => {
    const id = await editedArticle()
    const html = await edit(id)

    expect(headings(html).slice(-4)).toEqual([
      'h2 Eerdere versies',
      `h3 <a href="/beheer/artikelen/${id}/versies/3">Versie 3</a>`,
      `h3 <a href="/beheer/artikelen/${id}/versies/2">Versie 2</a>`,
      `h3 <a href="/beheer/artikelen/${id}/versies/1">Versie 1</a>`,
    ])
    expect(html.indexOf('Eerdere versies')).toBeGreaterThan(html.indexOf('<form'))
    expect(html).toContain('Huidige versie · 25 oktober 2026 om 11:30 · sanne@example.org')
    expect(html).toContain('24 oktober 2026 om 10:05 · jelle@example.org')
    expect(html).toContain('20 oktober 2026 om 11:00 · sanne@example.org')
    expect(html.match(/Huidige versie/gu)).toHaveLength(1)
  })

  it('shows no button to put a version back or to delete one', async () => {
    const html = await edit(await editedArticle())

    expect(html.match(/<button[^>]*>(.*?)<\/button>/g)).toEqual([
      '<button type="submit">Opslaan</button>',
      '<button class="hf-button-soft" type="submit" value="publiceren" name="knop">Publiceren</button>',
    ])
    expect(html).not.toMatch(/terugzetten|verwijder/iu)
  })

  it('says there is no version for an article that only SQL made, instead of showing an empty list', async () => {
    const id = await addArticle()

    await database.pool.query('DELETE FROM article_versions')

    const html = await edit(id)

    expect(html).toContain('Van dit artikel is nog geen versie bewaard.')
    expect(html).not.toContain('Huidige versie')
  })

  it('escapes the address of the account', async () => {
    const id = await addArticle()

    await database.pool.query("UPDATE admin_users SET email = '<b>x</b>@example.org'")

    const html = await edit(id)

    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;@example.org')
  })
})

describe('the page of a version', () => {
  async function editedArticle() {
    const id = await addArticle({ tekst: 'Eerste tekst met **vet**.', titel: 'Eerste titel' })

    await saveArticle(
      database.db,
      userId,
      id,
      values({ tekst: 'Tweede tekst.', titel: 'Tweede titel' }),
      false,
      new Date('2026-10-25T10:30:00Z'),
    )

    return id
  }

  it('shows an earlier version the way a visitor would see it, with its facts above it', async () => {
    const id = await editedArticle()
    const html = await version(id, 1)

    expect(headings(html)).toEqual(['h2 Versie 1', 'h1 Eerste titel'])
    expect(html).toContain('Bewaard op 20 oktober 2026 om 11:00 door sanne@example.org.')
    expect(html).toContain('Dit is een eerdere versie. Het artikel is daarna veranderd.')
    expect(html).toContain('Het adres van deze versie was /redactie/welkom.')
    expect(html).toContain('<strong>vet</strong>')
    expect(html).toContain('We stellen ons voor.')
    expect(html).toContain('Door de redactie')
    expect(html).toContain(`<a href="/beheer/artikelen/${id}">Terug naar het formulier</a>`)
    expect(html).toMatch(/<article/u)
    expect(html).not.toContain('Tweede tekst.')
  })

  it('says the newest version is the current one, and shows the text of the article', async () => {
    const id = await editedArticle()
    const html = await version(id, 2)

    expect(headings(html)).toEqual(['h2 Versie 2', 'h1 Tweede titel'])
    expect(html).toContain('Bewaard op 25 oktober 2026 om 11:30 door sanne@example.org.')
    expect(html).toContain('Dit is de huidige versie')
    expect(html).toContain('Het adres van deze versie is /redactie/welkom.')
    expect(html).not.toContain('was /redactie/')
    expect(html).toContain('Tweede tekst.')
  })

  it('shows the date of publication of the article, or today for a draft', async () => {
    const draftId = await editedArticle()
    expect(await version(draftId, 1)).toMatch(/<time dateTime="\d{4}-\d{2}-\d{2}">/u)

    const liveId = await addArticle({ adres: 'live', titel: 'Live' }, new Date('2026-10-21T09:00:00Z'))

    expect(await version(liveId, 1)).toContain('<time dateTime="2026-10-21">21 oktober 2026</time>')
  })

  it('turns the text into elements and shows HTML and a script address as text', async () => {
    const id = await addArticle({
      tekst: '<script>alert(1)</script>\n\n[boos](javascript:alert(2)) [goed](https://www.lc.nl/sport)',
    })
    const html = await version(id, 1)

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(html).not.toContain('href="javascript:')
    expect(html).toContain('href="https://www.lc.nl/sport"')
  })

  it('says "niet gevonden" for an article that is none, a number the article never had, and what is no number', async () => {
    const id = await editedArticle()
    const other = await addArticle({ adres: 'andere', titel: 'Andere' })

    await expect(version(99_999, 1)).rejects.toThrow('not found')
    await expect(version(id, 3)).rejects.toThrow('not found')
    await expect(version(id, 0)).rejects.toThrow('not found')
    await expect(version(id, 'abc')).rejects.toThrow('not found')
    await expect(version(id, '1e3')).rejects.toThrow('not found')
    await expect(version('abc', 1)).rejects.toThrow('not found')
    await expect(version(other, 2)).rejects.toThrow('not found')
  })
})
