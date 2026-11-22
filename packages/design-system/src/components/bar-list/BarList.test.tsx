import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BarList } from './BarList'

describe('BarList', () => {
  it('gives the name and the number as text and hides the bar from a screen reader', () => {
    const { container } = render(
      <BarList
        rows={[
          { label: '2003/04', value: 8 },
          { label: '2004/05', value: 4 },
        ]}
      />,
    )

    expect(container.textContent).toBe('2003/048' + '2004/054')
    expect(container.querySelectorAll('.hf-bar-list-track[aria-hidden="true"]')).toHaveLength(2)
  })

  it('makes a bar as long as its share of the largest number', () => {
    const { container } = render(
      <BarList
        rows={[
          { label: 'a', value: 8 },
          { label: 'b', value: 4 },
        ]}
      />,
    )
    const fills = [...container.querySelectorAll<HTMLElement>('.hf-bar-list-fill')]

    expect(fills.every((fill) => fill.classList.contains('hf-chart-tone-plain'))).toBe(true)
    expect(fills.map((fill) => fill.style.getPropertyValue('--hf-bar-list-share'))).toEqual(['100', '50'])
  })

  it('gives the number column the width of the longest number, so four digits do not spill', () => {
    const { container } = render(
      <BarList
        rows={[
          { label: 'a', value: 1170 },
          { label: 'b', value: 90 },
        ]}
      />,
    )

    expect(container.querySelector<HTMLElement>('.hf-bar-list')?.style.getPropertyValue('--hf-bar-list-digits')).toBe(
      '4',
    )
  })

  it('puts the unit after each number and keeps the bars as long as the numbers', () => {
    const { container } = render(
      <BarList
        rows={[
          { label: 'a', value: 80 },
          { label: 'b', value: 40 },
        ]}
        unit="%"
      />,
    )
    const fills = [...container.querySelectorAll<HTMLElement>('.hf-bar-list-fill')]

    expect(container.textContent).toBe('a80%' + 'b40%')
    expect(fills.map((fill) => fill.style.getPropertyValue('--hf-bar-list-share'))).toEqual(['100', '50'])
    expect(container.querySelector<HTMLElement>('.hf-bar-list')?.style.getPropertyValue('--hf-bar-list-digits')).toBe(
      '3',
    )
  })
})
