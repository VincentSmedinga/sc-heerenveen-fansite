import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { RecordTable, type RecordTableRow } from './RecordTable'

const rows: RecordTableRow[] = [
  { drawn: 0, goalDifference: 5, lost: 0, name: 'Thuis', played: 2, points: 6, won: 2 },
  { drawn: 1, goalDifference: 1, lost: 1, name: 'Uit', played: 3, points: 4, won: 1 },
]
const total: RecordTableRow = { drawn: 1, goalDifference: 6, lost: 1, name: 'Totaal', played: 5, points: 10, won: 3 }

const props = { caption: 'De uitslagen van sc Heerenveen tegen Demo Boys, thuis, uit en in totaal', rows, total }

/** The figures of the row with this name, in the order of the columns. */
const figures = (name: string) =>
  within(screen.getByRole('row', { name: new RegExp(`^${name}`, 'u') }))
    .getAllByRole('cell')
    .map((cell) => cell.textContent)

describe('RecordTable', () => {
  it('is a real table with the caption that names it, for a screen reader only', () => {
    render(<RecordTable {...props} />)

    expect(screen.getByRole('table', { name: props.caption })).toBeTruthy()
    expect(document.querySelector('caption')?.className).toBe('hf-visually-hidden')
  })

  it('has the columns G, W, GL, V, DS and P, with a column header with scope for each', () => {
    render(<RecordTable {...props} />)

    expect(
      screen.getAllByRole('columnheader').map((header) => header.querySelector('[aria-hidden="true"]')?.textContent),
    ).toEqual([undefined, 'G', 'W', 'GL', 'V', 'DS', 'P'])
    expect(screen.getAllByRole('columnheader').every((header) => header.getAttribute('scope') === 'col')).toBe(true)
  })

  it('has no column for the goals for and against: only their difference', () => {
    render(<RecordTable {...props} />)

    expect(screen.queryByRole('columnheader', { name: 'doelpunten voor' })).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'doelpunten tegen' })).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'doelsaldo' })).toBeTruthy()
  })

  it('names every column header by its full word for a screen reader', () => {
    render(<RecordTable {...props} />)

    for (const name of ['gespeeld', 'gewonnen', 'gelijk', 'verloren', 'doelsaldo', 'punten']) {
      expect(screen.getByRole('columnheader', { name })).toBeTruthy()
    }
  })

  it('has a row header for each row, with the total in a foot under the body', () => {
    const { container } = render(<RecordTable {...props} />)

    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual(['Thuis', 'Uit', 'Totaal'])
    expect([...container.querySelectorAll('tbody th')].map((header) => header.textContent)).toEqual(['Thuis', 'Uit'])
    expect([...container.querySelectorAll('tfoot th')].map((header) => header.textContent)).toEqual(['Totaal'])
    expect(container.querySelectorAll('th[scope="row"]')).toHaveLength(3)
  })

  it('writes the figures of a row in the columns of the headers', () => {
    render(<RecordTable {...props} />)

    expect(figures('Thuis')).toEqual(['2', '2', '0', '0', '+5', '6'])
    expect(figures('Uit')).toEqual(['3', '1', '1', '1', '+1', '4'])
    expect(figures('Totaal')).toEqual(['5', '3', '1', '1', '+6', '10'])
  })

  it('writes the goal difference with its sign: plus, a real minus sign, or a bare zero', () => {
    render(
      <RecordTable
        {...props}
        rows={[
          { ...rows[0]!, goalDifference: -2 },
          { ...rows[1]!, goalDifference: 0 },
        ]}
      />,
    )

    expect(figures('Thuis')[4]).toBe('−2')
    expect(figures('Uit')[4]).toBe('0')
  })

  it('shows zeros as figures', () => {
    render(
      <RecordTable
        {...props}
        rows={[{ ...rows[0]!, drawn: 0, goalDifference: 0, lost: 0, played: 0, points: 0, won: 0 }]}
      />,
    )

    expect(figures('Thuis')).toEqual(['0', '0', '0', '0', '0', '0'])
  })

  it('gives the wins, draws and losses the colour of the result, and no other figure', () => {
    render(<RecordTable {...props} />)

    expect(
      within(screen.getByRole('row', { name: /^Totaal/u }))
        .getAllByRole('cell')
        .map((cell) => cell.className),
    ).toEqual([
      'hf-numeric',
      'hf-numeric hf-match-win',
      'hf-numeric hf-match-draw',
      'hf-numeric hf-match-loss',
      'hf-numeric',
      'hf-numeric hf-bar-value',
    ])
  })

  it('has no column for points, and no word for them, when the rows have none', () => {
    const { container } = render(
      <RecordTable
        {...props}
        rows={rows.map((row) => ({ ...row, points: undefined }))}
        total={{ ...total, points: undefined }}
      />,
    )

    expect(screen.queryByRole('columnheader', { name: 'punten' })).toBeNull()
    expect(figures('Totaal')).toEqual(['5', '3', '1', '1', '+6'])
    expect(container.querySelector('.hf-bar-legend')?.textContent).toBe(
      'G gespeeld, W gewonnen, GL gelijk, V verloren, DS doelsaldo',
    )
  })

  it('has no foot without a total', () => {
    const { container } = render(<RecordTable caption={props.caption} rows={rows} />)

    expect(container.querySelector('tfoot')).toBeNull()
  })

  it('gives every abbreviation its full word, in the title and under the table', () => {
    const { container } = render(<RecordTable {...props} />)

    expect([...container.querySelectorAll('thead abbr')].map((abbr) => abbr.getAttribute('title'))).toEqual([
      'Gespeeld',
      'Gewonnen',
      'Gelijk',
      'Verloren',
      'Doelsaldo',
      'Punten',
    ])
    expect(container.querySelector('.hf-bar-legend')?.textContent).toBe(
      'G gespeeld, W gewonnen, GL gelijk, V verloren, DS doelsaldo, P punten',
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
    const { container } = render(<RecordTable {...props} rows={[{ ...rows[0]!, name: '<b>Thuis</b>' }]} />)

    expect(container.querySelector('tbody th')?.textContent).toBe('<b>Thuis</b>')
    expect(container.querySelector('tbody b')).toBeNull()
  })

  it('passes other props on and adds its own class to a given one', () => {
    const { container } = render(<RecordTable {...props} className="extra" id="uitslagen" />)

    expect(container.firstElementChild?.className).toBe('hf-record-table hf-bar-place extra')
    expect(container.firstElementChild?.id).toBe('uitslagen')
  })
})
