import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { WinnerList, type WinnerListItem } from './WinnerList'

const vente: WinnerListItem = { average: '7,8', line: 'Thuis tegen Sparta Rotterdam, 3–1', name: 'Dylan Vente' }
const noppert: WinnerListItem = { average: '7,4', line: 'Uit tegen Ajax, 2–2', name: 'Andries Noppert' }

describe('WinnerList', () => {
  it('is a list with a row for each match', () => {
    render(<WinnerList items={[vente, noppert]} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('says the name, the match and the average, and the average as a grade', () => {
    render(<WinnerList items={[vente]} />)

    expect(screen.getByRole('listitem').textContent).toBe(
      'Dylan VenteThuis tegen Sparta Rotterdam, 3–1Gemiddeld cijfer 7,8',
    )
  })
})

describe('the look of the list', () => {
  const css = readFileSync(join(import.meta.dirname, 'winner-list.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('puts the average in a column of its own', () => {
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) max-content;')
  })
})
