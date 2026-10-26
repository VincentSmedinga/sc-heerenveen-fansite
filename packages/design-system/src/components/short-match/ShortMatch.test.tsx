import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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
