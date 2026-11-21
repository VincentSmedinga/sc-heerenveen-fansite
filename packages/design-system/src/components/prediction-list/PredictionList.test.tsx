import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { PredictionList, type PredictionListItem } from './PredictionList'

const played: PredictionListItem = {
  away: 'FC Twente',
  date: 'za 21 nov',
  dateTime: '2026-11-21',
  home: 'sc Heerenveen',
  points: 17,
  prediction: 'Jij: 1–0 bij rust, 3–1 eind',
  score: '2–1',
}

const waiting: PredictionListItem = {
  away: 'Ajax',
  date: 'za 28 nov',
  dateTime: '2026-11-28',
  home: 'sc Heerenveen',
  prediction: 'Jij: 0–0 bij rust, 1–1 eind',
  status: 'Nog niet gespeeld',
}

describe('PredictionList', () => {
  it('is a list with a row for each match', () => {
    render(<PredictionList items={[played, waiting]} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('says the day, the clubs with the score, the prediction and the points', () => {
    render(<PredictionList items={[played]} />)
    const row = screen.getByRole('listitem')

    expect(within(row).getByText('za 21 nov').getAttribute('datetime')).toBe('2026-11-21')
    expect(row.textContent).toContain('sc Heerenveen2–1FC Twente')
    expect(within(row).getByText('Jij: 1–0 bij rust, 3–1 eind')).toBeTruthy()
    expect(within(row).getByText('17')).toBeTruthy()
    expect(within(row).getByText('punten')).toBeTruthy()
  })

  it('says punt for one point', () => {
    render(<PredictionList items={[{ ...played, points: 1 }]} />)

    expect(screen.getByText('punt')).toBeTruthy()
  })

  it('shows the state and no points for a match without a result, never 0', () => {
    render(<PredictionList items={[waiting]} />)

    expect(screen.getByText('Nog niet gespeeld')).toBeTruthy()
    expect(screen.queryByText('0')).toBeNull()
    expect(screen.queryByText('punten')).toBeNull()
  })
})

describe('the look of the list', () => {
  const css = readFileSync(join(import.meta.dirname, 'prediction-list.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('cuts a club name short and keeps the score whole', () => {
    expect(css).toContain('text-overflow: ellipsis;')
    expect(css).toMatch(/\.hf-prediction-list-score \{[^}]*flex: none;[^}]*white-space: nowrap;/s)
  })

  it('puts the points in a column of their own', () => {
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) max-content;')
  })
})
