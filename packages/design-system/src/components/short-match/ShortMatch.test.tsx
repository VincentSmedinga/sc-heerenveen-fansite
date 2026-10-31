import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Match } from '../match/Match'
import { outcomeOf } from '../outcome'
import { ShortMatch, type ShortMatchProps } from './ShortMatch'

const props: ShortMatchProps = {
  dateTime: '2026-10-24',
  goalsAgainst: 0,
  goalsFor: 3,
  home: true,
  opponent: 'Testdorp FC',
  time: 'za 24 okt',
}

describe('ShortMatch', () => {
  it('writes the day, the opponent with where it was played, and the result', () => {
    const { container } = render(<ShortMatch {...props} />)

    expect(container.querySelector('time')?.textContent).toBe('za 24 okt')
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-24')
    expect(container.querySelector('.hf-short-match-opponent')?.textContent).toBe('Testdorp FC · thuis')
    expect(container.querySelector('.hf-short-match-score [aria-hidden]')?.textContent).toBe('3–0')
  })

  it('says "uit" for a match away', () => {
    const { container } = render(<ShortMatch {...props} home={false} />)

    expect(container.querySelector('.hf-short-match-where')?.textContent).toBe('uit')
  })

  it('shows the result from the side of sc Heerenveen, whichever side it played on', () => {
    const { container } = render(<ShortMatch {...props} goalsFor={1} home={false} />)

    expect(container.querySelector('.hf-short-match-score [aria-hidden]')?.textContent).toBe('1–0')
  })

  it('lets a screen reader hear the result as "3 tegen 0"', () => {
    const { container } = render(<ShortMatch {...props} />)

    expect(container.querySelector('.hf-short-match-score .hf-visually-hidden')?.textContent).toBe('3 tegen 0')
  })

  it.each([
    { away: 0, expected: 'win', home: true, ours: 3 },
    { away: 0, expected: 'win', home: false, ours: 1 },
    { away: 2, expected: 'loss', home: true, ours: 0 },
    { away: 3, expected: 'loss', home: false, ours: 1 },
    { away: 1, expected: 'draw', home: true, ours: 1 },
    { away: 0, expected: 'draw', home: false, ours: 0 },
  ])('colours a $expected for sc Heerenveen ($ours–$away, home: $home) with the class of Match', (row) => {
    const { container } = render(<ShortMatch {...props} goalsAgainst={row.away} goalsFor={row.ours} home={row.home} />)
    const score = container.querySelector('.hf-short-match-score')

    expect(score?.classList.contains(`hf-match-${row.expected}`)).toBe(true)
    expect(score?.classList.length).toBe(2)
  })

  it('does not change what a screen reader hears for any outcome', () => {
    const { container, rerender } = render(<ShortMatch {...props} goalsAgainst={2} goalsFor={0} />)

    expect(container.querySelector('.hf-short-match-score .hf-visually-hidden')?.textContent).toBe('0 tegen 2')

    rerender(<ShortMatch {...props} goalsAgainst={1} goalsFor={1} />)

    expect(container.querySelector('.hf-short-match-score .hf-visually-hidden')?.textContent).toBe('1 tegen 1')
  })

  it('uses the same rule for the outcome as Match, for every score from 0–0 to 4–4 and from either side', () => {
    for (const home of [true, false]) {
      for (let goalsFor = 0; goalsFor <= 4; goalsFor += 1) {
        for (let goalsAgainst = 0; goalsAgainst <= 4; goalsAgainst += 1) {
          const short = render(<ShortMatch {...props} goalsAgainst={goalsAgainst} goalsFor={goalsFor} home={home} />)
          const full = render(
            <Match
              competition="Eredivisie"
              dateTime="2026-10-24T18:45:00Z"
              goalsAgainst={goalsAgainst}
              goalsFor={goalsFor}
              home={home}
              opponent="Testdorp FC"
              round="Speelronde 1"
              status="played"
              time="za 24 okt 20:45"
            />,
          )

          expect(
            short.container
              .querySelector('.hf-short-match-score')
              ?.classList.contains(`hf-match-${outcomeOf(goalsFor, goalsAgainst)}`),
          ).toBe(true)
          expect(
            full.container
              .querySelector('.hf-match-score')
              ?.classList.contains(`hf-match-${outcomeOf(goalsFor, goalsAgainst)}`),
          ).toBe(true)

          short.unmount()
          full.unmount()
        }
      }
    }
  })

  it('has no competition, round, stadium, scorers or name of our own club', () => {
    const { container } = render(<ShortMatch {...props} />)

    expect(container.textContent).not.toContain('sc Heerenveen')
    expect(container.querySelector('.hf-match-label, .hf-match-goals')).toBeNull()
  })

  it('passes other props and a class name on to the div', () => {
    const { container } = render(<ShortMatch {...props} className="extra" id="regel" />)

    expect(container.firstElementChild?.className).toBe('hf-short-match extra')
    expect(container.firstElementChild?.id).toBe('regel')
  })
})
