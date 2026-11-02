import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RecordTable, type RecordTableRow } from './RecordTable'

const rows: RecordTableRow[] = [
  { drawn: 1, goalsAgainst: 4, goalsFor: 10, lost: 1, name: 'Totaal', played: 5, won: 3 },
  { drawn: 0, goalsAgainst: 0, goalsFor: 5, lost: 0, name: 'Thuis', played: 2, won: 2 },
  { drawn: 1, goalsAgainst: 4, goalsFor: 5, lost: 1, name: 'Uit', played: 3, won: 1 },
]

const props = { caption: 'De uitslagen van sc Heerenveen tegen Demo Boys, in totaal, thuis en uit', rows }

describe('RecordTable', () => {
  it('is a real table with the caption that names it, for a screen reader only', () => {
    render(<RecordTable {...props} />)

    expect(screen.getByRole('table', { name: props.caption })).toBeTruthy()
    expect(document.querySelector('caption')?.className).toBe('hf-visually-hidden')
  })

  it('has the columns G, W, GL, V, DV and DT, and no column for points', () => {
    render(<RecordTable {...props} />)

    expect(
      screen.getAllByRole('columnheader').map((header) => header.querySelector('[aria-hidden="true"]')?.textContent),
    ).toEqual([undefined, 'G', 'W', 'GL', 'V', 'DV', 'DT'])
    expect(screen.queryByRole('columnheader', { name: 'punten' })).toBeNull()
    expect(screen.getAllByRole('columnheader').every((header) => header.getAttribute('scope') === 'col')).toBe(true)
  })

  it('names every column by its full word for a screen reader', () => {
    render(<RecordTable {...props} />)

    for (const name of ['gespeeld', 'gewonnen', 'gelijk', 'verloren', 'doelpunten voor', 'doelpunten tegen']) {
      expect(screen.getByRole('columnheader', { name })).toBeTruthy()
    }
  })

  it('has a row header for each row, in the order given', () => {
    render(<RecordTable {...props} />)

    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['Totaal', 'Thuis', 'Uit'])
    expect(document.querySelectorAll('tbody th[scope="row"]')).toHaveLength(3)
  })

  it('writes the figures of a row in the columns of the headers', () => {
    render(<RecordTable {...props} />)

    const cells = (name: string) =>
      within(screen.getByRole('row', { name: new RegExp(`^${name}`, 'u') }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent)

    expect(cells('Totaal')).toEqual(['5', '3', '1', '1', '10', '4'])
    expect(cells('Thuis')).toEqual(['2', '2', '0', '0', '5', '0'])
    expect(cells('Uit')).toEqual(['3', '1', '1', '1', '5', '4'])
  })

  it('shows zeros as figures', () => {
    render(
      <RecordTable
        {...props}
        rows={[{ ...rows[0]!, drawn: 0, goalsAgainst: 0, goalsFor: 0, lost: 0, played: 0, won: 0 }]}
      />,
    )

    expect(
      within(screen.getByRole('row', { name: /^Totaal/u }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['0', '0', '0', '0', '0', '0'])
  })

  it('gives every abbreviation its full word, in the title and under the table', () => {
    const { container } = render(<RecordTable {...props} />)

    expect([...container.querySelectorAll('thead abbr')].map((abbr) => abbr.getAttribute('title'))).toEqual([
      'Gespeeld',
      'Gewonnen',
      'Gelijk',
      'Verloren',
      'Doelpunten voor',
      'Doelpunten tegen',
    ])
    expect(container.querySelector('.hf-bar-legend')?.textContent).toBe(
      'G gespeeld, W gewonnen, GL gelijk, V verloren, DV doelpunten voor, DT doelpunten tegen',
    )
  })

  it('has no bars, no area that scrolls sideways, no link and no image', () => {
    const { container } = render(<RecordTable {...props} />)

    expect(container.querySelector('.hf-bar')).toBeNull()
    expect(container.querySelector('[tabindex]')).toBeNull()
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(container.querySelector('img, svg, picture')).toBeNull()
  })

  it('shows the names of rows as text, not as HTML', () => {
    const { container } = render(<RecordTable {...props} rows={[{ ...rows[0]!, name: '<b>Totaal</b>' }]} />)

    expect(container.querySelector('tbody th')?.textContent).toBe('<b>Totaal</b>')
    expect(container.querySelector('tbody b')).toBeNull()
  })

  it('passes other props on and adds its own class to a given one', () => {
    const { container } = render(<RecordTable {...props} className="extra" id="uitslagen" />)

    expect(container.firstElementChild?.className).toBe('hf-record-table hf-bar-place extra')
    expect(container.firstElementChild?.id).toBe('uitslagen')
  })
})
