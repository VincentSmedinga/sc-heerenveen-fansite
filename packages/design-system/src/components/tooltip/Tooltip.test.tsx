import { fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Tooltip } from './Tooltip'

/** jsdom has no layout, so the sizes of the parent and the tooltip are set by hand. */
function sizes(parent: { height: number; width: number }, tooltip: { height: number; width: number }) {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(parent.width)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(parent.height)
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(tooltip.width)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(tooltip.height)
}

const positionOf = (element: HTMLElement) => [
  element.style.getPropertyValue('--hf-tooltip-x'),
  element.style.getPropertyValue('--hf-tooltip-y'),
]

afterEach(() => {
  vi.restoreAllMocks()
})

describe('Tooltip', () => {
  it('shows its text and is hidden from a screen reader, without focus or a place in the tab order', () => {
    const { container } = render(
      <Tooltip bottom={50} left={50}>
        1,8
      </Tooltip>,
    )
    const tooltip = container.firstElementChild as HTMLElement

    expect(tooltip.textContent).toBe('1,8')
    expect(tooltip.getAttribute('aria-hidden')).toBe('true')
    expect(tooltip.hasAttribute('tabindex')).toBe(false)
    expect(container.querySelector('a, button, input, [tabindex]')).toBeNull()
  })

  it('sits above the place, centred on it', () => {
    sizes({ height: 64, width: 200 }, { height: 24, width: 40 })
    const { container } = render(
      <Tooltip bottom={20} left={50}>
        1,8
      </Tooltip>,
    )
    const tooltip = container.firstElementChild as HTMLElement

    // The place is 100 across and 51.2 down; the tooltip is 12 above it.
    expect(tooltip.dataset['side']).toBe('above')
    expect(positionOf(tooltip)).toEqual(['80px', '15.2px'])
  })

  it('sits below the place when there is no room above it', () => {
    sizes({ height: 64, width: 200 }, { height: 24, width: 40 })
    const { container } = render(
      <Tooltip bottom={70} left={50}>
        1,8
      </Tooltip>,
    )
    const tooltip = container.firstElementChild as HTMLElement

    expect(tooltip.dataset['side']).toBe('below')
    expect(positionOf(tooltip)).toEqual(['80px', '31.2px'])
  })

  it('stays inside the parent at its edges', () => {
    sizes({ height: 64, width: 200 }, { height: 24, width: 40 })
    const left = render(
      <Tooltip bottom={20} left={1}>
        1,8
      </Tooltip>,
    )
    const right = render(
      <Tooltip bottom={20} left={99}>
        1,8
      </Tooltip>,
    )

    expect(positionOf(left.container.firstElementChild as HTMLElement)[0]).toBe('0px')
    expect(positionOf(right.container.firstElementChild as HTMLElement)[0]).toBe('160px')
  })

  it('moves to a new place at once, without a transition', () => {
    sizes({ height: 64, width: 200 }, { height: 24, width: 40 })
    const { container, rerender } = render(
      <Tooltip bottom={20} left={20}>
        1,8
      </Tooltip>,
    )

    rerender(
      <Tooltip bottom={20} left={60}>
        2,0
      </Tooltip>,
    )

    const tooltip = container.firstElementChild as HTMLElement

    expect(tooltip.textContent).toBe('2,0')
    expect(positionOf(tooltip)[0]).toBe('100px')
  })

  it('reports Escape through onClose, and no other key', () => {
    const onClose = vi.fn()

    render(
      <Tooltip bottom={50} left={50} onClose={onClose}>
        1,8
      </Tooltip>,
    )
    fireEvent.keyDown(document, { key: 'Enter' })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('stops listening for Escape when it is gone', () => {
    const onClose = vi.fn()
    const { unmount } = render(
      <Tooltip bottom={50} left={50} onClose={onClose}>
        1,8
      </Tooltip>,
    )

    unmount()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
