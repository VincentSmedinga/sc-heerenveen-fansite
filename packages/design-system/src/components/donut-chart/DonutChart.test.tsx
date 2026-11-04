import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DonutChart, type DonutChartSlice, strengthsOf } from './DonutChart'

const labels = ['1–15', '16–30', '31–45', '46–60', '61–75', '76–90']

const slicesOf = (values: number[]): DonutChartSlice[] =>
  values.map((value, index) => ({ label: labels[index]!, value }))

const props = { slices: slicesOf([3, 5, 4, 2, 6, 7]), title: 'Aanmeldingen', tone: 'positive' } as const

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

    expect(container.querySelector('.hf-donut-chart-title')?.textContent).toBe('Aanmeldingen')
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

  it('takes its colour from the tone', () => {
    const { container } = render(<DonutChart {...props} tone="negative" />)

    expect(container.firstElementChild?.className).toBe('hf-donut-chart hf-donut-chart-negative')
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

    expect(container.firstElementChild?.className).toBe('hf-donut-chart hf-donut-chart-positive extra')
    expect(container.firstElementChild?.id).toBe('voor')
  })
})

describe('DonutChart with a colour for each slice', () => {
  const results: DonutChartSlice[] = [
    { label: '4–0', tone: 'positive', value: 2 },
    { label: '3–0', tone: 'positive', value: 2 },
    { label: '2–2', tone: 'neutral', value: 1 },
    { label: '0–1', tone: 'negative', value: 5 },
  ]
  const strengthOf = (container: HTMLElement) =>
    [...container.querySelectorAll<SVGPathElement>('.hf-donut-chart-slice')].map((slice) => [
      slice.getAttribute('class'),
      slice.style.getPropertyValue('--hf-donut-strength'),
    ])

  it('gives each slice the class of its own tone, and needs no tone of the chart', () => {
    const { container } = render(<DonutChart labels={false} slices={results} />)

    expect(container.firstElementChild?.className).toBe('hf-donut-chart hf-donut-chart-bare')
    expect(strengthOf(container).map(([name]) => name)).toEqual([
      'hf-donut-chart-slice hf-donut-chart-slice-positive',
      'hf-donut-chart-slice hf-donut-chart-slice-positive',
      'hf-donut-chart-slice hf-donut-chart-slice-neutral',
      'hf-donut-chart-slice hf-donut-chart-slice-negative',
    ])
  })

  it('runs the strength from the weakest to the full colour within a tone, so slices of one colour differ', () => {
    const { container } = render(<DonutChart labels={false} slices={results} />)

    expect(strengthOf(container).map(([, strength]) => strength)).toEqual(['70%', '100%', '80%', '70%'])
  })

  it('lets the tone of a slice win over the tone of the chart', () => {
    const { container } = render(
      <DonutChart
        slices={[
          { label: 'a', tone: 'negative', value: 1 },
          { label: 'b', value: 1 },
        ]}
        title="Titel"
        tone="positive"
      />,
    )

    expect(strengthOf(container).map(([name]) => name)).toEqual([
      'hf-donut-chart-slice hf-donut-chart-slice-negative',
      'hf-donut-chart-slice',
    ])
  })

  it('leaves out the texts and the lines round the ring, and draws the ring on its own', () => {
    const { container } = render(<DonutChart labels={false} slices={results} />)

    expect(container.querySelector('.hf-donut-chart-label')).toBeNull()
    expect(container.querySelector('.hf-donut-chart-leader')).toBeNull()
    expect(container.querySelector('.hf-donut-chart-total')?.textContent).toBe('10')
    expect(container.querySelector('svg')?.getAttribute('viewBox')).toBe('74 64 172 172')
  })

  it('has no title element without a title', () => {
    const { container } = render(<DonutChart labels={false} slices={results} />)

    expect(container.querySelector('.hf-donut-chart-title')).toBeNull()
  })

  it('fills the ring with one slice in its own colour', () => {
    const { container } = render(<DonutChart labels={false} slices={[{ label: '1–0', tone: 'positive', value: 3 }]} />)

    expect(container.querySelectorAll('.hf-donut-chart-slice')).toHaveLength(1)
    expect(container.querySelector('.hf-donut-chart-slice')?.getAttribute('d')?.match(/M /gu)).toHaveLength(2)
  })

  it('shows twelve slices, each with its own place', () => {
    const many = Array.from({ length: 12 }, (_, index): DonutChartSlice => ({
      label: `${index}`,
      tone: index < 6 ? 'positive' : index < 8 ? 'neutral' : 'negative',
      value: 1 + (index % 3),
    }))
    const { container } = render(<DonutChart labels={false} slices={many} />)

    expect(container.querySelectorAll('.hf-donut-chart-slice')).toHaveLength(12)
  })
})

describe('DonutChart ranked', () => {
  const results: DonutChartSlice[] = [
    { label: '4–0', tone: 'positive', value: 2 },
    { label: '3–0', tone: 'positive', value: 2 },
    { label: '2–2', tone: 'neutral', value: 1 },
    { label: '0–1', tone: 'negative', value: 3 },
    { label: '0–2', tone: 'negative', value: 2 },
  ]
  const styleOf = (container: HTMLElement) =>
    [...container.querySelectorAll<SVGPathElement>('.hf-donut-chart-slice')].map((slice) => [
      slice.style.getPropertyValue('--hf-donut-strength'),
      slice.style.getPropertyValue('--hf-donut-deepen'),
    ])

  it('runs the green from the strongest to the weakest, and the red from the weakest to the strongest', () => {
    const { container } = render(<DonutChart labels={false} ranked slices={results} />)

    expect(styleOf(container)).toEqual([
      ['100%', '35%'],
      ['70%', ''],
      ['80%', ''],
      ['70%', ''],
      ['100%', '35%'],
    ])
  })

  it('does not mix in the colour of the text without ranked, and keeps the strengths of before', () => {
    const { container } = render(<DonutChart labels={false} slices={results} />)

    expect(styleOf(container)).toEqual([
      ['70%', ''],
      ['100%', ''],
      ['80%', ''],
      ['70%', ''],
      ['100%', ''],
    ])
  })

  it('gives the swatch of a slice the same strength as its slice', () => {
    const { container } = render(
      <>
        <DonutChart labels={false} ranked slices={results} />
        <DonutChart.Swatch index={0} ranked slices={results} />
        <DonutChart.Swatch index={0} slices={results} />
      </>,
    )
    const swatches = [...container.querySelectorAll<HTMLElement>('.hf-donut-chart-swatch')]

    expect(
      swatches.map((swatch) => [
        swatch.style.getPropertyValue('--hf-donut-strength'),
        swatch.style.getPropertyValue('--hf-donut-deepen'),
      ]),
    ).toEqual([
      ['100%', '35%'],
      ['70%', ''],
    ])
  })
})

describe('strengthsOf', () => {
  it('goes past the full colour with ranked, and turns the positive tones round', () => {
    expect(strengthsOf(['positive', 'positive', 'positive', 'neutral', 'negative', 'negative'], true)).toEqual([
      { deepen: 35, strength: 100 },
      { deepen: 3, strength: 100 },
      { deepen: 0, strength: 70 },
      { deepen: 0, strength: 80 },
      { deepen: 0, strength: 70 },
      { deepen: 35, strength: 100 },
    ])
  })

  it('goes from 70% to 100% within a tone, and from 80% for the grey of a draw', () => {
    expect(strengthsOf(['positive', 'positive', 'positive', 'neutral', 'neutral', 'negative'])).toEqual(
      [70, 85, 100, 80, 100, 70].map((strength) => ({ deepen: 0, strength })),
    )
  })
})

describe('DonutChart.Swatch', () => {
  const slices: DonutChartSlice[] = [
    { label: '4–0', tone: 'positive', value: 2 },
    { label: '3–0', tone: 'positive', value: 2 },
    { label: '0–1', tone: 'negative', value: 5 },
  ]

  it('has the class and the strength of its slice, and is hidden from a screen reader', () => {
    const { container } = render(
      <>
        <DonutChart labels={false} slices={slices} />
        <DonutChart.Swatch index={1} slices={slices} />
        <DonutChart.Swatch index={2} slices={slices} />
      </>,
    )
    const drawn = [...container.querySelectorAll<SVGPathElement>('.hf-donut-chart-slice')]
    const swatches = [...container.querySelectorAll<HTMLElement>('.hf-donut-chart-swatch')]

    expect(swatches.map((swatch) => swatch.getAttribute('aria-hidden'))).toEqual(['true', 'true'])
    expect(swatches[0]?.className).toContain('hf-donut-chart-slice-positive')
    expect(swatches[0]?.style.getPropertyValue('--hf-donut-strength')).toBe(
      drawn[1]?.style.getPropertyValue('--hf-donut-strength'),
    )
    expect(swatches[1]?.className).toContain('hf-donut-chart-slice-negative')
    expect(swatches[1]?.style.getPropertyValue('--hf-donut-strength')).toBe(
      drawn[2]?.style.getPropertyValue('--hf-donut-strength'),
    )
  })
})

describe('DonutChart size', () => {
  it('has the class of a small chart only when it is asked for', () => {
    const small = render(<DonutChart {...props} size="small" />).container.firstElementChild
    const normal = render(<DonutChart {...props} />).container.firstElementChild

    expect(small?.className).toContain('hf-donut-chart-small')
    expect(normal?.className).not.toContain('hf-donut-chart-small')
  })
})

describe('DonutChart centre', () => {
  it('shows the text in the hole instead of the total, and the total without it', () => {
    const { container } = render(<DonutChart {...props} centre="45–31" labels={false} size="small" />)

    expect(container.querySelector('.hf-donut-chart-total')?.textContent).toBe('45–31')
    expect(render(<DonutChart {...props} />).container.querySelector('.hf-donut-chart-total')?.textContent).toBe('27')
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
