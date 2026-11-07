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
  it('writes the day and the two clubs with the result between them, the home club first', () => {
    const { container } = render(<ShortMatch {...props} />)

    expect(container.querySelector('time')?.textContent).toBe('za 24 okt')
    expect(container.querySelector('time')?.getAttribute('datetime')).toBe('2026-10-24')
    expect(container.querySelector('.hf-short-match-clubs')?.textContent).toBe('sc Heerenveen 3–03 tegen 0 Testdorp FC')
    expect(container.querySelector('.hf-short-match-score [aria-hidden]')?.textContent).toBe('3–0')
  })

  it('puts the opponent first and turns the result around for a win away', () => {
    const { container } = render(<ShortMatch {...props} home={false} />)
    const clubs = [...(container.querySelector('.hf-short-match-clubs')?.children ?? [])]

    expect(clubs.map((part) => part.textContent)).toEqual(['Testdorp FC', '0–30 tegen 3', 'sc Heerenveen'])
    expect(container.querySelector('.hf-short-match-score [aria-hidden]')?.textContent).toBe('0–3')
  })

  it('shows the goals of the home club first, whichever club is ours', () => {
    const { container } = render(<ShortMatch {...props} goalsAgainst={0} goalsFor={1} home={false} />)

    expect(container.querySelector('.hf-short-match-score [aria-hidden]')?.textContent).toBe('0–1')
  })

  it('gives a cup match the colour of the shoot-out, and lets a screen reader hear it', () => {
    const won = render(<ShortMatch {...props} goalsAgainst={1} goalsFor={1} penaltiesAgainst={3} penaltiesFor={4} />)
    const lost = render(
      <ShortMatch {...props} goalsAgainst={1} goalsFor={1} home={false} penaltiesAgainst={5} penaltiesFor={4} />,
    )
    const draw = render(<ShortMatch {...props} goalsAgainst={1} goalsFor={1} />)

    expect(won.container.querySelector('.hf-short-match-score')?.classList.contains('hf-match-win')).toBe(true)
    expect(won.container.querySelector('.hf-short-match-score [aria-hidden]')?.textContent).toBe('1–1')
    expect(won.container.querySelector('.hf-visually-hidden')?.textContent).toBe(
      '1 tegen 1, na strafschoppen 4 tegen 3',
    )
    expect(lost.container.querySelector('.hf-short-match-score')?.classList.contains('hf-match-loss')).toBe(true)
    expect(lost.container.querySelector('.hf-visually-hidden')?.textContent).toBe(
      '1 tegen 1, na strafschoppen 5 tegen 4',
    )
    expect(draw.container.querySelector('.hf-short-match-score')?.classList.contains('hf-match-draw')).toBe(true)
    expect(draw.container.querySelector('.hf-visually-hidden')?.textContent).toBe('1 tegen 1')
  })

  it('does not say "thuis" or "uit": the order says where it was played', () => {
    const home = render(<ShortMatch {...props} />)
    const away = render(<ShortMatch {...props} home={false} />)

    expect(home.container.textContent).not.toMatch(/thuis|uit/u)
    expect(away.container.textContent).not.toMatch(/thuis|uit/u)
  })

  it('lets a screen reader hear the same order as the eyes see, with the names of the clubs', () => {
    const home = render(<ShortMatch {...props} />)
    const away = render(<ShortMatch {...props} home={false} />)

    expect(home.container.querySelector('.hf-short-match-clubs')?.textContent).toContain(
      'sc Heerenveen 3–03 tegen 0 Testdorp FC',
    )
    expect(away.container.querySelector('.hf-short-match-score .hf-visually-hidden')?.textContent).toBe('0 tegen 3')
    expect(away.container.querySelector('.hf-short-match-clubs')?.textContent).toContain(
      'Testdorp FC 0–30 tegen 3 sc Heerenveen',
    )
  })

  it('makes the name of our own club heavier, on whichever side it stands', () => {
    const home = render(<ShortMatch {...props} />)
    const away = render(<ShortMatch {...props} home={false} />)

    expect(home.container.querySelector('.hf-short-match-own')?.textContent).toBe('sc Heerenveen')
    expect(home.container.querySelectorAll('.hf-short-match-own')).toHaveLength(1)
    expect(away.container.querySelector('.hf-short-match-own')?.textContent).toBe('sc Heerenveen')
    expect(away.container.querySelectorAll('.hf-short-match-own')).toHaveLength(1)
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

  it('hears the goals in the order of the clubs for every outcome', () => {
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

  it('has no competition, round, stadium or scorers', () => {
    const { container } = render(<ShortMatch {...props} />)

    expect(container.querySelector('.hf-match-label, .hf-match-goals')).toBeNull()
  })

  it('passes other props and a class name on to the div', () => {
    const { container } = render(<ShortMatch {...props} className="extra" id="regel" />)

    expect(container.firstElementChild?.className).toBe('hf-short-match extra')
    expect(container.firstElementChild?.id).toBe('regel')
  })
})
