import type { ReactNode } from 'react'

import { act, fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Strong } from '../strong/Strong'
import { BarChart } from './BarChart'

// Six places in a plot of 300 wide, so a place is 50 wide and the middles are at 25, 75, ...
const values = [null, null, 1, 2, null, 3]
const labels = [null, null, '1,0', '2,0', null, '3,0']
const bars = values.map(() => null)

function chart(props: { labels?: readonly (null | ReactNode)[] } = {}) {
  return render(
    <>
      <BarChart bars={bars} max={3}>
        <BarChart.Trend {...props} values={values} />
      </BarChart>
      <p data-testid="outside">Buiten de grafiek</p>
    </>,
  )
}

const layerOf = (container: HTMLElement) => container.querySelector<HTMLElement>('.hf-bar-chart-pointer')!
const tooltipOf = (container: HTMLElement) => container.querySelector<HTMLElement>('.hf-tooltip')

const mouse = { pointerType: 'mouse' }
const touch = { pointerType: 'touch' }

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    bottom: 64,
    height: 64,
    left: 0,
    right: 300,
    toJSON: () => ({}),
    top: 0,
    width: 300,
    x: 0,
    y: 0,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('BarChart.Trend with labels', () => {
  it('shows a label with a heavier part, in a strong element', () => {
    const { container } = chart({
      labels: [
        null,
        null,
        null,
        <>
          Ronde 4: <Strong>plek 2</Strong>
        </>,
        null,
        null,
      ],
    })

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 175, clientY: 10 })

    const tooltip = tooltipOf(container)!

    expect(tooltip.textContent).toBe('Ronde 4: plek 2')
    expect(tooltip.querySelector('strong')?.textContent).toBe('plek 2')
  })

  it('has no tooltip and no layer for the pointer without labels', () => {
    const { container } = chart()

    expect(container.querySelector('.hf-bar-chart-pointer')).toBeNull()
    expect(container.querySelector('.hf-tooltip')).toBeNull()
  })

  it('keeps the chart hidden from a screen reader, without anything to focus', () => {
    const { container } = chart({ labels })

    expect(container.querySelector('.hf-bar-chart')?.getAttribute('aria-hidden')).toBe('true')
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
    expect(tooltipOf(container)).toBeNull()
  })

  it('shows the text of the nearest point under a mouse, with a dot on the line', () => {
    const { container } = chart({ labels })

    fireEvent.pointerEnter(layerOf(container), { ...mouse, clientX: 170 })
    expect(tooltipOf(container)?.textContent).toBe('2,0')
    // Dots: the end dot of the line and the dot at the pointer.
    expect(container.querySelectorAll('.hf-bar-chart-trend-dot')).toHaveLength(2)

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 290 })
    expect(tooltipOf(container)?.textContent).toBe('3,0')
  })

  it('puts the dot and the tooltip at the point of the nearest place', () => {
    const { container } = chart({ labels })

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 170 })

    const [, dot] = container.querySelectorAll<HTMLElement>('.hf-bar-chart-trend-dot')

    // Place 3 of 6, so 58.33 across, and a value of 2 on a scale of 3, so 66.67 up.
    expect(dot?.style.getPropertyValue('--hf-bar-chart-across')).toBe('58.33')
    expect(dot?.style.getPropertyValue('--hf-bar-chart-at')).toBe('66.67')
  })

  it('jumps over places without a point, at the edges too', () => {
    const { container } = chart({ labels })

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 5 })
    expect(tooltipOf(container)?.textContent).toBe('1,0')

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 215 })
    // Place 4 has no point: 215 is nearer to place 3 (175) than to place 5 (275).
    expect(tooltipOf(container)?.textContent).toBe('2,0')

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 230 })
    expect(tooltipOf(container)?.textContent).toBe('3,0')
  })

  it('gives no tooltip for a place with a value but no label', () => {
    const { container } = chart({ labels: [null, null, null, null, null, '3,0'] })

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 20 })
    expect(tooltipOf(container)?.textContent).toBe('3,0')
  })

  it('shows nothing when no place has both a value and a label', () => {
    const { container } = chart({ labels: [null, null, null, null, null, null] })

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 100 })
    expect(tooltipOf(container)).toBeNull()
  })

  it('takes the tooltip away when the pointer leaves the chart', () => {
    const { container } = chart({ labels })

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 100 })
    expect(tooltipOf(container)).not.toBeNull()
    fireEvent.pointerLeave(layerOf(container), mouse)
    expect(tooltipOf(container)).toBeNull()
    expect(container.querySelectorAll('.hf-bar-chart-trend-dot')).toHaveLength(1)
  })

  it('treats a pen as a mouse', () => {
    const { container } = chart({ labels })

    fireEvent.pointerMove(layerOf(container), { clientX: 100, pointerType: 'pen' })
    expect(tooltipOf(container)).not.toBeNull()
    fireEvent.pointerLeave(layerOf(container), { pointerType: 'pen' })
    expect(tooltipOf(container)).toBeNull()
  })

  it('takes the tooltip away at Escape', () => {
    const { container } = chart({ labels })

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 100 })
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(tooltipOf(container)).toBeNull()
  })

  it('shows the tooltip for a tap and for a sideways drag of a finger, and keeps it when the finger lifts', () => {
    const { container } = chart({ labels })
    const layer = layerOf(container)

    // Touching down is not yet a tap: it may be the start of a scroll.
    fireEvent.pointerDown(layer, { ...touch, clientX: 170 })
    expect(tooltipOf(container)).toBeNull()

    fireEvent.pointerUp(layer, { ...touch, clientX: 170 })
    expect(tooltipOf(container)?.textContent).toBe('2,0')
    // The browser also reports the finger leaving, and that must not close the tooltip.
    fireEvent.pointerLeave(layer, touch)
    expect(tooltipOf(container)?.textContent).toBe('2,0')

    fireEvent.pointerDown(layer, { ...touch, clientX: 170 })
    fireEvent.pointerMove(layer, { ...touch, clientX: 280 })
    expect(tooltipOf(container)?.textContent).toBe('3,0')
    fireEvent.pointerUp(layer, { ...touch, clientX: 280 })
    expect(tooltipOf(container)?.textContent).toBe('3,0')
  })

  it('shows nothing when a touch is cancelled, as when the page starts to scroll', () => {
    const { container } = chart({ labels })
    const layer = layerOf(container)

    fireEvent.pointerDown(layer, { ...touch, clientX: 170 })
    fireEvent.pointerCancel(layer, touch)
    expect(tooltipOf(container)).toBeNull()
  })

  it('takes the tooltip away at a tap outside the chart, and not at a tap on it', () => {
    const { container, getByTestId } = chart({ labels })
    const layer = layerOf(container)

    fireEvent.pointerUp(layer, { ...touch, clientX: 170 })
    fireEvent.pointerDown(layer, { ...touch, clientX: 100 })
    expect(tooltipOf(container)).not.toBeNull()

    act(() => {
      fireEvent.pointerDown(getByTestId('outside'), touch)
    })
    expect(tooltipOf(container)).toBeNull()
  })

  it('stops listening for taps and for Escape when the chart is gone', () => {
    const { container, unmount } = chart({ labels })

    fireEvent.pointerMove(layerOf(container), { ...mouse, clientX: 100 })
    unmount()
    expect(() => {
      fireEvent.pointerDown(document.body)
      fireEvent.keyDown(document, { key: 'Escape' })
    }).not.toThrow()
  })
})
