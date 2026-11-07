import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { MatchScoreBar, type MatchScoreBarGoal } from './MatchScoreBar'

const goal = (minute: number, ours: boolean, stoppageMinutes?: number): MatchScoreBarGoal => ({
  minute,
  ours,
  stoppageMinutes,
})

const pieces = (container: HTMLElement) =>
  [...container.querySelectorAll('.hf-match-score-bar-piece')].map((piece) =>
    ['win', 'draw', 'loss'].find((outcome) => piece.classList.contains(`hf-match-score-bar-${outcome}`)),
  )

describe('MatchScoreBar', () => {
  it('has the heading "Wedstrijdverloop" at the level given', () => {
    const { container } = render(<MatchScoreBar goals={[]} headingLevel={3} />)

    expect(container.querySelector('h3')?.textContent).toBe('Wedstrijdverloop')
  })

  it('colours a piece green while sc Heerenveen is ahead, grey when level and red when behind', () => {
    const { container } = render(
      <MatchScoreBar goals={[goal(10, true), goal(30, false), goal(50, false)]} headingLevel={2} />,
    )

    expect(pieces(container)).toEqual(['draw', 'win', 'draw', 'loss'])
  })

  it('counts a goal for the team that gains from it, so an own goal of sc Heerenveen is a goal for the opponent', () => {
    const { container } = render(<MatchScoreBar goals={[goal(10, false)]} headingLevel={2} />)

    expect(pieces(container)).toEqual(['draw', 'loss'])
  })

  it('writes the score of every piece for a screen reader, with its minutes', () => {
    const { container } = render(<MatchScoreBar goals={[goal(12, true), goal(34, false)]} headingLevel={2} />)

    expect(container.querySelector('.hf-visually-hidden')?.textContent).toBe(
      'Stand per moment: 0–0 van minuut 0 tot 12; 1–0 van minuut 12 tot 34; 1–1 van minuut 34 tot 90.',
    )
  })

  it('writes added time as "45+2" in the text for a screen reader', () => {
    const { container } = render(<MatchScoreBar goals={[goal(45, true, 2)]} headingLevel={2} />)

    expect(container.querySelector('.hf-visually-hidden')?.textContent).toContain(
      '0–0 van minuut 0 tot 45+2; 1–0 van minuut 45+2 tot 90',
    )
  })

  it('writes two goals in the same minute as one change of the score', () => {
    const { container } = render(<MatchScoreBar goals={[goal(30, true), goal(30, true)]} headingLevel={2} />)

    expect(container.querySelector('.hf-visually-hidden')?.textContent).toBe(
      'Stand per moment: 0–0 van minuut 0 tot 30; 2–0 van minuut 30 tot 90.',
    )
    expect(pieces(container)).toEqual(['draw', 'win'])
  })

  it('hides the bar and the marks from assistive technology', () => {
    const { container } = render(<MatchScoreBar goals={[goal(12, true)]} headingLevel={2} />)

    expect(container.querySelector('.hf-match-score-bar-graphic')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.hf-visually-hidden')?.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('writes the score above a piece only where the piece is wide enough', () => {
    const { container } = render(<MatchScoreBar goals={[goal(40, true), goal(44, false)]} headingLevel={2} />)

    // The piece of 1-0 runs 4 of 98 minutes of the bar: too narrow for its score.
    expect([...container.querySelectorAll('.hf-match-score-bar-score')].map((score) => score.textContent)).toEqual([
      '0–0',
      '1–1',
    ])
  })

  it('has a mark with its minute every 15 minutes', () => {
    const { container } = render(<MatchScoreBar goals={[]} headingLevel={2} />)

    expect([...container.querySelectorAll('.hf-match-score-bar-tick')].map((tick) => tick.textContent)).toEqual([
      '0',
      '15',
      '30',
      '45',
      '60',
      '75',
      '90',
    ])
  })

  it('runs to 120 minutes with a dashed line where extra time begins', () => {
    const { container } = render(<MatchScoreBar extraTime goals={[goal(100, true)]} headingLevel={2} />)

    expect([...container.querySelectorAll('.hf-match-score-bar-tick')].map((tick) => tick.textContent).at(-1)).toBe(
      '120',
    )
    expect(container.querySelectorAll('.hf-match-score-bar-extra-time')).toHaveLength(1)
    expect(container.querySelector('.hf-visually-hidden')?.textContent).toContain('tot 120')
  })

  it('has no line for extra time in a match without it', () => {
    const { container } = render(<MatchScoreBar goals={[]} headingLevel={2} />)

    expect(container.querySelector('.hf-match-score-bar-extra-time')).toBeNull()
  })

  it('passes other props to the element and adds the class given', () => {
    const { container } = render(<MatchScoreBar className="extra" data-testid="bar" goals={[]} headingLevel={2} />)

    expect(container.firstElementChild?.className).toBe('hf-match-score-bar extra')
    expect(container.firstElementChild?.getAttribute('data-testid')).toBe('bar')
  })
})
