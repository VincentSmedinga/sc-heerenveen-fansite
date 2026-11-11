import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, items } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { approveItem, hideItem, listLength } from '#src/beheer/items'
import { addItem, addSource } from '#src/beheer/test-items'

import ItemsPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
  useRouter: () => ({ push: () => undefined }),
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

/** The markup without the comments React puts between pieces of text. */
const text = (html: string) => html.replaceAll('<!-- -->', '')

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

  it('has one h1, points to the list of reasons, and says when the item is gone from the site', async () => {
    const html = await render()

    expect(headings(html)).toEqual(['h1 Berichten'])
    expect(html).toContain('Kies bij het verbergen de reden uit de lijst.')
    expect(html).toContain('binnen vijf minuten niet meer op de site')
    expect(html).toContain('Er zijn geen berichten op de site.')
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
    expect(html).toContain('2 berichten op de site.')
  })

  it('gives each item that is shown a list of reasons, a text field for Anders and a button Verberg', async () => {
    const id = await addItem(database, ids, 'een')
    const html = await render()

    expect(html).toMatch(new RegExp(`<label[^>]*for="reden-${id}"[^>]*>Reden`))
    // The hidden part of the label says which item the field is for, so a screen reader hears
    // it between 50 fields.
    expect(html).toMatch(new RegExp(`for="reden-${id}"[^>]*>Reden.*om “Kop een” te verbergen`))
    expect(html).toMatch(new RegExp(`<select[^>]*id="reden-${id}"`))
    expect(html).toMatch(/<select[^>]*name="reden"/)
    // No reason is chosen: the first choice is empty, and the list ends with Anders.
    expect(html).toMatch(/<option value="" selected="">Kies een reden<\/option>/)
    expect(html).toMatch(
      /<option value="fout">Fout in het bericht<\/option><option value="past-niet">Past niet bij de site<\/option><option value="bron">Op verzoek van de bron<\/option><option value="dubbel">Dubbel bericht<\/option><option value="anders">Anders<\/option>/,
    )
    // The text field is there but hidden until Anders is chosen, with a label of its own.
    expect(html).toMatch(new RegExp(`<div[^>]*hidden=""[^>]*>.*for="toelichting-${id}"[^>]*>Toelichting`))
    expect(html).toMatch(
      /<input[^>]*name="toelichting"[^>]*maxLength="300"|<input[^>]*maxLength="300"[^>]*name="toelichting"/,
    )
    expect(hasButton(html, 'Verberg: Kop een', 'Verberg')).toBe(true)
    expect(buttons(html)).toHaveLength(1)
  })

  it('says of an item the importer did not find about the club that it is not on the site', async () => {
    await addItem(database, ids, 'club', { publishedAt: new Date('2026-10-21T08:00:00Z') })
    await addItem(database, ids, 'twijfel', { publishedAt: new Date('2026-10-20T08:00:00Z'), relevance: 'doubtful' })
    await addItem(database, ids, 'elders', { publishedAt: new Date('2026-10-19T08:00:00Z'), relevance: 'irrelevant' })

    const html = await render({ toon: 'niet-op-de-site' })

    expect(html).not.toContain('Kop club')
    expect(html).toContain('Kop twijfel')
    expect(html).toContain('Kop elders')
    expect(html.match(/twijfelgeval, niet op de site/g)).toHaveLength(1)
    expect(html.match(/niet over de club, niet op de site/g)).toHaveLength(1)
    // Hiding what is not on the site already does nothing, so those two have no form for it.
    expect(html).not.toContain('aria-label="Verberg:')
    expect(html).not.toContain('for="reden-')
    // They have a button to put them on the site, named after the item.
    expect(hasButton(html, 'Op de site zetten: Kop twijfel', 'Op de site zetten')).toBe(true)
    expect(hasButton(html, 'Op de site zetten: Kop elders', 'Op de site zetten')).toBe(true)
    expect(buttons(html)).toHaveLength(2)
  })

  it('puts an approved item in the group on the site, with who approved it and a button to take it back', async () => {
    const id = await addItem(database, ids, 'twijfel', {
      publishedAt: new Date('2026-10-20T08:00:00Z'),
      relevance: 'doubtful',
    })

    await approveItem(database.db, userId, id, new Date('2026-10-21T08:00:00Z'))

    const html = text(await render())

    expect(html).toContain('Kop twijfel')
    expect(html).toContain('door een moderator op de site gezet')
    expect(html).toContain('door jelle@example.org')
    expect(hasButton(html, 'Terug naar het oordeel van het filter: Kop twijfel', 'Herstellen')).toBe(true)
    expect(hasButton(html, 'Verberg: Kop twijfel', 'Verberg')).toBe(true)
    expect(html).not.toContain('aria-label="Op de site zetten:')
    expect(text(await render({ toon: 'niet-op-de-site' }))).not.toContain('Kop twijfel')
  })

  it('tells that an item was put on the site or taken back only when it is true', async () => {
    const id = await addItem(database, ids, 'twijfel', { relevance: 'doubtful' })

    expect(text(await render({ opgenomen: String(id) }))).not.toContain('Op de site gezet')
    expect(text(await render({ teruggezet: String(id) }))).toContain('Terug naar het oordeel van het filter')

    await approveItem(database.db, userId, id)

    const html = text(await render({ opgenomen: String(id) }))

    expect(html).toContain('Op de site gezet')
    expect(html).toContain('Kop twijfel. Staat binnen vijf minuten op de site')
    expect(text(await render({ teruggezet: String(id) }))).not.toMatch(/<h2[^>]*>Terug naar het oordeel/)
  })

  it('says of an item that is published later that it is not on the site yet, and lets it be hidden', async () => {
    await addItem(database, ids, 'straks', { publishedAt: new Date(Date.now() + 3_600_000) })

    const html = await render({ toon: 'niet-op-de-site' })

    expect(html).toContain('nog niet gepubliceerd, niet op de site')
    expect(hasButton(html, 'Verberg: Kop straks', 'Verberg')).toBe(true)
    expect(await render()).not.toContain('Kop straks')
  })

  it('gives the weekday and the date of an old item, with no time of day', async () => {
    await addItem(database, ids, 'oud', { publishedAt: new Date('2025-01-02T08:05:00Z') })

    expect(await render()).toMatch(/do 2 jan 2025</)
  })

  it('says of a hidden item that it is hidden, since when and why, and has a button Toon weer instead', async () => {
    const id = await addItem(database, ids, 'een')

    await hideItem(database.db, userId, id, 'Op verzoek van de bron')

    const html = await render({ toon: 'niet-op-de-site' })

    expect(html).toContain('verborgen')
    expect(text(html)).toMatch(/Verborgen op [^<]* door jelle@example\.org\. Reden: Op verzoek van de bron/)
    expect(hasButton(html, 'Toon weer: Kop een', 'Toon weer')).toBe(true)
    expect(buttons(html)).toHaveLength(1)
    expect(html).not.toContain('for="reden-')
    expect(html).toContain('1 bericht dat niet op de site staat.')
    expect(await render()).not.toContain('Kop een')
  })

  it('says of a hidden item whose account is gone that a deleted account hid it', async () => {
    await addItem(database, ids, 'een', {
      hiddenAt: new Date('2026-10-22T08:00:00Z'),
      hiddenReason: 'Fout in het bericht',
    })

    expect(text(await render({ toon: 'niet-op-de-site' }))).toMatch(
      /Verborgen op [^<]* door een verwijderd account\. Reden:/,
    )
  })

  it('shows what comes from outside as text and never as markup: headline, reason, source and search', async () => {
    const id = await addItem(database, ids, 'een', { title: '<img src=x onerror=alert(1)>' })

    await hideItem(database.db, userId, id, '<script>alert(2)</script>')

    const html = await render({ q: '"><script>alert(3)</script>', toon: 'niet-op-de-site' })

    expect(html).not.toContain('<script')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('onerror=alert')
    expect(html).toContain('Geen berichten gevonden met')
  })

  it('shows the headline and the reason escaped when they are found', async () => {
    const id = await addItem(database, ids, 'een', { title: 'Kop <b>vet</b> & meer' })

    await hideItem(database.db, userId, id, 'Reden <i>schuin</i>')

    const html = await render({ toon: 'niet-op-de-site' })

    expect(html).not.toContain('<b>vet')
    expect(html).not.toContain('<i>schuin')
    expect(html).toContain('Kop &lt;b&gt;vet&lt;/b&gt; &amp; meer')
    expect(html).toContain('Reden &lt;i&gt;schuin&lt;/i&gt;')
  })

  it('shows the 50 newest of the first page and says how many there are', async () => {
    for (let number = 0; number < 55; number++) {
      await addItem(database, ids, `k${number}`, { publishedAt: new Date(Date.UTC(2026, 9, 1, 0, number)) })
    }

    const html = await render()

    expect(html.match(/<li>/g)).toHaveLength(50)
    expect(html).toContain('55 berichten op de site. Je ziet pagina 1 van 2.')
  })
})

describe('the switch', () => {
  const links = (html: string) =>
    [...html.matchAll(/<a ([^>]*)><span class="hf-segmented-label"[^>]*>([^<]*)<\/span><\/a>/g)].map(
      ([, attributes, label]) => ({
        current: attributes?.includes('aria-current="page"') ?? false,
        href: /href="([^"]*)"/.exec(attributes ?? '')?.[1]?.replaceAll('&amp;', '&'),
        label,
      }),
    )

  it('is a group named Welke berichten with two links, and shows the group on the site by default', async () => {
    const html = await render()

    expect(html).toMatch(/<div aria-label="Welke berichten"[^>]*role="group"/)
    expect(links(html)).toEqual([
      { current: true, href: '/beheer/berichten', label: 'Op de site' },
      { current: false, href: '/beheer/berichten?toon=niet-op-de-site', label: 'Niet op de site' },
    ])
  })

  it('shows the group off the site for toon=niet-op-de-site', async () => {
    expect(links(await render({ toon: 'niet-op-de-site' }))).toEqual([
      { current: false, href: '/beheer/berichten', label: 'Op de site' },
      { current: true, href: '/beheer/berichten?toon=niet-op-de-site', label: 'Niet op de site' },
    ])
  })

  it.each(['alles', '', ['niet-op-de-site', 'x']])('falls back to the group on the site for toon=%j', async (toon) => {
    expect(links(await render({ toon })).map((link) => link.current)).toEqual([true, false])
  })

  it('keeps the search when the group changes, in both directions', async () => {
    expect(links(await render({ q: 'wint van' })).map((link) => link.href)).toEqual([
      '/beheer/berichten?q=wint+van',
      '/beheer/berichten?q=wint+van&toon=niet-op-de-site',
    ])
    expect(links(await render({ q: 'wint van', toon: 'niet-op-de-site' })).map((link) => link.href)).toEqual([
      '/beheer/berichten?q=wint+van',
      '/beheer/berichten?q=wint+van&toon=niet-op-de-site',
    ])
  })

  it('keeps the box in the link to the group off the site, and drops it in the link to the group on the site', async () => {
    expect(links(await render({ redactie: '1', toon: 'niet-op-de-site' })).map((link) => link.href)).toEqual([
      '/beheer/berichten',
      '/beheer/berichten?toon=niet-op-de-site&redactie=1',
    ])
  })

  it('says which group the list is of, and says in words when a group is empty', async () => {
    expect(await render()).toContain('Er zijn geen berichten op de site.')
    expect(await render({ toon: 'niet-op-de-site' })).toContain('Er zijn geen berichten die niet op de site staan.')
    expect(await render({ redactie: '1', toon: 'niet-op-de-site' })).toContain(
      'Er zijn geen berichten die door de redactie zijn verborgen.',
    )
    expect(await render({ q: 'wint', toon: 'niet-op-de-site' })).toContain(
      'Geen berichten gevonden met “wint” die niet op de site staan.',
    )
  })

  it('pages the list per group: 50 of the 55 that are not on the site', async () => {
    for (let number = 0; number < 55; number++) {
      await addItem(database, ids, `k${number}`, {
        publishedAt: new Date(Date.UTC(2026, 9, 1, 0, number)),
        relevance: 'irrelevant',
      })
    }

    const html = await render({ toon: 'niet-op-de-site' })

    expect(html.match(/<li>/g)).toHaveLength(50)
    expect(html).toContain('55 berichten die niet op de site staan. Je ziet pagina 1 van 2.')
  })
})

describe('the box for what editors hid', () => {
  beforeEach(async () => {
    const hidden = await addItem(database, ids, 'verborgen', { publishedAt: new Date('2026-10-21T08:00:00Z') })

    await hideItem(database.db, userId, hidden, 'Fout in het bericht')
    await addItem(database, ids, 'twijfel', { publishedAt: new Date('2026-10-20T08:00:00Z'), relevance: 'doubtful' })
  })

  it('is in the search form under Niet op de site with its own label, and the button sends the group', async () => {
    const html = await render({ toon: 'niet-op-de-site' })

    expect(html).toMatch(/<legend[^>]*>Filter<\/legend>/)
    expect(html).toMatch(
      /<input[^>]*type="checkbox"[^>]*name="redactie"[^>]*value="1"[^>]*\/><span>Alleen door de redactie verborgen<\/span>/,
    )
    expect(html).toMatch(/<button[^>]*name="toon"[^>]*>Zoeken<\/button>/)
    expect(html).toMatch(/<button[^>]*value="niet-op-de-site"[^>]*>Zoeken<\/button>/)
    expect(html).not.toMatch(/<input[^>]*name="redactie"[^>]*checked/)
    // One form, one button: the search and the box are applied together.
    expect(html.match(/<button[^>]*>Zoeken<\/button>/g)).toHaveLength(1)
    expect(html.indexOf('name="q"')).toBeLessThan(html.indexOf('name="redactie"'))
    expect(html.indexOf('name="redactie"')).toBeLessThan(html.indexOf('>Zoeken</button>'))
  })

  it('is not there under Op de site, and the button sends no group', async () => {
    const html = await render()

    expect(html).not.toContain('name="redactie"')
    expect(html).not.toContain('name="toon"')
    expect(html).not.toContain('Alleen door de redactie verborgen')
  })

  it('is ignored under Op de site when the address asks for it', async () => {
    const html = await render({ redactie: '1' })

    expect(html).not.toContain('name="redactie"')
    expect(html).not.toContain('Kop verborgen')
  })

  it('shows the doubtful items too without the box, and only what editors hid with it', async () => {
    const without = await render({ toon: 'niet-op-de-site' })
    const checked = await render({ redactie: '1', toon: 'niet-op-de-site' })

    expect(without).toContain('Kop verborgen')
    expect(without).toContain('Kop twijfel')
    expect(checked).toContain('Kop verborgen')
    expect(checked).not.toContain('Kop twijfel')
    expect(checked).toMatch(/<input[^>]*name="redactie"[^>]*checked/)
    expect(checked).toContain('1 bericht dat door de redactie is verborgen.')
  })

  it('keeps the group, and the box when it was checked, in the link that clears the search', async () => {
    expect(await render({ q: 'verborgen', redactie: '1', toon: 'niet-op-de-site' })).toContain(
      '<a href="/beheer/berichten?toon=niet-op-de-site&amp;redactie=1">Toon alle berichten</a>',
    )
    expect(await render({ q: 'verborgen', toon: 'niet-op-de-site' })).toContain(
      '<a href="/beheer/berichten?toon=niet-op-de-site">Toon alle berichten</a>',
    )
    expect(await render({ q: 'kop' })).toContain('<a href="/beheer/berichten">Toon alle berichten</a>')
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
    expect(html).toContain('1 bericht op de site met “wint”.')
    expect(html).toContain('<a href="/beheer/berichten">Toon alle berichten</a>')
  })

  it('says when nothing matches', async () => {
    expect(await render({ q: 'bestaat niet' })).toContain('Geen berichten gevonden met “bestaat niet” op de site.')
  })

  it('ignores a search that is given twice', async () => {
    expect(await render({ q: ['wint', 'voorzitter'] })).toContain('2 berichten op de site.')
  })
})

describe('the pages of the list', () => {
  const fill = async (count: number) => {
    for (let number = 0; number < count; number++) {
      await addItem(database, ids, `p${number}`, { publishedAt: new Date(Date.UTC(2026, 9, 1, 0, number)) })
    }
  }

  it('shows no pagination for a list of one page', async () => {
    await fill(3)

    const html = await render()

    expect(html).not.toContain('Pagina ')
    expect(html).toContain('3 berichten op de site.')
  })

  it('shows the first page of fifty with the count, the page and a link to the next', async () => {
    await fill(listLength + 5)

    const html = await render()

    expect(html).toContain(`${listLength + 5} berichten op de site. Je ziet pagina 1 van 2.`)
    expect(html).toContain('Kop p54')
    expect(html).not.toContain('Kop p4<')
    expect(html).toMatch(/<nav[^>]*aria-label="Pagina’s van de lijst"/)
    expect(html).toContain('href="/beheer/berichten?pagina=2"')
    expect(html).not.toContain('Vorige')
  })

  it('shows the second page, and a link back that leaves the page out', async () => {
    await fill(listLength + 5)

    const html = await render({ pagina: '2' })

    expect(html).toContain('Je ziet pagina 2 van 2.')
    expect(html).toContain('Kop p4<')
    expect(html).not.toContain('Kop p54')
    expect(html).toContain('href="/beheer/berichten"')
    expect(html).not.toContain('Volgende')
  })

  it('shows the last page for a page that is too far, and the first for one that is no number', async () => {
    await fill(listLength + 5)

    expect(await render({ pagina: '99' })).toContain('Je ziet pagina 2 van 2.')
    expect(await render({ pagina: 'abc' })).toContain('Je ziet pagina 1 van 2.')
    expect(await render({ pagina: ['2', '1'] })).toContain('Je ziet pagina 1 van 2.')
  })

  it('keeps the group, the search and the box of what editors hid when it turns the page', async () => {
    for (let number = 0; number < listLength + 5; number++) {
      await addItem(database, ids, `v${number}`, {
        hiddenAt: new Date('2026-10-22T08:00:00Z'),
        hiddenReason: 'Fout',
        publishedAt: new Date(Date.UTC(2026, 9, 1, 0, number)),
      })
    }

    const html = await render({ q: 'Kop', redactie: '1', toon: 'niet-op-de-site' })

    expect(html).toContain('href="/beheer/berichten?q=Kop&amp;toon=niet-op-de-site&amp;redactie=1&amp;pagina=2"')
  })
})

describe('what the last action left', () => {
  it('shows the error in the summary and at the field of the item', async () => {
    const id = await addItem(database, ids, 'een')
    const html = await render({ bericht: String(id), fout: 'reden-kies' })
    const message = 'Kies een reden.'

    expect(headings(html)).toEqual(['h1 Berichten', 'h2 Er is iets mis'])
    expect(html).toContain(`<a href="#reden-${id}">${message}</a>`)
    expect(html).toMatch(
      new RegExp(
        `<select[^>]*id="reden-${id}"[^>]*aria-invalid="true"|<select[^>]*aria-invalid="true"[^>]*id="reden-${id}"`,
      ),
    )
    expect(html).toMatch(new RegExp(`aria-describedby="reden-${id}-error"`))
    expect(html.split(message)).toHaveLength(3)
  })

  it('shows the error of Anders without a text at the text field, with Anders still chosen and the field open', async () => {
    const id = await addItem(database, ids, 'een')
    const html = await render({ bericht: String(id), fout: 'reden-anders', keuze: 'anders' })

    expect(html).toContain(`<a href="#toelichting-${id}">Schrijf een reden bij Anders.</a>`)
    expect(html).toMatch(/<option value="anders" selected="">Anders<\/option>/)
    expect(html).toMatch(
      new RegExp(
        `<input[^>]*id="toelichting-${id}"[^>]*aria-invalid="true"|<input[^>]*aria-invalid="true"[^>]*id="toelichting-${id}"`,
      ),
    )
    expect(html).not.toMatch(new RegExp(`<div[^>]*hidden=""[^>]*><div[^>]*><label[^>]*for="toelichting-${id}"`))
  })

  it('shows the error of a reason that is too long at the text field', async () => {
    const id = await addItem(database, ids, 'een')
    const html = await render({ bericht: String(id), fout: 'reden-lang', keuze: 'anders' })

    expect(html).toContain(`<a href="#toelichting-${id}">Schrijf een kortere reden, van hoogstens 300 tekens.</a>`)
  })

  it('keeps the explanation to the list: it names no examples of its own', async () => {
    const html = await render()

    expect(html).toContain('Kies bij het verbergen de reden uit de lijst.')
    expect(html).not.toContain('“Past niet bij de site” of')
  })

  it('tells an error about an item that is not in the list as a notice without a link', async () => {
    await addItem(database, ids, 'een')

    const html = await render({ bericht: '99999', fout: 'reden-kies' })

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
