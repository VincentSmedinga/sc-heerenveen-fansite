import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Match, type MatchProps } from './Match'

const played: MatchProps = {
  competition: 'Eredivisie',
  dateTime: '2026-10-11',
  goalsAgainst: 0,
  goalsFor: 2,
  home: true,
  opponent: 'Testdorp FC',
  round: 'Speelronde 9',
  stadium: 'Stadion Proeflaan',
  status: 'played',
  time: 'zo 11 okt',
}

const scheduled: MatchProps = {
  competition: 'Eredivisie',
  dateTime: '2026-11-01T13:30:00Z',
  home: false,
  opponent: 'Voorbeeld United',
  round: 'Speelronde 12',
  stadium: 'Voorbeeldpark',
  status: 'scheduled',
  time: 'zo 1 nov 14:30',
}

const textOf = (container: HTMLElement) => container.textContent.replace(/\s+/gu, ' ').trim()

describe('Match', () => {
  it('writes the competition and the round, the clubs and when and where', () => {
    const { container } = render(<Match {...scheduled} />)

    expect(container.querySelector('.hf-match-label')?.textContent).toBe('Eredivisie · Speelronde 12')
    expect(container.querySelector('.hf-match-clubs')?.textContent).toBe('Voorbeeld United –tegen sc Heerenveen')
    expect(container.querySelector('.hf-match-when')?.textContent).toBe('zo 1 nov 14:30 · Uit · Voorbeeldpark')
  })

  it('names the home club first, and says "Thuis" or "Uit"', () => {
    const { container, rerender } = render(<Match {...scheduled} home />)

    expect(container.querySelector('.hf-match-clubs')?.firstElementChild?.textContent).toBe('sc Heerenveen')
    expect(container.querySelector('.hf-match-when')?.textContent).toContain('Thuis')

    rerender(<Match {...scheduled} home={false} />)

    expect(container.querySelector('.hf-match-clubs')?.firstElementChild?.textContent).toBe('Voorbeeld United')
    expect(container.querySelector('.hf-match-when')?.textContent).toContain('Uit')
  })

  it('shows the result from the side of the home club, and a screen reader hears "tegen"', () => {
    const { container, rerender } = render(<Match {...played} />)
    const score = () => container.querySelector('.hf-match-score')

    expect(score()?.querySelector('[aria-hidden="true"]')?.textContent).toBe('2–0')
    expect(score()?.querySelector('.hf-visually-hidden')?.textContent).toBe('2 tegen 0')

    rerender(<Match {...played} goalsAgainst={3} goalsFor={1} home={false} />)

    expect(score()?.querySelector('[aria-hidden="true"]')?.textContent).toBe('3–1')
    expect(score()?.querySelector('.hf-visually-hidden')?.textContent).toBe('3 tegen 1')
  })

  it('shows a goalless draw as 0–0', () => {
    const { container } = render(<Match {...played} goalsAgainst={0} goalsFor={0} />)

    expect(container.querySelector('.hf-match-score [aria-hidden="true"]')?.textContent).toBe('0–0')
  })

  it('has a dash between the clubs of a match that is not played, and no result', () => {
    const { container } = render(<Match {...scheduled} />)

    expect(container.querySelector('.hf-match-score')?.className).toContain('hf-match-versus')
    expect(container.querySelector('.hf-match-score [aria-hidden="true"]')?.textContent).toBe('–')
  })

  it('puts the time in a time element with the machine value', () => {
    render(<Match {...scheduled} />)
    const time = screen.getByText('zo 1 nov 14:30')

    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2026-11-01T13:30:00Z')
  })

  it('writes a weekend as it is given, with the first day for machines', () => {
    render(<Match {...scheduled} dateTime="2027-02-12" time="weekend 12–14 februari" />)
    const time = screen.getByText('weekend 12–14 februari')

    expect(time.tagName).toBe('TIME')
    expect(time.getAttribute('datetime')).toBe('2027-02-12')
  })

  it('says "Uitgesteld" for a postponed match, without a time', () => {
    const { container } = render(
      <Match competition="Eredivisie" home opponent="Demo Boys" round="Speelronde 5" status="postponed" />,
    )

    expect(container.querySelector('.hf-match-postponed')?.textContent).toBe('Uitgesteld')
    expect(container.querySelector('time')).toBeNull()
    expect(container.querySelector('.hf-match-when')?.textContent).toBe('Uitgesteld · Thuis')
  })

  it('leaves out the stadium when it has none', () => {
    const { container } = render(<Match {...scheduled} stadium={null} />)

    expect(container.querySelector('.hf-match-when')?.textContent).toBe('zo 1 nov 14:30 · Uit')
  })

  it('marks our own club, and only that club', () => {
    const { container } = render(<Match {...scheduled} />)

    expect(container.querySelectorAll('.hf-match-own')).toHaveLength(1)
    expect(container.querySelector('.hf-match-own')?.textContent).toBe('sc Heerenveen')
  })

  it('has no link and no image: a match has no page of its own and no club badge', () => {
    const { container } = render(<Match {...played} />)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(container.querySelector('img, svg, picture')).toBeNull()
  })

  it('shows names as text, not as HTML', () => {
    // A string in braces: JSX would turn the &amp; in an attribute into a & itself.
    const { container } = render(<Match {...scheduled} opponent={'<b>FC</b> &amp; Co'} stadium="<i>Park</i>" />)

    expect(textOf(container)).toContain('<b>FC</b> &amp; Co')
    expect(container.querySelector('b, i')).toBeNull()
  })

  it('hides the dots between the parts from a screen reader, and keeps the spaces around them', () => {
    const { container } = render(<Match {...scheduled} />)

    expect([...container.querySelectorAll('[aria-hidden="true"]')].map((dot) => dot.textContent)).toEqual([
      '·',
      '–',
      '·',
      '·',
    ])
    expect(container.querySelector('.hf-match-label')?.innerHTML).toContain(
      'Eredivisie <span aria-hidden="true">·</span> Speelronde',
    )
  })

  it('is a div, passes other props on and adds its own class to a given one', () => {
    const { container } = render(<Match {...scheduled} className="extra" id="een" />)

    expect(container.firstElementChild?.tagName).toBe('DIV')
    expect(container.firstElementChild?.className).toBe('hf-match extra')
    expect(container.firstElementChild?.id).toBe('een')
  })

  it('needs the goals of a played match and has none for another', () => {
    const base = { competition: 'Eredivisie', home: true, opponent: 'Testdorp FC', round: 'Speelronde 9' }
    const when = { dateTime: '2026-10-11', time: 'zo 11 okt' }
    // @ts-expect-error A played match without a result is no match.
    const withoutGoals = <Match {...base} {...when} status="played" />
    // @ts-expect-error A match that is not played has no result.
    const withGoals = <Match {...base} {...when} goalsAgainst={0} goalsFor={1} status="scheduled" />

    expect(withoutGoals).toBeTruthy()
    expect(withGoals).toBeTruthy()
  })
})
