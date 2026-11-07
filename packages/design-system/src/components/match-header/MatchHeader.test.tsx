import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MatchHeader, type MatchHeaderProps } from './MatchHeader'

const props: MatchHeaderProps = {
  facts: [
    { label: 'Competitie', value: 'Eredivisie' },
    { label: 'Ronde', value: 'Speelronde 1' },
    { label: 'Stadion', value: 'Stadion Proeflaan' },
  ],
  goalsAgainst: 0,
  goalsFor: 6,
  home: true,
  opponent: 'Testdorp FC',
}

const names = (container: HTMLElement) =>
  [...container.querySelectorAll('.hf-match-header-name')].map((name) => name.textContent)

const text = (container: HTMLElement, selector: string) => container.querySelector(selector)?.textContent

describe('MatchHeader', () => {
  it('names the home club first and gives the first number to it', () => {
    const { container } = render(<MatchHeader {...props} />)

    expect(names(container)).toEqual(['sc Heerenveen', 'Testdorp FC'])
    expect(text(container, '.hf-match-header-result')).toBe('6–0')
  })

  it('puts the opponent first and turns the result around for a match away', () => {
    const { container } = render(<MatchHeader {...props} home={false} />)

    expect(names(container)).toEqual(['Testdorp FC', 'sc Heerenveen'])
    expect(text(container, '.hf-match-header-result')).toBe('0–6')
  })

  it('writes the result in words for a screen reader and hides the figures from it', () => {
    const { container } = render(<MatchHeader {...props} />)

    expect(text(container, '.hf-visually-hidden')).toBe('Eindstand: 6 tegen 0')
    expect(container.querySelector('.hf-match-header-result')?.getAttribute('aria-hidden')).toBe('true')
    expect(
      [...container.querySelectorAll('.hf-match-header-goals')].map((goals) => goals.getAttribute('aria-hidden')),
    ).toEqual(['true', 'true'])
  })

  it('shows the goals of each club beside its name, for a narrow place', () => {
    const { container } = render(<MatchHeader {...props} />)

    expect([...container.querySelectorAll('.hf-match-header-goals')].map((goals) => goals.textContent)).toEqual([
      '6',
      '0',
    ])
  })

  it('says the outcome in a pill with a word, and gives the result its colour', () => {
    const outcome = (extra: Partial<MatchHeaderProps>) => {
      const { container } = render(<MatchHeader {...props} {...extra} />)

      return [
        text(container, '.hf-match-header-outcome'),
        container.querySelector('.hf-match-header-result')?.className,
      ]
    }

    expect(outcome({})).toEqual(['Gewonnen', expect.stringContaining('hf-match-win')])
    expect(outcome({ goalsAgainst: 3, goalsFor: 0 })).toEqual(['Verloren', expect.stringContaining('hf-match-loss')])
    expect(outcome({ goalsAgainst: 1, goalsFor: 1 })).toEqual(['Gelijkspel', expect.stringContaining('hf-match-draw')])
    expect(outcome({ goalsAgainst: 0, goalsFor: 2, home: false })).toEqual([
      'Gewonnen',
      expect.stringContaining('hf-match-win'),
    ])
  })

  it('says nothing about extra time for a match of 90 minutes', () => {
    expect(render(<MatchHeader {...props} />).container.querySelector('.hf-match-header-how')).toBeNull()
  })

  it('says in words that there was extra time, with the score after 90 minutes', () => {
    const { container } = render(
      <MatchHeader {...props} afterNinetyAgainst={1} afterNinetyFor={1} extraTime goalsAgainst={0} goalsFor={2} />,
    )

    expect(text(container, '.hf-match-header-how')).toBe('Na verlenging (na 90 minuten 1–1)')
  })

  it('says the shoot-out first and the score after extra time between brackets', () => {
    const { container } = render(
      <MatchHeader
        {...props}
        afterNinetyAgainst={1}
        afterNinetyFor={1}
        extraTime
        goalsAgainst={1}
        goalsFor={1}
        penaltiesAgainst={4}
        penaltiesFor={5}
      />,
    )

    expect(text(container, '.hf-match-header-how')).toBe('Na strafschoppen 5–4 (na verlenging 1–1)')
    // The shoot-out decides a level score, so the pill follows it.
    expect(text(container, '.hf-match-header-outcome')).toBe('Gewonnen')
    expect(container.querySelector('.hf-match-header-result')?.className).toContain('hf-match-win')
  })

  it('turns the shoot-out around too when we play away', () => {
    const { container } = render(
      <MatchHeader
        {...props}
        extraTime
        goalsAgainst={1}
        goalsFor={1}
        home={false}
        penaltiesAgainst={4}
        penaltiesFor={3}
      />,
    )

    expect(text(container, '.hf-match-header-how')).toBe('Na strafschoppen 4–3 (na verlenging 1–1)')
    expect(text(container, '.hf-match-header-outcome')).toBe('Verloren')
  })

  it('lists the scorers under each club in small letters, with the minute and the added time', () => {
    const { container } = render(
      <MatchHeader
        {...props}
        scorersAgainst={[{ minute: 80, player: 'Wiersma' }]}
        scorersFor={[
          { minute: 12, player: 'Hoekstra' },
          { minute: 45, player: 'Demo', stoppageMinutes: 2 },
        ]}
      />,
    )
    const lists = [...container.querySelectorAll('.hf-match-header-scorers')]

    expect(lists.map((list) => list.querySelector('[aria-hidden]')?.textContent)).toEqual([
      'Hoekstra 12’',
      'Wiersma 80’',
    ])
    expect([...lists[0]!.querySelectorAll('[aria-hidden]')].map((part) => part.textContent)).toEqual([
      'Hoekstra 12’',
      ' · ',
      'Demo 45’+2',
    ])
  })

  it('writes "str." and "e.d." as abbreviations, and in full for a screen reader', () => {
    const { container } = render(
      <MatchHeader
        {...props}
        scorersFor={[
          { minute: 58, penalty: true, player: 'Wiersma' },
          { minute: 70, ownGoal: true, player: 'Proefveld' },
        ]}
      />,
    )
    const list = container.querySelector('.hf-match-header-scorers')!

    expect(list.textContent).toContain('Wiersma 58’ (str.)')
    expect(list.textContent).toContain('Proefveld 70’ (e.d.)')
    expect([...list.querySelectorAll('abbr')].map((abbr) => abbr.getAttribute('title'))).toEqual([
      'strafschop',
      'eigen doelpunt',
    ])
    expect(list.textContent).toContain('Wiersma, minuut 58, strafschop')
    expect(list.textContent).toContain('Proefveld, minuut 70, eigen doelpunt')
    expect(list.textContent).toContain('Doelpunten sc Heerenveen: ')
  })

  it('shows no line of scorers for a club without goals or without a list', () => {
    const { container } = render(<MatchHeader {...props} scorersFor={[]} />)

    expect(container.querySelector('.hf-match-header-scorers')).toBeNull()
  })

  it('lists the facts as terms and values, in the order given, with the round as a fact of its own', () => {
    const { container } = render(<MatchHeader {...props} />)

    expect([...container.querySelectorAll('dt')].map((term) => term.textContent)).toEqual([
      'Competitie',
      'Ronde',
      'Stadion',
    ])
    expect([...container.querySelectorAll('dd')].map((value) => value.textContent)).toEqual([
      'Eredivisie',
      'Speelronde 1',
      'Stadion Proeflaan',
    ])
  })
})
