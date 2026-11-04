import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { FormResult } from '../form-chart/form'

import { tableColumns, tableLegend } from '../table-columns'
import { FormTimeline } from './FormTimeline'

const props = { firstYear: 1990, scope: 'Alleen de Eredivisie.', title: 'Seizoen' }

/** 74 places: 1990 up to and including 2026, two for each year. */
const places = (played: Record<number, FormResult>): (FormResult | null)[] =>
  Array.from({ length: 74 }, (_, place) => played[place] ?? null)

const textOf = (container: HTMLElement) =>
  [...container.querySelectorAll('.hf-form-timeline > p')].map((paragraph) => paragraph.textContent)

describe('FormTimeline', () => {
  it('has a place for each result and a bar for each one that was played', () => {
    const { container } = render(<FormTimeline {...props} results={places({ 40: 'W', 41: 'G', 70: 'V' })} />)

    expect(container.querySelectorAll('.hf-bar-chart-slot')).toHaveLength(74)
    expect(container.querySelectorAll('.hf-bar-chart-bar')).toHaveLength(3)
    expect(container.querySelectorAll('.hf-bar-chart-stub')).toHaveLength(1)
  })

  it('is the small chart, with the title under the labels', () => {
    const { container } = render(<FormTimeline {...props} results={places({})} />)

    expect(container.querySelector('.hf-bar-chart-small')).not.toBeNull()
    expect(container.querySelector('.hf-bar-chart-title')?.textContent).toBe('Seizoen')
  })

  it('labels every fifth year under the middle of its two places, over the turn of the century', () => {
    const { container } = render(<FormTimeline {...props} results={places({})} />)
    const numbers = [...container.querySelectorAll<HTMLElement>('.hf-bar-chart-number')]

    expect(numbers.map((number) => number.textContent)).toEqual(['90', '95', '00', '05', '10', '15', '20', '25'])
    expect(numbers.map((number) => number.style.getPropertyValue('--hf-bar-chart-across'))).toEqual(
      [1, 11, 21, 31, 41, 51, 61, 71].map((at) => String(Math.round((at / 74) * 10000) / 100)),
    )
    expect(container.querySelector('.hf-bar-chart-number-wide')).toBeNull()
  })

  it('draws the line from four results in a row, and stops it at a gap', () => {
    const { container } = render(
      <FormTimeline
        {...props}
        results={places({ 10: 'W', 11: 'W', 12: 'G', 13: 'V', 14: 'W', 20: 'G', 21: 'G', 22: 'G', 23: 'G' })}
      />,
    )
    const paths = container.querySelector('.hf-bar-chart-trend-line')?.getAttribute('d') ?? ''

    // The first run has points at the places 13 and 14 (averages 1.75 and 1.5), the second at
    // 23.
    expect(paths.startsWith('M13.5 41.667')).toBe(true)
    expect(paths.match(/M/gu)).toHaveLength(1)
    expect(container.querySelectorAll('.hf-bar-chart-trend-dot')).toHaveLength(1)
  })

  it('puts the key and the text about what counts in one paragraph under the chart', () => {
    const { container } = render(<FormTimeline {...props} results={places({})} />)

    expect(textOf(container)).toEqual(['W winst (3 punten), G gelijk (1), V verlies (0).', 'Alleen de Eredivisie.'])
  })

  it('uses the letters and words of the columns under the tables', () => {
    const { drawn, lost, won } = tableColumns
    const { container } = render(<FormTimeline {...props} results={places({})} />)

    for (const item of tableLegend([won, drawn, lost]).split(', '))
      expect(container.querySelector('.hf-form-key')?.textContent).toContain(item)
  })

  it('takes the window, the places per year and the distance between labels from its props', () => {
    const { container } = render(
      <FormTimeline
        {...props}
        labelEvery={10}
        placesPerYear={1}
        results={['W', 'W', 'W', null, 'G', 'G', 'G', 'G', 'G', 'G', 'G', 'G']}
        window={2}
      />,
    )

    expect(container.querySelectorAll('.hf-bar-chart-slot')).toHaveLength(12)
    expect([...container.querySelectorAll('.hf-bar-chart-number')].map((number) => number.textContent)).toEqual([
      '90',
      '00',
    ])
    // A window of 2 gives a point from the second result: two runs, with the gap between them.
    const path = container.querySelector('.hf-bar-chart-trend-line')?.getAttribute('d') ?? ''

    expect(path.startsWith('M1.5 0 L')).toBe(false)
    expect(path.match(/M/gu)).toHaveLength(2)
  })

  it('hides the chart from a screen reader and keeps everything else as text', () => {
    const { container } = render(<FormTimeline {...props} results={places({})} />)

    expect(container.querySelector('.hf-bar-chart')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('.hf-form-timeline > [aria-hidden]')).toHaveLength(1)
    expect(container.querySelectorAll('.hf-form-timeline > p[aria-hidden]')).toHaveLength(0)
  })
})
