import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MatchHeader, type MatchHeaderProps } from './MatchHeader'

const props: MatchHeaderProps = {
  facts: [
    { label: 'Competitie', value: 'Eredivisie, Speelronde 1' },
    { label: 'Stadion', value: 'Stadion Proeflaan' },
  ],
  goalsAgainst: 0,
  goalsFor: 6,
  home: true,
  opponent: 'Testdorp FC',
}

describe('MatchHeader', () => {
  it('names the home club first and gives the first number to it', () => {
    const { container } = render(<MatchHeader {...props} />)

    expect(container.querySelector('.hf-match-header-clubs')?.textContent).toBe(
      'sc Heerenveen 6–06 tegen 0 Testdorp FC',
    )
  })

  it('puts the opponent first and turns the result around for a match away', () => {
    const { container } = render(<MatchHeader {...props} home={false} />)

    expect(container.querySelector('.hf-match-header-clubs')?.textContent).toBe(
      'Testdorp FC 0–60 tegen 6 sc Heerenveen',
    )
    expect(container.querySelector('.hf-match-header-score [aria-hidden]')?.textContent).toBe('0–6')
  })

  it('gives the result the colour of the outcome for sc Heerenveen, home or away', () => {
    const score = (extra: Partial<MatchHeaderProps>) =>
      render(<MatchHeader {...props} {...extra} />).container.querySelector('.hf-match-header-score')?.className

    expect(score({})).toContain('hf-match-win')
    expect(score({ goalsAgainst: 3, goalsFor: 0 })).toContain('hf-match-loss')
    expect(score({ goalsAgainst: 1, goalsFor: 1 })).toContain('hf-match-draw')
    expect(score({ goalsAgainst: 0, goalsFor: 2, home: false })).toContain('hf-match-win')
  })

  it('says nothing about extra time for a match of 90 minutes', () => {
    expect(render(<MatchHeader {...props} />).container.querySelector('.hf-match-header-how')).toBeNull()
  })

  it('says in words that there was extra time, with the score after 90 minutes and the shoot-out', () => {
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

    expect(container.querySelector('.hf-match-header-how')?.textContent).toBe(
      'Na verlenging. Na 90 minuten 1–1. Na strafschoppen 5–4.',
    )
    expect(container.querySelector('.hf-match-header-score')?.className).toContain('hf-match-win')
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

    expect(container.querySelector('.hf-match-header-how')?.textContent).toBe('Na verlenging. Na strafschoppen 4–3.')
    expect(container.querySelector('.hf-match-header-score')?.className).toContain('hf-match-loss')
  })

  it('lists the facts as terms and values, in the order given', () => {
    const { container } = render(<MatchHeader {...props} />)

    expect([...container.querySelectorAll('dt')].map((term) => term.textContent)).toEqual(['Competitie', 'Stadion'])
    expect([...container.querySelectorAll('dd')].map((value) => value.textContent)).toEqual([
      'Eredivisie, Speelronde 1',
      'Stadion Proeflaan',
    ])
  })
})
