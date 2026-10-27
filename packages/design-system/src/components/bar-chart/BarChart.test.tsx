import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BarChart, type BarChartBar } from './BarChart'

const win: BarChartBar = { tone: 'positive', value: 3 }
const draw: BarChartBar = { tone: 'neutral', value: 1 }
const loss: BarChartBar = { tone: 'negative', value: 0 }

const bars = [win, draw, loss, null, null, null]

/** The share of the chart each bar fills, by place; `null` for a place with no bar. */
const sharesOf = (container: HTMLElement) =>
  [...container.querySelectorAll('.hf-bar-chart-slot')].map((slot) => {
    const bar = slot.querySelector<HTMLElement>('.hf-bar-chart-bar')

    return bar ? Number(bar.style.getPropertyValue('--hf-bar-chart-share')) : null
  })

describe('BarChart', () => {
  it('is hidden from a screen reader, which gets the same numbers as text', () => {
    const { container } = render(<BarChart bars={bars} max={3} />)

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
  })

  it('has a place for every bar, also a place with no bar, in a grid of that many columns', () => {
    const { container } = render(<BarChart bars={bars} max={3} />)

    expect(container.querySelectorAll('.hf-bar-chart-slot')).toHaveLength(6)
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--hf-bar-chart-slots')).toBe('6')
  })

  it('makes a bar as high as its value is a share of the maximum', () => {
    const { container } = render(<BarChart bars={bars} max={3} />)

    expect(sharesOf(container)).toEqual([100, 33.33, 0, null, null, null])
  })

  it('draws no bar for an empty place, and a small one on the ground for a value of 0', () => {
    const { container } = render(<BarChart bars={bars} max={3} />)

    expect(container.querySelectorAll('.hf-bar-chart-bar')).toHaveLength(3)
    expect(container.querySelectorAll('.hf-bar-chart-stub')).toHaveLength(1)
    expect(container.querySelectorAll('.hf-bar-chart-slot')[2]?.querySelector('.hf-bar-chart-stub')).not.toBeNull()
  })

  it('shows nothing for a value of 0 when the zero is none', () => {
    const { container } = render(<BarChart bars={bars} max={3} zero="none" />)

    expect(container.querySelectorAll('.hf-bar-chart-bar')).toHaveLength(2)
    expect(container.querySelector('.hf-bar-chart-stub')).toBeNull()
  })

  it('gives a bar the tone class of its tone, which gives it its colour', () => {
    const { container } = render(<BarChart bars={bars} max={3} />)

    expect(
      [...container.querySelectorAll('.hf-bar-chart-bar')].map((bar) =>
        [...bar.classList].find((name) => name.startsWith('hf-chart-tone-')),
      ),
    ).toEqual(['hf-chart-tone-positive', 'hf-chart-tone-neutral', 'hf-chart-tone-negative'])
  })

  it('keeps a value past the maximum or below 0 on the chart', () => {
    const { container } = render(
      <BarChart
        bars={[
          { tone: 'positive', value: 9 },
          { tone: 'negative', value: -2 },
        ]}
        max={3}
      />,
    )

    expect(sharesOf(container)).toEqual([100, 0])
  })

  it('draws a line across the chart at every tick above 0, and the numbers of all ticks at the side', () => {
    const { container } = render(<BarChart bars={bars} max={3} ticks={[0, 1, 3]} />)

    expect(
      [...container.querySelectorAll<HTMLElement>('.hf-bar-chart-guide')].map((guide) =>
        guide.style.getPropertyValue('--hf-bar-chart-at'),
      ),
    ).toEqual(['33.33', '100'])
    expect([...container.querySelectorAll('.hf-bar-chart-scale-number')].map((number) => number.textContent)).toEqual([
      '0',
      '1',
      '3',
    ])
  })

  it('has no guides or numbers at the side without ticks', () => {
    const { container } = render(<BarChart bars={bars} max={3} />)

    expect(container.querySelector('.hf-bar-chart-guide, .hf-bar-chart-scale-number')).toBeNull()
  })

  it('numbers the places from 1 under the ground, and writes the caption', () => {
    const { container } = render(
      <BarChart axis={{ title: 'Speelronde' }} bars={Array.from({ length: 34 }, () => null)} max={3} />,
    )

    expect([...container.querySelectorAll('.hf-bar-chart-number')].map((number) => number.textContent)).toEqual([
      '1',
      '5',
      '10',
      '15',
      '20',
      '25',
      '30',
      '34',
    ])
    expect(container.querySelector('.hf-bar-chart-title')?.textContent).toBe('Speelronde')
  })

  it('marks the numbers only a chart with room shows, so a narrow chart has 1, 10, 20 and 30', () => {
    const { container } = render(<BarChart bars={Array.from({ length: 34 }, () => null)} max={3} />)

    expect(
      [...container.querySelectorAll('.hf-bar-chart-number:not(.hf-bar-chart-number-wide)')].map(
        (number) => number.textContent,
      ),
    ).toEqual(['1', '10', '20', '30'])
  })

  it('puts a number under the middle of its place', () => {
    const { container } = render(<BarChart bars={Array.from({ length: 34 }, () => null)} max={3} />)
    const first = container.querySelector<HTMLElement>('.hf-bar-chart-number')!

    expect(Number(first.style.getPropertyValue('--hf-bar-chart-across'))).toBeCloseTo((0.5 / 34) * 100, 1)
  })

  it('takes the text of a number from labelOf, with the place counted from 0', () => {
    const { container } = render(
      <BarChart axis={{ labelOf: (slot) => `R${slot + 1}` }} bars={Array.from({ length: 12 }, () => null)} max={3} />,
    )

    expect(container.querySelector('.hf-bar-chart-number')?.textContent).toBe('R1')
  })

  it('has no numbers or caption when the axis is false', () => {
    const { container } = render(<BarChart axis={false} bars={bars} max={3} />)

    expect(container.querySelector('.hf-bar-chart-axis')).toBeNull()
  })

  it('passes other props to the element', () => {
    const { container } = render(<BarChart bars={bars} className="extra" data-testid="chart" max={3} />)

    expect(container.querySelector('[data-testid="chart"]')?.classList.contains('hf-bar-chart')).toBe(true)
    expect(container.querySelector('[data-testid="chart"]')?.classList.contains('extra')).toBe(true)
  })
})

describe('BarChart.Trend', () => {
  const values = [null, null, 1, 2, 3, null]

  it('is hidden from a screen reader and cannot be focused', () => {
    const { container } = render(
      <BarChart bars={bars} max={3}>
        <BarChart.Trend values={values} />
      </BarChart>,
    )
    const svg = container.querySelector('svg')

    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('focusable')).toBe('false')
    expect(container.querySelector('svg title, svg desc')).toBeNull()
  })

  it('draws in units of one place wide, stretched over the chart', () => {
    const { container } = render(
      <BarChart bars={bars} max={3}>
        <BarChart.Trend values={values} />
      </BarChart>,
    )
    const svg = container.querySelector('svg')!

    expect(svg.getAttribute('viewBox')).toBe('0 0 6 100')
    expect(svg.getAttribute('preserveAspectRatio')).toBe('none')
  })

  it('takes the scale of the chart it sits in', () => {
    const { container } = render(
      <BarChart bars={bars} max={4}>
        <BarChart.Trend curve="straight" values={[null, null, 2, 4, null, null]} />
      </BarChart>,
    )

    expect(container.querySelector('.hf-bar-chart-trend-line')?.getAttribute('d')).toBe('M2.5 50 L3.5 0')
  })

  it('draws the edge and the line from the same path, and the edge first so it is under the line', () => {
    const { container } = render(
      <BarChart bars={bars} max={3}>
        <BarChart.Trend values={values} />
      </BarChart>,
    )
    const paths = [...container.querySelectorAll('svg path')]

    expect(paths.map((path) => path.getAttribute('class'))).toEqual([
      'hf-bar-chart-trend-edge',
      'hf-bar-chart-trend-line',
    ])
    expect(paths[0]?.getAttribute('d')).toBe(paths[1]?.getAttribute('d'))
  })

  it('leaves out the edge when asked', () => {
    const { container } = render(
      <BarChart bars={bars} max={3}>
        <BarChart.Trend edge={false} values={values} />
      </BarChart>,
    )

    expect(container.querySelector('.hf-bar-chart-trend-edge')).toBeNull()
  })

  it('puts a dot on the last point, in the middle of its place at the height of its value', () => {
    const { container } = render(
      <BarChart bars={bars} max={3}>
        <BarChart.Trend values={[null, null, 1, 2, 3, null]} />
      </BarChart>,
    )
    const dot = container.querySelector<HTMLElement>('.hf-bar-chart-trend-dot')!

    expect(Number(dot.style.getPropertyValue('--hf-bar-chart-across'))).toBeCloseTo((4.5 / 6) * 100, 1)
    expect(dot.style.getPropertyValue('--hf-bar-chart-at')).toBe('100')
  })

  it('has no dot when asked, and none without values', () => {
    const { container, rerender } = render(
      <BarChart bars={bars} max={3}>
        <BarChart.Trend endDot={false} values={values} />
      </BarChart>,
    )

    expect(container.querySelector('.hf-bar-chart-trend-dot')).toBeNull()

    rerender(
      <BarChart bars={bars} max={3}>
        <BarChart.Trend values={[null, null, null, null, null, null]} />
      </BarChart>,
    )
    expect(container.querySelector('.hf-bar-chart-trend-dot')).toBeNull()
    expect(container.querySelector('.hf-bar-chart-trend-line')?.getAttribute('d')).toBe('')
  })
})
