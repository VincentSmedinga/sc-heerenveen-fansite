import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PredictionCrowd } from './PredictionCrowd'

describe('PredictionCrowd', () => {
  it('says only how many predicted when there is nothing else', () => {
    const { container } = render(<PredictionCrowd>48 fans voorspelden deze wedstrijd.</PredictionCrowd>)

    expect(screen.getByText('48 fans voorspelden deze wedstrijd.')).toBeTruthy()
    expect(container.querySelector('.hf-outcome-bar')).toBeNull()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('heading')).toBeNull()
  })

  it('writes the outcomes in words next to the bar', () => {
    const { container } = render(
      <PredictionCrowd outcomes={{ draws: 13, losses: 8, wins: 33 }}>
        54 fans voorspelden deze wedstrijd.
      </PredictionCrowd>,
    )

    expect(container.querySelector('.hf-outcome-bar')).not.toBeNull()
    expect(screen.getByText('Winst 33 · Gelijk 13 · Verlies 8')).toBeTruthy()
  })

  it('marks the outcome and the score that were played in words', () => {
    render(
      <PredictionCrowd
        outcomes={{ actual: 'win', draws: 13, losses: 8, wins: 33 }}
        scores={[
          { actual: true, count: 14, label: '2–1' },
          { count: 9, label: '1–0' },
          { count: 5, label: 'anders' },
        ]}
      >
        54 fans voorspelden deze wedstrijd.
      </PredictionCrowd>,
    )

    expect(screen.getByText('Winst 33 (uitslag) · Gelijk 13 · Verlies 8')).toBeTruthy()

    const rows = within(screen.getByRole('list', { name: /Meest voorspelde eindstanden/ })).getAllByRole('listitem')

    expect(rows.map((row) => row.textContent)).toEqual(['2–1 (uitslag)14', '1–09', 'anders5'])
    expect(rows.map((row) => row.classList.contains('hf-bar-list-highlight'))).toEqual([true, false, false])
    expect(rows[0]?.querySelector('strong')?.textContent).toBe('2–1')
  })

  it('marks no row when the score that was played is not in the list', () => {
    const { container } = render(
      <PredictionCrowd
        outcomes={{ actual: 'win', draws: 13, losses: 8, wins: 33 }}
        scores={[
          { count: 9, label: '1–0' },
          { count: 5, label: 'anders' },
        ]}
      >
        54 fans voorspelden deze wedstrijd.
      </PredictionCrowd>,
    )

    expect(container.querySelector('.hf-bar-list-highlight, strong')).toBeNull()
  })

  it('puts the key figures above the line and the list under a heading of the level asked', () => {
    render(
      <PredictionCrowd
        figures={[
          { figure: '1,9–0,8', label: 'gemiddeld voorspeld', note: 'van 54 voorspellingen' },
          { figure: '14', label: 'precies goed', note: '26 procent' },
        ]}
        headingLevel={4}
        scores={[{ count: 14, label: '2–1' }]}
      >
        54 fans voorspelden deze wedstrijd.
      </PredictionCrowd>,
    )

    expect(screen.getByText('1,9–0,8')).toBeTruthy()
    expect(screen.getByRole('heading', { level: 4, name: 'Meest voorspelde eindstanden' })).toBeTruthy()
  })
})
