import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WikipediaCredit } from './WikipediaCredit'

const standings = {
  href: 'https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)',
  name: 'Eredivisie 2026/27',
}

const cup = {
  href: 'https://nl.wikipedia.org/wiki/KNVB_Beker_2026/27_(mannen)',
  name: 'KNVB Beker 2026/27',
}

const props = { readAt: '25 oktober 2026 om 14:05', readAtDateTime: '2026-10-25T12:05:00Z' }

describe('WikipediaCredit', () => {
  it('names Wikipedia and the licence, the page, the time of reading and the licence of our data', () => {
    const { container } = render(<WikipediaCredit {...props} pages={[standings]} />)

    expect(container.textContent).toBe(
      'Bron: WikipediaLicentie: CC BY-SA 4.0. Pagina: Eredivisie 2026/27. Laatst gelezen op 25 oktober 2026 om 14:05. Onze wedstrijdgegevens zijn ook CC BY-SA 4.0.',
    )
  })

  it('leaves out the time of reading when it is not known, and keeps the rest', () => {
    const { container } = render(<WikipediaCredit data="spelersgegevens" pages={[standings]} />)

    expect(container.textContent).toBe(
      'Bron: WikipediaLicentie: CC BY-SA 4.0. Pagina: Eredivisie 2026/27. Onze spelersgegevens zijn ook CC BY-SA 4.0.',
    )
    expect(container.querySelector('time')).toBeNull()
  })

  it('is a closed details with a summary that says "Bron: Wikipedia" and holds no link', () => {
    const { container } = render(<WikipediaCredit {...props} pages={[standings]} />)
    const details = container.firstElementChild as HTMLDetailsElement
    const summary = details.querySelector('summary')

    expect(details.tagName).toBe('DETAILS')
    expect(details.open).toBe(false)
    expect(summary?.textContent).toBe('Bron: Wikipedia')
    expect(summary?.querySelector('a')).toBeNull()
  })

  it('is closed for many pages too, and stays closed unless it is told to open', () => {
    const many = [
      standings,
      cup,
      { href: 'https://nl.wikipedia.org/wiki/Eredivisie_2025/26', name: 'Eredivisie 2025/26' },
    ]
    const { container, rerender } = render(<WikipediaCredit {...props} pages={[many[0]!, ...many.slice(1)]} />)

    expect((container.firstElementChild as HTMLDetailsElement).open).toBe(false)

    rerender(<WikipediaCredit {...props} open pages={[standings]} />)

    expect((container.firstElementChild as HTMLDetailsElement).open).toBe(true)
  })

  it('has an arrow that is hidden from a screen reader, so the words are the only name', () => {
    const { container } = render(<WikipediaCredit {...props} pages={[standings]} />)
    const icon = container.querySelector('summary svg')

    expect(icon?.getAttribute('aria-hidden')).toBe('true')
  })

  it('names our own data after the pages it is given, such as the squad', () => {
    const { container } = render(<WikipediaCredit {...props} data="selectiegegevens" pages={[standings]} />)

    expect(container.textContent).toContain('. Onze selectiegegevens zijn ook CC BY-SA 4.0.')
    expect(container.textContent).not.toContain('wedstrijdgegevens')
  })

  it('links to the licence and the page, and not to the history of the page', () => {
    render(<WikipediaCredit {...props} pages={[standings]} />)

    expect(screen.getByRole('link', { name: 'CC BY-SA 4.0' }).getAttribute('href')).toBe(
      'https://creativecommons.org/licenses/by-sa/4.0/deed.nl',
    )
    expect(screen.getByRole('link', { name: 'Eredivisie 2026/27' }).getAttribute('href')).toBe(standings.href)
    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.queryByText('geschiedenis')).toBeNull()
  })

  it('gives every link a name of its own, also with more than one page', () => {
    render(<WikipediaCredit {...props} pages={[standings, cup]} />)
    const names = screen.getAllByRole('link').map((link) => link.getAttribute('aria-label') ?? link.textContent)

    expect(names).toEqual(['CC BY-SA 4.0', 'Eredivisie 2026/27', 'KNVB Beker 2026/27'])
    expect(new Set(names).size).toBe(names.length)
  })

  it('says "pagina’s" for more than one page', () => {
    const { container } = render(<WikipediaCredit {...props} pages={[standings, cup]} />)

    expect(container.textContent).toContain('Pagina’s: Eredivisie 2026/27, KNVB Beker 2026/27. Laatst gelezen')
  })

  it('puts the time of reading in a time element with the machine value', () => {
    render(<WikipediaCredit {...props} pages={[standings]} />)
    const time = screen.getByText('25 oktober 2026 om 14:05')

    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2026-10-25T12:05:00Z')
  })

  it('is in the style of small text, passes other props on and adds its class to a given one', () => {
    const { container } = render(<WikipediaCredit {...props} className="extra" id="bron" pages={[standings]} />)

    expect(container.firstElementChild?.tagName).toBe('DETAILS')
    expect(container.firstElementChild?.className).toBe('hf-meta hf-wikipedia-credit extra')
    expect(container.firstElementChild?.id).toBe('bron')
  })

  it('says in the fold that the editors entered some of the data, and only then', () => {
    const { container, rerender } = render(<WikipediaCredit {...props} pages={[standings]} />)

    expect(container.textContent).not.toContain('onze redactie')

    rerender(<WikipediaCredit {...props} edited pages={[standings]} />)

    expect(container.querySelector('details p')?.textContent).toContain(
      'Enkele gegevens heeft onze redactie zelf ingevuld of aangepast.',
    )
    expect(container.children).toHaveLength(1)
  })

  it('says in the fold that some players come from Wikidata, with the licence, and only then', () => {
    const { container, rerender } = render(<WikipediaCredit {...props} pages={[standings]} />)

    expect(container.textContent).not.toContain('Wikidata')

    rerender(<WikipediaCredit {...props} pages={[standings]} wikidata />)

    const link = screen.getByRole('link', { name: 'Wikidata' })

    expect(link.getAttribute('href')).toBe('https://www.wikidata.org/')
    expect(container.querySelector('details p')?.textContent).toContain('Enkele spelers komen van Wikidata (CC0).')
  })

  it('says only "Bron: Wikipedia" in the short form, with no link and no time', () => {
    const { container } = render(<WikipediaCredit compact />)

    expect(container.textContent).toBe('Bron: Wikipedia')
    expect(container.firstElementChild?.tagName).toBe('P')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(container.querySelector('time')).toBeNull()
    expect(container.firstElementChild?.className).toBe('hf-meta hf-wikipedia-credit')
  })

  it('says what the short form puts before Wikipedia when it is told, and nothing else changes', () => {
    const { container } = render(<WikipediaCredit compact lead="Gegevens van" />)

    expect(container.textContent).toBe('Gegevens van Wikipedia')
    expect(container.firstElementChild?.className).toBe('hf-meta hf-wikipedia-credit')
  })

  it('needs pages in the full form and none in the short form', () => {
    // @ts-expect-error The short form has no pages.
    const withPages = <WikipediaCredit compact pages={[standings]} />

    expect(withPages).toBeTruthy()
  })

  it('has no name for our data in the short form', () => {
    // @ts-expect-error The short form has no sentence about our data.
    const withData = <WikipediaCredit compact data="selectiegegevens" />

    expect(withData).toBeTruthy()
  })

  it('needs at least one page', () => {
    // @ts-expect-error A credit without a page credits nothing.
    const element = <WikipediaCredit {...props} pages={[]} />

    expect(element).toBeTruthy()
  })

  it('names the archive of the old fansite next to Wikipedia when it is asked to', () => {
    const { container } = render(<WikipediaCredit {...props} archive pages={[standings]} />)

    expect(container.querySelector('summary')?.textContent).toBe('Bron: Wikipedia en sc Heerenveen Fansite')
    expect(container.querySelector('details p')?.textContent).toContain(
      'Oudere wedstrijden komen van de sc Heerenveen Fansite.',
    )
  })

  it('names the archive in the short form too, after any lead', () => {
    const { container, rerender } = render(<WikipediaCredit archive compact />)

    expect(container.textContent).toBe('Bron: Wikipedia en sc Heerenveen Fansite')

    rerender(<WikipediaCredit archive compact lead="Gegevens van" />)

    expect(container.textContent).toBe('Gegevens van Wikipedia en sc Heerenveen Fansite')
  })

  it('says nothing about the archive without it', () => {
    const { container } = render(<WikipediaCredit {...props} pages={[standings]} />)

    expect(container.textContent).not.toContain('archief')
  })
})
