import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, items } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '../../../beheer/accounts'
import { hideItem } from '../../../beheer/items'
import { addItem, addSource } from '../../../beheer/test-items'
import ItemsPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('../../../database', () => ({ getDatabase: () => database }))
vi.mock('../../../beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

let database: TestDatabase
let userId: number
let ids: Awaited<ReturnType<typeof addSource>>

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM sources')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'jelle@example.org', role: 'moderator', userId })
  ids = await addSource(database)
})

const render = async (searchParams: Record<string, string | string[]> = {}) =>
  renderToStaticMarkup(await ItemsPage({ searchParams: Promise.resolve(searchParams) }))

const headings = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)].map(([, level, text]) => `h${level} ${text}`)

/** The buttons of the items; the first button of the page is the search. */
const buttons = (html: string) => (html.match(/<button[^>]*>(.*?)<\/button>/g) ?? []).slice(1)

const hasButton = (html: string, name: string, text: string) =>
  new RegExp(`<button[^>]*aria-label="${name}"[^>]*>${text}</button>`).test(html)

describe('the page', () => {
  it('is for the beheerder and the moderator, and tells search engines to stay away', async () => {
    await render()

    expect(requireRole).toHaveBeenCalledWith('beheerder', 'moderator')
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it('shows nothing to somebody without a session', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(render()).rejects.toThrow('redirect to /beheer/inloggen')
  })

  it('has one h1, names the three examples of a reason, and says when the item is gone from the site', async () => {
    const html = await render()

    expect(headings(html)).toEqual(['h1 Berichten'])
    expect(html).toContain('“Fout in het bericht”, “Past niet bij de site” of “Op verzoek van de bron”')
    expect(html).toContain('hoogstens 300 tekens')
    expect(html).toContain('binnen vijf minuten niet meer op de site')
    expect(html).toContain('Er zijn nog geen berichten.')
  })

  it('has a search that is a form with method get, so it works without JavaScript', async () => {
    const html = await render()

    expect(html).toMatch(
      /<form[^>]*action="\/beheer\/berichten"[^>]*method="get"|<form[^>]*method="get"[^>]*action="\/beheer\/berichten"/,
    )
    expect(html).toMatch(/<label[^>]*for="zoek"[^>]*>Zoeken/)
    expect(html).toMatch(/<input[^>]*name="q"/)
    expect(html).toMatch(/<input[^>]*type="search"/)
  })
})

describe('the list', () => {
  it('shows the items newest first, each with its source, its headline as a link and its time', async () => {
    await addItem(database, ids, 'oud', { publishedAt: new Date('2025-01-02T08:00:00Z') })
    await addItem(database, ids, 'nieuw', {
      publishedAt: new Date('2025-02-03T08:00:00Z'),
      url: 'https://krant.test/nieuw',
    })

    const html = await render()

    expect(html.indexOf('Kop nieuw')).toBeGreaterThan(-1)
    expect(html.indexOf('Kop nieuw')).toBeLessThan(html.indexOf('Kop oud'))
    expect(html).toMatch(/<a [^>]*href="https:\/\/krant\.test\/nieuw"[^>]*>Kop nieuw<\/a>/)
    expect(html).toContain('krant.test')
    expect(html).toContain('<time')
    expect(html).toContain('dateTime="2025-02-03T08:00:00.000Z"')
    expect(html).toContain('2 berichten.')
  })

  it('gives each item that is shown a field for the reason and a button Verberg that names the item', async () => {
    const id = await addItem(database, ids, 'een')
    const html = await render()

    expect(html).toMatch(new RegExp(`<label[^>]*for="reden-${id}"[^>]*>Reden`))
    expect(html).toMatch(new RegExp(`<input[^>]*id="reden-${id}"`))
    expect(html).toMatch(/<input[^>]*name="reden"/)
    expect(html).toMatch(/<input[^>]*maxLength="300"/)
    expect(html).toMatch(/<input[^>]*required/)
    expect(hasButton(html, 'Verberg: Kop een', 'Verberg')).toBe(true)
    expect(buttons(html)).toHaveLength(1)
  })

  it('says of a hidden item that it is hidden, since when and why, and has a button Toon weer instead', async () => {
    const id = await addItem(database, ids, 'een')

    await hideItem(database.db, userId, id, 'Op verzoek van de bron')

    const html = await render()

    expect(html).toContain('verborgen')
    expect(html).toMatch(/Verborgen op [^<]*\. Reden: (<!-- -->)?Op verzoek van de bron/)
    expect(hasButton(html, 'Toon weer: Kop een', 'Toon weer')).toBe(true)
    expect(buttons(html)).toHaveLength(1)
    expect(html).not.toContain('for="reden-')
    expect(html).toContain('1 bericht.')
  })

  it('shows what comes from outside as text and never as markup: headline, reason, source and search', async () => {
    const id = await addItem(database, ids, 'een', { title: '<img src=x onerror=alert(1)>' })

    await hideItem(database.db, userId, id, '<script>alert(2)</script>')

    const html = await render({ q: '"><script>alert(3)</script>' })

    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('onerror=alert')
    expect(html).toContain('Geen berichten gevonden met')
  })

  it('shows the headline and the reason escaped when they are found', async () => {
    const id = await addItem(database, ids, 'een', { title: 'Kop <b>vet</b> & meer' })

    await hideItem(database.db, userId, id, 'Reden <i>schuin</i>')

    const html = await render()

    expect(html).not.toContain('<b>vet')
    expect(html).not.toContain('<i>schuin')
    expect(html).toContain('Kop &lt;b&gt;vet&lt;/b&gt; &amp; meer')
    expect(html).toContain('Reden &lt;i&gt;schuin&lt;/i&gt;')
  })

  it('shows the 50 newest and says so', async () => {
    for (let number = 0; number < 55; number++) {
      await addItem(database, ids, `k${number}`, { publishedAt: new Date(Date.UTC(2026, 9, 1, 0, number)) })
    }

    const html = await render()

    expect(html.match(/<li>/g)).toHaveLength(50)
    expect(html).toContain('De nieuwste 50 berichten.')
  })
})

describe('the search', () => {
  beforeEach(async () => {
    await addItem(database, ids, 'a', { title: 'Heerenveen wint van Ajax' })
    await addItem(database, ids, 'b', { title: 'Bestuur kiest nieuwe voorzitter' })
  })

  it('shows the items that match, keeps the text in the field, and has a link to all items', async () => {
    const html = await render({ q: 'wint' })

    expect(html).toContain('Heerenveen wint van Ajax')
    expect(html).not.toContain('Bestuur kiest')
    expect(html).toMatch(/<input[^>]*value="wint"/)
    expect(html).toContain('1 bericht met “wint”.')
    expect(html).toContain('<a href="/beheer/berichten">Toon alle berichten</a>')
  })

  it('says when nothing matches', async () => {
    expect(await render({ q: 'bestaat niet' })).toContain('Geen berichten gevonden met “bestaat niet”.')
  })

  it('ignores a search that is given twice', async () => {
    expect(await render({ q: ['wint', 'voorzitter'] })).toContain('2 berichten.')
  })
})

describe('what the last action left', () => {
  it('shows the error in the summary and at the field of the item', async () => {
    const id = await addItem(database, ids, 'een')
    const html = await render({ bericht: String(id), fout: 'reden-leeg' })
    const message = 'Schrijf een reden, bijvoorbeeld “Fout in het bericht”.'

    expect(headings(html)).toEqual(['h1 Berichten', 'h2 Er is iets mis'])
    expect(html).toContain(`<a href="#reden-${id}">${message}</a>`)
    expect(html).toMatch(
      new RegExp(
        `<input[^>]*id="reden-${id}"[^>]*aria-invalid="true"|<input[^>]*aria-invalid="true"[^>]*id="reden-${id}"`,
      ),
    )
    expect(html.split(message)).toHaveLength(3)
  })

  it('shows the error of a reason that is too long', async () => {
    const id = await addItem(database, ids, 'een')

    expect(await render({ bericht: String(id), fout: 'reden-lang' })).toContain(
      'Schrijf een kortere reden, van hoogstens 300 tekens.',
    )
  })

  it('tells an error about an item that is not in the list as a notice without a link', async () => {
    await addItem(database, ids, 'een')

    const html = await render({ bericht: '99999', fout: 'reden-leeg' })

    expect(html).toContain('Het verbergen is niet gelukt')
    expect(html).not.toContain('href="#reden-')
    expect(html).not.toContain('aria-invalid')
  })

  it('shows no error for a name it does not know, and does not repeat what the address says', async () => {
    const html = await render({ fout: '<script>alert(1)</script>' })

    expect(html).not.toContain('Er is iets mis')
    expect(html).not.toContain('alert(1)')
  })

  it('says that the item does not exist any more', async () => {
    expect(await render({ fout: 'weg' })).toContain('Dit bericht bestaat niet meer')
  })

  it('says that the item is hidden, and when it is gone from the site, when it is', async () => {
    const id = await addItem(database, ids, 'een', { title: 'Een kop' })

    await hideItem(database.db, userId, id, 'Fout in het bericht')

    const html = await render({ verborgen: String(id) })

    expect(headings(html)).toEqual(['h1 Berichten', 'h2 Verborgen'])
    expect(html).toContain('Een kop. Staat binnen vijf minuten niet meer op de site.')
  })

  it('says nothing about an item that is not hidden, whatever the address says', async () => {
    const id = await addItem(database, ids, 'een')

    expect(await render({ verborgen: String(id) })).not.toContain('Staat binnen vijf minuten')
    expect(await render({ verborgen: '99999' })).not.toContain('Staat binnen vijf minuten')
    expect(await render({ verborgen: 'abc' })).not.toContain('Staat binnen vijf minuten')
  })

  it('says that the item is back, when it is shown', async () => {
    const id = await addItem(database, ids, 'een', { title: 'Een kop' })
    const html = await render({ getoond: String(id) })

    expect(headings(html)).toEqual(['h1 Berichten', 'h2 Weer getoond'])
    expect(html).toContain('Een kop. Staat binnen vijf minuten weer op de site.')
  })

  it('says nothing about an item that is still hidden when the address says it was shown', async () => {
    const id = await addItem(database, ids, 'een')

    await database.db.update(items).set({ hiddenAt: new Date() })

    expect(await render({ getoond: String(id) })).not.toContain('Weer getoond')
  })
})
