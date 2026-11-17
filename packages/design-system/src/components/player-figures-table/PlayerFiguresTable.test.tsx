import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type PlayerFiguresRow, PlayerFiguresTable } from './PlayerFiguresTable'

const rows: PlayerFiguresRow[] = [
  {
    assists: 2,
    givenName: 'Wouter',
    goals: 5,
    id: 1,
    minutes: 1710,
    red: 0,
    started: 18,
    substituted: 1,
    substitutedOff: 1,
    surname: 'Proefman',
    yellow: 3,
  },
  {
    assists: 0,
    givenName: 'Gerrit',
    goals: 0,
    id: 2,
    minutes: 0,
    red: 0,
    started: 0,
    substituted: 0,
    substitutedOff: 0,
    surname: 'Nepper',
    yellow: 0,
  },
  {
    assists: 1,
    goals: 1,
    id: 'naam:Testvoort',
    minutes: 905,
    red: 1,
    started: 8,
    substituted: 4,
    substitutedOff: 2,
    surname: 'Testvoort',
    yellow: 2,
  },
]

const props = { caption: 'Alle spelers in de verslagen van sc Heerenveen in het seizoen 2026/27', rows }

describe('PlayerFiguresTable', () => {
  it('is a real table with the caption that names it, for a screen reader only', () => {
    render(<PlayerFiguresTable {...props} />)

    expect(screen.getByRole('table', { name: props.caption })).toBeTruthy()
    expect(document.querySelector('caption')?.className).toBe('hf-visually-hidden')
  })

  it('has column headers with scope, the icons of tableColumns for the eye and the words for a screen reader', () => {
    render(<PlayerFiguresTable {...props} />)

    const headers = screen.getAllByRole('columnheader')

    expect(headers.map((header) => header.textContent)).toEqual([
      'Speler',
      'minuten',
      'basis',
      'gewisseld',
      'ingevallen',
      'doelpunten',
      'assists',
      'geel',
      'rood',
    ])
    expect(headers.slice(1).every((header) => header.querySelectorAll('svg[aria-hidden="true"]').length === 1)).toBe(
      true,
    )
    expect(headers.every((header) => header.getAttribute('scope') === 'col')).toBe(true)
    expect(screen.getByRole('columnheader', { name: 'gewisseld' })).toBeTruthy()
    expect(screen.queryByRole('columnheader', { name: 'gespeeld' })).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'ingevallen' })).toBeTruthy()
  })

  it('has a row header with the name of each player as one name, and his figures in the order of the columns', () => {
    render(<PlayerFiguresTable {...props} />)

    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
      'Wouter Proefman',
      'Gerrit Nepper',
      'Testvoort',
    ])
    expect(
      within(screen.getByRole('row', { name: /Proefman/u }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['1710', '18', '1', '1', '5', '2', '3', '0'])
    // A player of the bench who did not come on has a row with zeros.
    expect(
      within(screen.getByRole('row', { name: /Nepper/u }))
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['0', '0', '0', '0', '0', '0', '0', '0'])
    expect(document.querySelectorAll('tbody th[scope="row"]')).toHaveLength(3)
  })

  it('keeps the order it is given, and makes the minutes bold as the key figure', () => {
    const { container } = render(<PlayerFiguresTable {...props} rows={[...rows].reverse()} />)

    expect(screen.getAllByRole('rowheader').map((header) => header.textContent)).toEqual([
      'Testvoort',
      'Gerrit Nepper',
      'Wouter Proefman',
    ])
    expect(container.querySelectorAll('td.hf-key')).toHaveLength(3)
    expect([...container.querySelectorAll('td.hf-key')].map((cell) => cell.textContent)).toEqual(['905', '0', '1710'])
  })

  it('says under the table what the icons are, in the order of the columns, and how a yellow-red card counts', () => {
    const { container } = render(<PlayerFiguresTable {...props} />)

    expect([...container.querySelectorAll('.hf-table-legend-item')].map((item) => item.textContent?.trim())).toEqual([
      'minuten',
      'basis',
      'gewisseld',
      'ingevallen',
      'doelpunten',
      'assists',
      'geel',
      'rood',
    ])
    expect(container.querySelector('.hf-bar-legend')?.textContent).toMatch(
      /\. Een geel-rode kaart telt als een gele en een rode\.$/u,
    )
  })

  it('has no bars and no place column', () => {
    const { container } = render(<PlayerFiguresTable {...props} />)

    expect(container.querySelector('.hf-bar')).toBeNull()
    expect(screen.queryByRole('columnheader', { name: 'plaats' })).toBeNull()
  })
})
