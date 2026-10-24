import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isStandalone, pullDistance, watchPull } from './pullGesture'

type Point = { x: number; y: number }

/** jsdom has no scrolling element, so this gives the document one, scrolled `top` pixels. */
function scrollTo(top: number) {
  Object.defineProperty(document, 'scrollingElement', { configurable: true, value: { scrollTop: top } })
}

/** A touch event on `target`, with the fingers at `points`. jsdom has no touches of its own. */
function touch(type: string, points: Point[], target: EventTarget = document.body) {
  const event = new Event(type, { bubbles: true, cancelable: true })

  Object.defineProperty(event, 'touches', { value: points.map(({ x, y }) => ({ clientX: x, clientY: y })) })
  target.dispatchEvent(event)
}

describe('watchPull', () => {
  const onChange = vi.fn()
  const onRefresh = vi.fn()
  let stop: () => void

  beforeEach(() => {
    scrollTo(0)
    stop = watchPull(document, { onChange, onRefresh })
  })

  afterEach(() => {
    stop()
    onChange.mockReset()
    onRefresh.mockReset()
    document.body.replaceChildren()
  })

  it('reports how far the pull has come, from 0 to 1, and stays at 1 beyond the distance', () => {
    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 100, y: 100 + pullDistance / 2 }])
    touch('touchmove', [{ x: 100, y: 100 + pullDistance * 3 }])

    expect(onChange.mock.calls).toEqual([[0.5], [1]])
  })

  it('refreshes when the finger lets go after the whole distance', () => {
    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 100, y: 100 + pullDistance }])
    touch('touchend', [])

    expect(onRefresh).toHaveBeenCalledTimes(1)
    // The indicator stays until the page has reloaded.
    expect(onChange).not.toHaveBeenCalledWith(0)
  })

  it('does not refresh when the finger lets go too early, and takes the indicator away', () => {
    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 100, y: 100 + pullDistance - 1 }])
    touch('touchend', [])

    expect(onRefresh).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('does not start when the page is not at the top', () => {
    scrollTo(1)
    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 100, y: 300 }])
    touch('touchend', [])

    expect(onChange).not.toHaveBeenCalled()
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('stops when the page is scrolled during the pull', () => {
    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 100, y: 150 }])
    scrollTo(20)
    touch('touchmove', [{ x: 100, y: 300 }])
    touch('touchend', [])

    expect(onChange).toHaveBeenLastCalledWith(0)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('stops when the finger goes up, because the page scrolls down then', () => {
    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 100, y: 150 }])
    touch('touchmove', [{ x: 100, y: 90 }])
    touch('touchmove', [{ x: 100, y: 400 }])
    touch('touchend', [])

    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('does not start when the finger goes sideways first', () => {
    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 130, y: 105 }])
    touch('touchmove', [{ x: 130, y: 300 }])
    touch('touchend', [])

    expect(onChange).not.toHaveBeenCalled()
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('does not start with two fingers, and stops when a second finger joins', () => {
    touch('touchstart', [
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ])
    touch('touchmove', [{ x: 100, y: 300 }])
    touch('touchend', [])
    expect(onRefresh).not.toHaveBeenCalled()

    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 100, y: 150 }])
    touch('touchmove', [
      { x: 100, y: 300 },
      { x: 200, y: 300 },
    ])
    touch('touchend', [])
    expect(onRefresh).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenLastCalledWith(0)
  })

  it('stops when the browser cancels the touch', () => {
    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 100, y: 150 }])
    touch('touchcancel', [])

    expect(onChange).toHaveBeenLastCalledWith(0)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it.each(['input', 'textarea', 'select'])('does not start in a %s', (tag) => {
    const field = document.body.appendChild(document.createElement(tag))

    touch('touchstart', [{ x: 100, y: 100 }], field)
    touch('touchmove', [{ x: 100, y: 300 }], field)
    touch('touchend', [], field)

    expect(onChange).not.toHaveBeenCalled()
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('does not start in an element that can be edited', () => {
    const editor = document.body.appendChild(document.createElement('div'))
    const inner = editor.appendChild(document.createElement('span'))

    editor.setAttribute('contenteditable', 'true')
    touch('touchstart', [{ x: 100, y: 100 }], inner)
    touch('touchmove', [{ x: 100, y: 300 }], inner)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('does not start in an element that scrolls sideways, such as a wide table', () => {
    const wrapper = document.body.appendChild(document.createElement('div'))
    const cell = wrapper.appendChild(document.createElement('td'))

    wrapper.style.overflowX = 'auto'
    Object.defineProperty(wrapper, 'scrollWidth', { value: 600 })
    Object.defineProperty(wrapper, 'clientWidth', { value: 300 })
    touch('touchstart', [{ x: 100, y: 100 }], cell)
    touch('touchmove', [{ x: 100, y: 300 }], cell)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('does start in an element that can scroll sideways but has nothing to scroll', () => {
    const wrapper = document.body.appendChild(document.createElement('div'))

    wrapper.style.overflowX = 'auto'
    touch('touchstart', [{ x: 100, y: 100 }], wrapper)
    touch('touchmove', [{ x: 100, y: 140 }], wrapper)

    expect(onChange).toHaveBeenCalledWith(0.5)
  })

  it('does not start in an element that is scrolled down, because the finger scrolls it up', () => {
    const list = document.body.appendChild(document.createElement('div'))

    list.style.overflowY = 'scroll'
    Object.defineProperty(list, 'scrollTop', { value: 40 })
    touch('touchstart', [{ x: 100, y: 100 }], list)
    touch('touchmove', [{ x: 100, y: 300 }], list)

    expect(onChange).not.toHaveBeenCalled()
  })

  it('stops listening when it is stopped', () => {
    stop()
    touch('touchstart', [{ x: 100, y: 100 }])
    touch('touchmove', [{ x: 100, y: 300 }])
    touch('touchend', [])

    expect(onChange).not.toHaveBeenCalled()
    expect(onRefresh).not.toHaveBeenCalled()
  })
})

describe('isStandalone', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, 'standalone')
  })

  const media = (matches: boolean) => vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches }))

  it('is true when the display mode is standalone', () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true })

    vi.stubGlobal('matchMedia', matchMedia)

    expect(isStandalone()).toBe(true)
    expect(matchMedia).toHaveBeenCalledWith('(display-mode: standalone)')
  })

  it('is true on an iPhone that says navigator.standalone', () => {
    media(false)
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: true })

    expect(isStandalone()).toBe(true)
  })

  it('is false in a browser tab', () => {
    media(false)

    expect(isStandalone()).toBe(false)
  })

  it('is false in a tab of Safari, where navigator.standalone is false', () => {
    media(false)
    Object.defineProperty(navigator, 'standalone', { configurable: true, value: false })

    expect(isStandalone()).toBe(false)
  })
})
