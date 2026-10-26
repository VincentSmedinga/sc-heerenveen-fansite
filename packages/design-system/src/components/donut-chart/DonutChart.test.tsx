import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DonutChart, type DonutChartSlice } from './DonutChart'

const labels = ['1–15', '16–30', '31–45', '46–60', '61–75', '76–90']

const slicesOf = (values: number[]): DonutChartSlice[] =>
  values.map((value, index) => ({ label: labels[index]!, value }))

const props = { outcome: 'win', slices: slicesOf([3, 5, 4, 2, 6, 7]), title: 'Voor' } as const

/** The names and values written next to the slices, in order. */
const labelsOf = (container: HTMLElement) =>
  [...container.querySelectorAll('.hf-donut-chart-label')].map((label) => [
    label.querySelector('.hf-donut-chart-name')?.textContent,
    label.querySelector('.hf-donut-chart-value')?.textContent,
  ])

/** The angle of every text from the centre of the ring, in degrees clockwise from the top. */
const directionsOf = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('.hf-donut-chart-label')].map((label) => {
    const sin = Number(label.style.getPropertyValue('--hf-donut-sin'))
    const cos = Number(label.style.getPropertyValue('--hf-donut-cos'))

    return (Math.atan2(sin, cos) * 180) / Math.PI + (sin < 0 ? 360 : 0)
  })

describe('DonutChart', () => {
  it('is hidden from a screen reader, which gets the table next to it', () => {
    const { container } = render(<DonutChart {...props} />)

    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('svg')?.getAttribute('focusable')).toBe('false')
  })

  it('has no focusable element and no title or description of its own in the drawing', () => {
    const { container } = render(<DonutChart {...props} />)

    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
    expect(container.querySelector('svg title, svg desc')).toBeNull()
  })

  it('writes the title above the ring and the total in the hole', () => {
    const { container } = render(<DonutChart {...props} />)

    expect(container.querySelector('.hf-donut-chart-title')?.textContent).toBe('Voor')
    expect(container.querySelector('.hf-donut-chart-total')?.textContent).toBe('27')
  })

  it('draws a slice for every value above zero, with its name and value as text', () => {
    const { container } = render(<DonutChart {...props} />)

    expect(container.querySelectorAll('.hf-donut-chart-slice')).toHaveLength(6)
    expect(labelsOf(container)).toEqual([
      ['1–15', '3'],
      ['16–30', '5'],
      ['31–45', '4'],
      ['46–60', '2'],
      ['61–75', '6'],
      ['76–90', '7'],
    ])
  })

  it('has no slice and no text for a value of zero, and the other slices keep their place and colour', () => {
    const { container } = render(<DonutChart {...props} slices={slicesOf([3, 0, 0, 2, 0, 7])} />)

    expect(container.querySelectorAll('.hf-donut-chart-slice')).toHaveLength(3)
    expect(labelsOf(container)).toEqual([
      ['1–15', '3'],
      ['46–60', '2'],
      ['76–90', '7'],
    ])
    expect(
      [...container.querySelectorAll<SVGPathElement>('.hf-donut-chart-slice')].map((slice) =>
        slice.style.getPropertyValue('--hf-donut-strength'),
      ),
    ).toEqual(['70%', '88%', '100%'])
  })

  it('gives the slices a stronger colour, from 70% in the first to 100% in the last', () => {
    const { container } = render(<DonutChart {...props} />)

    expect(
      [...container.querySelectorAll<SVGPathElement>('.hf-donut-chart-slice')].map((slice) =>
        slice.style.getPropertyValue('--hf-donut-strength'),
      ),
    ).toEqual(['70%', '76%', '82%', '88%', '94%', '100%'])
  })

  it('takes its colour from the outcome', () => {
    const { container } = render(<DonutChart {...props} outcome="loss" />)

    expect(container.firstElementChild?.className).toBe('hf-donut-chart hf-donut-chart-loss')
  })

  it('shows an empty ring with a zero when no slice has a value, and no text next to it', () => {
    const { container } = render(<DonutChart {...props} slices={slicesOf([0, 0, 0, 0, 0, 0])} />)

    expect(container.querySelector('.hf-donut-chart-track')).not.toBeNull()
    expect(container.querySelector('.hf-donut-chart-slice')).toBeNull()
    expect(container.querySelector('.hf-donut-chart-label')).toBeNull()
    expect(container.querySelector('.hf-donut-chart-total')?.textContent).toBe('0')
  })

  it('has no empty ring when there are slices', () => {
    const { container } = render(<DonutChart {...props} />)

    expect(container.querySelector('.hf-donut-chart-track')).toBeNull()
  })

  it('fills the whole ring with one slice, as two circles with the even-odd rule', () => {
    const { container } = render(<DonutChart {...props} slices={slicesOf([0, 0, 0, 0, 0, 4])} />)
    const slice = container.querySelector('.hf-donut-chart-slice')

    expect(slice?.getAttribute('d')?.match(/M /gu)).toHaveLength(2)
    expect(slice?.getAttribute('fill-rule')).toBe('evenodd')
  })

  it('puts a line from every slice to its text', () => {
    const { container } = render(<DonutChart {...props} />)

    expect(container.querySelectorAll('.hf-donut-chart-leader')).toHaveLength(6)
  })

  it('keeps the text at the middle of its slice when there is room', () => {
    const { container } = render(<DonutChart {...props} slices={slicesOf([1, 1, 1, 1, 1, 1])} />)

    expect(directionsOf(container).map((angle) => Math.round(angle))).toEqual([30, 90, 150, 210, 270, 330])
  })

  it('moves the texts of slices that lie close together at least 40 degrees apart', () => {
    const { container } = render(<DonutChart {...props} slices={slicesOf([1, 1, 12, 1, 1, 1])} />)
    const angles = directionsOf(container)

    for (const [index, angle] of angles.entries()) {
      const next = (angles[(index + 1) % angles.length]! - angle + 360) % 360

      expect(next).toBeGreaterThanOrEqual(39.9)
    }
  })

  it('passes other props on and keeps its own classes', () => {
    const { container } = render(<DonutChart {...props} className="extra" id="voor" />)

    expect(container.firstElementChild?.className).toBe('hf-donut-chart hf-donut-chart-win extra')
    expect(container.firstElementChild?.id).toBe('voor')
  })
})

describe('DonutChart.Group', () => {
  it('is a div with the class of the group, and passes other props on', () => {
    const { container } = render(
      <DonutChart.Group className="extra" id="groep">
        <DonutChart {...props} />
      </DonutChart.Group>,
    )

    expect(container.firstElementChild?.className).toBe('hf-donut-chart-group extra')
    expect(container.firstElementChild?.id).toBe('groep')
    expect(container.querySelectorAll('.hf-donut-chart')).toHaveLength(1)
  })
})
