import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MatchNeighbours } from './MatchNeighbours'

describe('MatchNeighbours', () => {
  it('links to both matches, "Vorige" with the arrow in front and "Volgende" with the arrow behind', () => {
    const { container } = render(
      <MatchNeighbours
        next={{ club: 'Voorbeeld United', goalsAgainst: 1, goalsFor: 1, home: false, href: '/b' }}
        previous={{ club: 'Testdorp FC', goalsAgainst: 1, goalsFor: 2, home: true, href: '/a' }}
      />,
    )
    const links = container.querySelectorAll('a')

    expect(links).toHaveLength(2)
    expect(links[0]?.getAttribute('href')).toBe('/a')
    expect(links[0]?.textContent).toBe('Vorige: Testdorp FC (thuis) 2–1 Gewonnen')
    expect(links[0]?.firstElementChild?.className).toBe('hf-icon-head')
    expect(links[1]?.getAttribute('href')).toBe('/b')
    expect(links[1]?.textContent).toBe('Volgende: Voorbeeld United (uit) 1–1 Gelijkspel')
    expect(links[1]?.lastElementChild?.className).toBe('hf-icon-tail')
  })

  it('colours the result by the outcome for sc Heerenveen and hides the words from the eye', () => {
    const { container } = render(
      <MatchNeighbours previous={{ club: 'Testdorp FC', goalsAgainst: 3, goalsFor: 0, home: false, href: '/a' }} />,
    )

    expect(container.querySelector('.hf-match-neighbours-score.hf-match-loss')?.textContent).toBe('0–3 Verloren')
    expect(container.querySelector('.hf-visually-hidden')?.textContent).toBe(' Verloren')
  })

  it('follows the shoot-out when there was one', () => {
    const { container } = render(
      <MatchNeighbours
        previous={{
          club: 'Testdorp FC',
          goalsAgainst: 1,
          goalsFor: 1,
          home: true,
          href: '/a',
          penaltiesAgainst: 5,
          penaltiesFor: 4,
        }}
      />,
    )

    expect(container.querySelector('.hf-match-loss')).not.toBeNull()
  })

  it('shows the day, a word or nothing coloured for a match without a result', () => {
    const { container } = render(
      <MatchNeighbours
        next={{ club: 'Voorbeeld United', home: false, href: '/b', state: 'zo 1 nov', stateDateTime: '2026-11-01' }}
        previous={{ club: 'Testdorp FC', home: true, href: '/a', state: 'Uitgesteld' }}
      />,
    )

    expect(container.querySelector('time')?.getAttribute('datetime')).toBe('2026-11-01')
    expect(container.textContent).toBe(
      'Vorige: Testdorp FC (thuis) UitgesteldVolgende: Voorbeeld United (uit) zo 1 nov',
    )
    expect(container.querySelector('.hf-match-neighbours-score')).toBeNull()
  })

  it('shows a match without a page as text with the same build, and leaves a missing side out', () => {
    const { container } = render(
      <MatchNeighbours next={{ club: 'Testdorp FC', goalsAgainst: 0, goalsFor: 0, home: true }} />,
    )

    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelectorAll('li')).toHaveLength(1)
    expect(container.querySelector('li')?.getAttribute('data-side')).toBe('next')
    expect(container.textContent).toBe('Volgende: Testdorp FC (thuis) 0–0 Gelijkspel')
  })

  it('is a transparent card with a named navigation', () => {
    const { container } = render(<MatchNeighbours previous={{ club: 'A', goalsAgainst: 0, goalsFor: 1, home: true }} />)

    expect(container.querySelector('nav')?.getAttribute('aria-label')).toBe('Vorige en volgende wedstrijd')
    expect(container.querySelector('.hf-card')).not.toBeNull()
  })
})
