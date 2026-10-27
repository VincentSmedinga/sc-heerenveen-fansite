import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FormResult } from './form'

import { FormChart } from './FormChart'

/** The text of the page under the chart, as a screen reader gets it (the chart is hidden). */
const textOf = (container: HTMLElement) =>
  [...container.querySelectorAll('.hf-form-chart > p')].map((paragraph) => paragraph.textContent)

const season: FormResult[] = ['W', 'W', 'G', 'V', 'W', 'G', 'G', 'W', 'V', 'W', 'W', 'G']

describe('FormChart', () => {
  it('puts the form above a chart with a place for every match of the season', () => {
    const { container } = render(<FormChart results={season} />)

    expect(container.querySelector('.hf-mark-row-title')?.textContent).toBe('Vorm')
    expect(container.querySelectorAll('.hf-bar-chart-slot')).toHaveLength(34)
    expect(container.querySelectorAll('.hf-bar-chart-bar')).toHaveLength(12)
  })

  it('shows the latest five results as the form, the oldest first', () => {
    const { container } = render(<FormChart results={season} />)

    expect([...container.querySelectorAll('.hf-mark-row-mark')].map((mark) => mark.textContent)).toEqual([
      'W',
      'V',
      'W',
      'W',
      'G',
    ])
    expect(container.querySelector('.hf-visually-hidden')?.textContent).toBe(
      'Vorm: winst, verlies, winst, winst, gelijk',
    )
  })

  it('makes a win 3 high, a draw 1 high and a loss a small bar', () => {
    const { container } = render(<FormChart results={['W', 'G', 'V']} />)
    const shares = [...container.querySelectorAll<HTMLElement>('.hf-bar-chart-bar')].map((bar) =>
      Number(bar.style.getPropertyValue('--hf-bar-chart-share')),
    )

    expect(shares).toEqual([100, 33.33, 0])
    expect(container.querySelectorAll('.hf-bar-chart-stub')).toHaveLength(1)
  })

  it('draws the line from the fifth match, as the average of the points of the last five', () => {
    const { container } = render(<FormChart results={['W', 'W', 'G', 'V', 'W', 'G']} />)

    // The averages are 10/5 and 8/5 and sit in the places of the fifth and sixth match.
    const line = container.querySelector('.hf-bar-chart-trend-line')?.getAttribute('d') ?? ''

    expect(line.startsWith('M4.5 33.333')).toBe(true)
    expect(line).toContain('5.5 46.667')
  })

  it('says what the line shows, with the latest average and a decimal comma', () => {
    const { container } = render(<FormChart results={['W', 'W', 'G', 'V', 'G']} />)

    expect(textOf(container)).toContain(
      'De lijn laat zien hoeveel punten sc Heerenveen per wedstrijd haalde in de laatste 5 wedstrijden: nu 1,6.',
    )
  })

  it('rounds the average to one decimal', () => {
    const { container } = render(<FormChart results={['W', 'W', 'V', 'V', 'G']} />)

    expect(textOf(container).join(' ')).toContain('nu 1,4.')
  })

  it('has no line, and says when it starts, with fewer than five matches', () => {
    const { container } = render(<FormChart results={['W', 'G', 'V']} />)

    expect(container.querySelector('.hf-bar-chart-trend-line')?.getAttribute('d')).toBe('')
    expect(container.querySelector('.hf-bar-chart-trend-dot')).toBeNull()
    expect(textOf(container)).toContain('De lijn begint na 5 wedstrijden.')
  })

  it('shows empty places and a text for the form when nothing is played yet', () => {
    const { container } = render(<FormChart results={[]} />)

    expect(container.querySelector('.hf-mark-row-empty')?.textContent).toBe('Nog geen wedstrijden gespeeld.')
    expect(container.querySelectorAll('.hf-bar-chart-slot')).toHaveLength(34)
    expect(container.querySelector('.hf-bar-chart-bar')).toBeNull()
  })

  it('writes the key to the letters, and puts the points in it', () => {
    const { container } = render(<FormChart results={season} />)

    expect(textOf(container)).toContain('W winst (3 punten), G gelijk (1), V verlies (0).')
  })

  it('takes the number of matches and the size of the window from its props', () => {
    const { container } = render(<FormChart matches={10} results={['W', 'W', 'W']} window={3} />)

    expect(container.querySelectorAll('.hf-bar-chart-slot')).toHaveLength(10)
    expect(textOf(container).join(' ')).toContain('in de laatste 3 wedstrijden: nu 3,0.')
  })

  it('hides the chart from a screen reader and keeps everything else as text', () => {
    const { container } = render(<FormChart results={season} />)

    expect(container.querySelector('.hf-bar-chart')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('.hf-form-chart > p[aria-hidden]')).toBeNull()
  })
})
