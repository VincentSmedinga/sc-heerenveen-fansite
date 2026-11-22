import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, fallback, role } from '../../tokens/colourRoles'
import { PredictionList, type PredictionListItem } from './PredictionList'

const played: PredictionListItem = {
  away: 'FC Twente',
  competition: 'Eredivisie',
  date: 'za 21 nov',
  dateTime: '2026-11-21',
  home: 'sc Heerenveen',
  points: 17,
  prediction: { fullTime: { right: true, score: '3–1' }, halfTime: { right: false, score: '1–0' } },
  score: '2–1',
}

const waiting: PredictionListItem = {
  away: 'Ajax',
  competition: 'Eredivisie',
  date: 'zo 29 nov',
  dateTime: '2026-11-29',
  home: 'sc Heerenveen',
  prediction: { fullTime: { score: '1–1' }, halfTime: { score: '0–0' } },
}

describe('PredictionList', () => {
  it('is a list with a row for each match', () => {
    render(<PredictionList items={[played, waiting]} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('says the day and the competition, the clubs with the score, the points and the prediction', () => {
    render(<PredictionList items={[played]} />)
    const row = screen.getByRole('listitem')

    expect(within(row).getByText('za 21 nov').getAttribute('datetime')).toBe('2026-11-21')
    expect(within(row).getByText('Eredivisie')).toBeTruthy()
    expect(row.textContent).toContain('sc Heerenveen2–1FC Twente')
    expect(within(row).getByText('17')).toBeTruthy()
    expect(within(row).getByText('punten')).toBeTruthy()
    expect(row.querySelector('.hf-prediction-list-guess')?.textContent).toBe('✓3–1 (✗1–0)')
  })

  it('says punt for one point', () => {
    render(<PredictionList items={[{ ...played, points: 1 }]} />)

    expect(screen.getByText('punt')).toBeTruthy()
  })

  it('reads the prediction in words for a screen reader and hides the written one from it', () => {
    const { container } = render(<PredictionList items={[played]} />)

    expect(container.querySelector('.hf-visually-hidden')?.textContent).toBe(
      'Jouw voorspelling: eind 3–1, goed, rust 1–0, fout',
    )
    expect(container.querySelector('.hf-prediction-list-guess')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('colours the right part green and the wrong part red, each with its own sign', () => {
    const { container } = render(<PredictionList items={[played]} />)

    expect(container.querySelector('.hf-prediction-list-right')?.textContent).toBe('✓3–1')
    expect(container.querySelector('.hf-prediction-list-wrong')?.textContent).toBe('✗1–0')
  })

  it('shows only the prediction for a match without points, with no colour and never 0', () => {
    const { container } = render(<PredictionList items={[waiting]} />)

    expect(screen.queryByText('0')).toBeNull()
    expect(screen.queryByText('punten')).toBeNull()
    expect(container.querySelector('.hf-prediction-list-right')).toBeNull()
    expect(container.querySelector('.hf-prediction-list-wrong')).toBeNull()
    expect(container.querySelector('.hf-prediction-list-guess-large')?.textContent).toBe('1–1 (0–0)')
    expect(container.querySelector('.hf-visually-hidden')?.textContent).toBe('Jouw voorspelling: eind 1–1, rust 0–0')
  })

  it('puts the state between the day and the competition', () => {
    const { container } = render(<PredictionList items={[{ ...waiting, status: 'Afgelast' }]} />)

    expect(container.querySelector('.hf-prediction-list-meta')?.textContent).toBe('zo 29 novAfgelastEredivisie')
  })
})

describe('the look of the list', () => {
  const css = readFileSync(join(import.meta.dirname, 'prediction-list.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('wraps a long club name and never cuts text short, and keeps the score whole', () => {
    expect(css).toMatch(/\.hf-prediction-list-clubs \{[^}]*overflow-wrap: anywhere;/s)
    expect(css).not.toContain('text-overflow')
    expect(css).not.toContain('overflow: hidden')
    expect(css).toMatch(/\.hf-prediction-list-score \{[^}]*white-space: nowrap;/s)
  })

  it('puts the points and the prediction in a column of their own that never breaks', () => {
    expect(css).toContain('grid-template-columns: minmax(0, 1fr) max-content;')
    expect(css).toMatch(/\.hf-prediction-list-side \{[^}]*white-space: nowrap;/s)
  })

  it('colours the parts with the tokens for positive and negative text', () => {
    expect(css).toMatch(/\.hf-prediction-list-right \{[^}]*color: var\(--hf-colour-text-positive\);/s)
    expect(css).toMatch(/\.hf-prediction-list-wrong \{[^}]*color: var\(--hf-colour-text-negative\);/s)
  })

  it('reaches 4.5:1 for both colours on every surface, in light and in dark', () => {
    for (const surface of ['surface', 'surface-strong', 'surface-soft', 'surface-warm']) {
      for (const name of ['text-positive', 'text-negative']) {
        for (const theme of ['light', 'dark'] as const) {
          expect(contrast(role(name)[theme], role(`background-${surface}`)[theme])).toBeGreaterThanOrEqual(4.5)
        }
        expect(contrast(fallback(name), fallback(`background-${surface}`))).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
