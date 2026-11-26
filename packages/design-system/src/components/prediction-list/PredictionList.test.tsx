import { render, screen, within } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { contrast, fallback, role } from '../../tokens/colourRoles'
import { PredictionList, type PredictionListItem } from './PredictionList'

const played: PredictionListItem = {
  match: {
    competition: 'Eredivisie',
    dateTime: '2026-11-21',
    goalsAgainst: 1,
    goalsFor: 2,
    home: true,
    opponent: 'FC Twente',
    round: 'Speelronde 12',
    status: 'played',
    time: 'za 21 nov',
  },
  points: 17,
  prediction: { fullTime: { right: true, score: '3–1' }, halfTime: { right: false, score: '1–0' } },
}

const waiting: PredictionListItem = {
  match: {
    competition: 'Eredivisie',
    dateTime: '2026-11-29',
    home: true,
    opponent: 'Ajax',
    round: 'Speelronde 14',
    status: 'scheduled',
    time: 'zo 29 nov',
  },
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
    expect(row.querySelector('.hf-match-clubs')?.textContent).toContain('sc Heerenveen')
    expect(row.querySelector('.hf-match-score [aria-hidden]')?.textContent).toBe('2–1')
    expect(row.querySelector('.hf-match-clubs')?.textContent).toContain('FC Twente')
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

    expect(container.querySelector('.hf-prediction-list-side .hf-visually-hidden')?.textContent).toBe(
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
    expect(container.querySelector('.hf-prediction-list-side .hf-visually-hidden')?.textContent).toBe(
      'Jouw voorspelling: eind 1–1, rust 0–0',
    )
  })

  it('shows the result of the match in the colour of the outcome, as a Match does', () => {
    const { container } = render(<PredictionList items={[played]} />)

    expect(container.querySelector('.hf-match-win')?.textContent).toContain('2–1')
  })

  it('says Bezig for a match that is being played, and Geannuleerd for one that is called off', () => {
    const { container } = render(
      <PredictionList
        items={[
          { ...waiting, match: { ...waiting.match, note: 'Bezig' } },
          {
            ...waiting,
            match: {
              competition: 'KNVB Beker',
              home: false,
              opponent: 'Utrecht',
              round: 'Tweede ronde',
              status: 'cancelled',
            },
          },
        ]}
      />,
    )

    expect(container.textContent).toContain('Bezig')
    expect(container.textContent).toContain('Geannuleerd')
  })
})

describe('a prediction in words', () => {
  it('stands under the clubs as text, with no written score and no hidden words', () => {
    const { container } = render(<PredictionList items={[{ ...played, prediction: 'Ben, Jan, Piet en Klaas' }]} />)

    expect(container.querySelector('.hf-prediction-list-text .hf-prediction-list-prediction')?.textContent).toBe(
      'Ben, Jan, Piet en Klaas',
    )
    expect(container.querySelector('.hf-prediction-list-guess')).toBeNull()
    expect(container.querySelector('.hf-prediction-list-side .hf-visually-hidden')).toBeNull()
    expect(screen.getByText('17')).toBeTruthy()
  })
})

describe('the look of the list', () => {
  const css = readFileSync(join(import.meta.dirname, 'prediction-list.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

  it('puts the points and the prediction under the match when the list itself has little room', () => {
    const narrow = css.slice(css.indexOf('@container hf-prediction-list (inline-size < 13rem)'))

    expect(css).toContain('container: hf-prediction-list / inline-size;')
    expect(narrow).toMatch(/\.hf-prediction-list-item \{\s*grid-template-columns: minmax\(0, 1fr\);/)
    expect(narrow).toMatch(/\.hf-prediction-list-side \{[^}]*flex-wrap: wrap;/)
    expect(narrow).toMatch(/\.hf-prediction-list-side \{[^}]*text-align: start;/)
    expect(narrow).toMatch(/\.hf-prediction-list-side \{[^}]*white-space: normal;/)
  })

  it('never cuts text short, and takes the space of the Match out of the row', () => {
    expect(css).not.toContain('text-overflow')
    expect(css).not.toContain('overflow: hidden')
    expect(css).toMatch(/\.hf-prediction-list-text \.hf-match \{[^}]*padding-block: 0;/s)
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
