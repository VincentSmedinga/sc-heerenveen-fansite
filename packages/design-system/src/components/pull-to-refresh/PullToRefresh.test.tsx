import { act, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pullDistance } from './pullGesture'
import { PullIndicator } from './PullIndicator'
import { PullToRefresh } from './PullToRefresh'

function standalone(matches: boolean) {
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }))
}

function touch(type: string, y: number) {
  const event = new Event(type, { bubbles: true, cancelable: true })

  Object.defineProperty(event, 'touches', { value: type === 'touchend' ? [] : [{ clientX: 100, clientY: y }] })
  act(() => {
    document.body.dispatchEvent(event)
  })
}

describe('PullIndicator', () => {
  it('tells the visitor to pull down, and to let go once that will refresh', () => {
    const { container, rerender } = render(<PullIndicator progress={0.4} />)

    expect(container.textContent).toBe('Trek omlaag om te verversen')
    expect(container.firstElementChild?.hasAttribute('data-ready')).toBe(false)

    rerender(<PullIndicator progress={1} />)

    expect(container.textContent).toBe('Loslaten om te verversen')
    expect(container.firstElementChild?.hasAttribute('data-ready')).toBe(true)
  })

  it('says it is refreshing once the finger has let go', () => {
    const { container } = render(<PullIndicator progress={1} refreshing />)

    expect(container.textContent).toBe('Bezig met verversen')
  })

  it('is hidden from screen readers and passes the progress on to the styles', () => {
    const { container } = render(<PullIndicator progress={0.25} />)
    const indicator = container.firstElementChild as HTMLElement

    expect(indicator.getAttribute('aria-hidden')).toBe('true')
    expect(indicator.style.getPropertyValue('--hf-pull-progress')).toBe('0.25')
  })
})

describe('PullToRefresh', () => {
  const reload = vi.fn()

  beforeEach(() => {
    // jsdom has no scrolling element; this one is at the top.
    Object.defineProperty(document, 'scrollingElement', { configurable: true, value: { scrollTop: 0 } })
    vi.stubGlobal('location', { ...window.location, reload })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    reload.mockReset()
  })

  it('shows nothing until a visitor pulls', () => {
    standalone(true)
    const { container } = render(<PullToRefresh />)

    expect(container.innerHTML).toBe('')
  })

  it('shows the indicator while pulling and reloads the page on letting go past the distance', () => {
    standalone(true)
    const { container } = render(<PullToRefresh />)

    touch('touchstart', 100)
    touch('touchmove', 100 + pullDistance / 2)
    expect(container.textContent).toBe('Trek omlaag om te verversen')

    touch('touchmove', 100 + pullDistance)
    expect(container.textContent).toBe('Loslaten om te verversen')

    touch('touchend', 0)
    expect(reload).toHaveBeenCalledTimes(1)
    expect(container.textContent).toBe('Bezig met verversen')
  })

  it('takes the indicator away when the pull ends too early', () => {
    standalone(true)
    const { container } = render(<PullToRefresh />)

    touch('touchstart', 100)
    touch('touchmove', 130)
    expect(container.textContent).not.toBe('')

    touch('touchend', 0)
    expect(container.innerHTML).toBe('')
    expect(reload).not.toHaveBeenCalled()
  })

  it('stops the browser from refreshing by itself while it runs as an app, and no longer after it is removed', () => {
    standalone(true)
    const { unmount } = render(<PullToRefresh />)

    expect(document.documentElement.hasAttribute('data-pull-to-refresh')).toBe(true)

    unmount()
    expect(document.documentElement.hasAttribute('data-pull-to-refresh')).toBe(false)
  })

  it('does nothing in a browser tab: no listeners, no attribute, no reload', () => {
    standalone(false)
    const { container } = render(<PullToRefresh />)

    touch('touchstart', 100)
    touch('touchmove', 100 + pullDistance * 2)
    touch('touchend', 0)

    expect(container.innerHTML).toBe('')
    expect(reload).not.toHaveBeenCalled()
    expect(document.documentElement.hasAttribute('data-pull-to-refresh')).toBe(false)
  })
})
