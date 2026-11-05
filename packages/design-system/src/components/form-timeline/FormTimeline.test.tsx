import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

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

  it('has the title under the labels', () => {
    const { container } = render(<FormTimeline {...props} results={places({})} />)

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

  it('gives every result a point, from the first, and stops the line at a gap', () => {
    const { container } = render(
      <FormTimeline
        {...props}
        results={places({ 10: 'W', 11: 'W', 12: 'G', 13: 'V', 14: 'W', 20: 'G', 21: 'G', 22: 'G', 23: 'G' })}
      />,
    )
    const path = container.querySelector('.hf-bar-chart-trend-line')?.getAttribute('d') ?? ''

    // Two runs, the first from the first result of 3 points (the top of the chart).
    expect(path.startsWith('M10.5 0')).toBe(true)
    expect(path.match(/M/gu)).toHaveLength(2)
    expect(container.querySelectorAll('.hf-bar-chart-trend-dot')).toHaveLength(1)
    expect(
      container.querySelector<HTMLElement>('.hf-bar-chart-trend-dot')?.style.getPropertyValue('--hf-bar-chart-across'),
    ).toBe('31.76')
  })

  it('gives the line a tooltip with the average at the place the pointer is nearest to', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 64,
      height: 64,
      left: 0,
      right: 740,
      toJSON: () => ({}),
      top: 0,
      width: 740,
      x: 0,
      y: 0,
    })

    const { container } = render(<FormTimeline {...props} results={places({ 10: 'W', 11: 'V', 12: 'G', 30: 'W' })} />)
    const layer = container.querySelector<HTMLElement>('.hf-bar-chart-pointer')!
    const tooltip = () => container.querySelector('.hf-tooltip')?.textContent

    // 74 places of 10 wide. The average at place 10 is 3, at 11 is 1,5 and at 12 is 1,3.
    fireEvent.pointerMove(layer, { clientX: 105, pointerType: 'mouse' })
    expect(tooltip()).toBe('3,0')
    fireEvent.pointerMove(layer, { clientX: 115, pointerType: 'mouse' })
    expect(tooltip()).toBe('1,5')
    fireEvent.pointerMove(layer, { clientX: 125, pointerType: 'mouse' })
    expect(tooltip()).toBe('1,3')
    // A place with no result in the run is skipped: the pointer lands on the nearest point.
    fireEvent.pointerMove(layer, { clientX: 5, pointerType: 'mouse' })
    expect(tooltip()).toBe('3,0')

    vi.restoreAllMocks()
  })

  it('averages over at most the window: the first points over fewer results', () => {
    const { container } = render(<FormTimeline {...props} firstYear={2000} results={['W', 'V', 'G']} window={2} />)
    const path = container.querySelector('.hf-bar-chart-trend-line')?.getAttribute('d') ?? ''

    // 3, then (3 + 0) / 2 = 1.5, then (0 + 1) / 2 = 0.5, at heights 0, 50 and 83.333.
    expect(path.startsWith('M0.5 0')).toBe(true)
    expect(path).toContain('83.333')
    expect(path).not.toContain('M1.5')
  })

  it('puts the key and the text about what counts in one paragraph under the chart', () => {
    const { container } = render(<FormTimeline {...props} results={places({})} />)

    expect(textOf(container)).toEqual(['W winst (3 punten), G gelijk (1), V verlies (0). Alleen de Eredivisie.'])
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
    // Two runs, with the gap between them.
    const path = container.querySelector('.hf-bar-chart-trend-line')?.getAttribute('d') ?? ''

    expect(path.match(/M/gu)).toHaveLength(2)
  })

  it('hides the chart from a screen reader and keeps everything else as text', () => {
    const { container } = render(<FormTimeline {...props} results={places({})} />)

    expect(container.querySelector('.hf-bar-chart')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelectorAll('.hf-form-timeline > [aria-hidden]')).toHaveLength(1)
    expect(container.querySelectorAll('.hf-form-timeline > p[aria-hidden]')).toHaveLength(0)
  })
})
