import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OnThisDay } from './OnThisDay'

const matches = [
  { clubs: 'Testdorp FC – sc Heerenveen', score: '1–3', year: '2023' },
  { clubs: 'sc Heerenveen – Proef Boys', score: '2–1', year: '1990' },
]

describe('OnThisDay', () => {
  it('has the date as an h2 that names the card', () => {
    render(<OnThisDay intro="Twee keer." matches={matches} title="Op deze dag: 11 november" />)

    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Op deze dag: 11 november')
    expect(screen.getByRole('region', { name: 'Op deze dag: 11 november' })).toBeTruthy()
  })

  it('lists the year, the clubs and the result of each match, in the order given', () => {
    render(<OnThisDay intro="Twee keer." matches={matches} title="Op deze dag: 11 november" />)
    const items = within(screen.getByRole('list')).getAllByRole('listitem')

    expect(items.map((item) => item.textContent)).toEqual([
      '2023Testdorp FC – sc Heerenveen1–3',
      '1990sc Heerenveen – Proef Boys2–1',
    ])
  })

  it('has the link under the matches, and none without it', () => {
    const { container, rerender } = render(
      <OnThisDay intro="Twee keer." matches={matches} title="Titel">
        <a href="/maand">Alle wedstrijden in november</a>
      </OnThisDay>,
    )

    expect(screen.getByRole('link', { name: 'Alle wedstrijden in november' })).toBeTruthy()

    rerender(<OnThisDay intro="Twee keer." matches={matches} title="Titel" />)

    expect(container.querySelector('.hf-on-this-day-more')).toBeNull()
  })
})
