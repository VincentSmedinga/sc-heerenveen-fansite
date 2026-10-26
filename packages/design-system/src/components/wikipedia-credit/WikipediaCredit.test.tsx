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
      'Bron: Wikipedia (CC BY-SA 4.0), pagina: Eredivisie 2026/27. Laatst gelezen op 25 oktober 2026 om 14:05. Onze wedstrijdgegevens zijn ook CC BY-SA 4.0.',
    )
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

    expect(container.textContent).toContain('pagina’s: Eredivisie 2026/27, KNVB Beker 2026/27. Laatst gelezen')
  })

  it('puts the time of reading in a time element with the machine value', () => {
    render(<WikipediaCredit {...props} pages={[standings]} />)
    const time = screen.getByText('25 oktober 2026 om 14:05')

    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2026-10-25T12:05:00Z')
  })

  it('is a paragraph in the style of small text, passes other props on and adds its class to a given one', () => {
    const { container } = render(<WikipediaCredit {...props} className="extra" id="bron" pages={[standings]} />)

    expect(container.firstElementChild?.tagName).toBe('P')
    expect(container.firstElementChild?.className).toBe('hf-meta hf-wikipedia-credit extra')
    expect(container.firstElementChild?.id).toBe('bron')
  })

  it('says only "Bron: Wikipedia" in the short form, with no link and no time', () => {
    const { container } = render(<WikipediaCredit compact />)

    expect(container.textContent).toBe('Bron: Wikipedia')
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(container.querySelector('time')).toBeNull()
    expect(container.firstElementChild?.className).toBe('hf-meta hf-wikipedia-credit')
  })

  it('needs pages in the full form and none in the short form', () => {
    // @ts-expect-error The short form has no pages.
    const withPages = <WikipediaCredit compact pages={[standings]} />

    expect(withPages).toBeTruthy()
  })

  it('needs at least one page', () => {
    // @ts-expect-error A credit without a page credits nothing.
    const element = <WikipediaCredit {...props} pages={[]} />

    expect(element).toBeTruthy()
  })
})
