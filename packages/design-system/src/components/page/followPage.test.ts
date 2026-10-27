import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { barWidths, followPage, pickCurrent } from './followPage'

describe('pickCurrent', () => {
  it('is the last target in the order of the page that has come past the line', () => {
    expect(pickCurrent([true, true, false, false], false)).toBe(1)
  })

  it('is no target before the first has come past, so there is no current link', () => {
    expect(pickCurrent([false, false], false)).toBe(-1)
    expect(pickCurrent([], false)).toBe(-1)
  })

  it('is the last target at the bottom of the page, as it cannot come up to the line', () => {
    expect(pickCurrent([true, true, false], true)).toBe(2)
    expect(pickCurrent([false, false], true)).toBe(1)
  })

  it('is no target at the bottom of a page without targets', () => {
    expect(pickCurrent([], true)).toBe(-1)
  })
})

describe('the narrow width of followPage', () => {
  it('is the width where the body has one column, the same as the one in shortcuts.css', () => {
    const css = readFileSync(join(import.meta.dirname, 'shortcuts.css'), 'utf8')
    const wide = css.match(/@media \(width >= ([\d.]+rem)\) \{\s*display: none;/)?.[1]

    expect(barWidths).toBe(`(width < ${wide})`)
  })
})

// jsdom has no layout, no IntersectionObserver and no media queries, so the test stands in for
// them: it says what the observers are told, and which media match.
class FakeObserver {
  static all: FakeObserver[] = []

  callback: IntersectionObserverCallback
  disconnect = vi.fn()

  observe = vi.fn()
  options: IntersectionObserverInit

  constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
    this.callback = callback
    this.options = options
    FakeObserver.all.push(this)
  }

  // The browser tells that a target is now above the line, or under it, or not on the screen.
  report(top: number) {
    const target = this.observe.mock.calls[0]?.[0] as Element
    const entry = {
      boundingClientRect: { height: 30, top, width: 100 },
      isIntersecting: true,
      target,
    } as unknown as IntersectionObserverEntry

    this.callback([entry], this as unknown as IntersectionObserver)
  }
}

const ids = ['programma', 'uitslagen', 'stand']

// What each test starts is stopped after it, so the listeners on the window do not pile up.
const stops: (() => void)[] = []

const scrollWindow = ({ height, scrollY, viewport }: { height: number; scrollY: number; viewport: number }) => {
  Object.defineProperty(document.documentElement, 'scrollHeight', { configurable: true, value: height })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewport })
  Object.defineProperty(window, 'scrollY', { configurable: true, value: scrollY })
}

const setUp = ({ narrow = true, reduced = false, scrolls = true } = {}) => {
  document.body.innerHTML = `
    <nav><div id="row"><ul>
      ${ids.map((id) => `<li><a href="#${id}">${id}</a></li>`).join('')}
      <li><a href="#niets">niets</a></li>
      <li><a href="/elders">elders</a></li>
    </ul></div></nav>
    <main>${ids.map((id) => `<h2 id="${id}">${id}</h2>`).join('')}</main>`

  const media = { narrow, reduced }
  const changes: (() => void)[] = []

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      addEventListener: (_type: string, listener: () => void) => changes.push(listener),
      get matches() {
        return query === '(prefers-reduced-motion: reduce)' ? media.reduced : media.narrow
      },
      removeEventListener: vi.fn(),
    })),
  )
  vi.stubGlobal('IntersectionObserver', FakeObserver)
  // A frame comes when the test says so, as it does in a browser: after the code that asked.
  const frames: FrameRequestCallback[] = []

  const requestFrame = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => frames.push(callback))
  vi.spyOn(window, 'getComputedStyle').mockImplementation(
    (element) =>
      ({
        scrollMarginTop: element.tagName === 'H2' ? '24px' : '0px',
        scrollPaddingLeft: '29px',
        scrollPaddingTop: '47px',
      }) as unknown as CSSStyleDeclaration,
  )

  const row = document.getElementById('row') as HTMLElement
  const link = (id: string) => row.querySelector(`a[href="#${id}"]`) as HTMLAnchorElement
  const scrollTo = vi.fn()

  row.scrollTo = scrollTo
  Object.defineProperty(row, 'scrollWidth', { value: scrolls ? 700 : 260 })
  Object.defineProperty(row, 'clientWidth', { value: 260 })
  vi.spyOn(row, 'getBoundingClientRect').mockReturnValue({ left: 100 } as DOMRect)

  // Where the links stand against the row now: 200 apart, in the order of the list.
  const place = (id: string, left: number) =>
    vi.spyOn(link(id), 'getBoundingClientRect').mockReturnValue({ left } as DOMRect)

  for (const [index, id] of ids.entries()) {
    place(id, 100 + 200 * index)
  }

  const stop = followPage(row, window as typeof globalThis & Window)

  stops.push(stop)
  const current = () => Array.from(row.querySelectorAll('[aria-current]')).map((item) => item.textContent)

  const nextFrame = () => frames.splice(0).forEach((callback) => callback(0))

  return { changes, current, link, media, nextFrame, place, requestFrame, row, scrollTo, stop }
}

beforeEach(() => {
  FakeObserver.all = []
})

afterEach(() => {
  for (const stop of stops.splice(0)) {
    stop()
  }

  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('followPage', () => {
  it('has no current link before the first heading has come past the line', () => {
    const { current } = setUp()

    FakeObserver.all[0]?.report(300)

    expect(current()).toEqual([])
  })

  it('marks the link to the heading that came past the line last, and only that one', () => {
    const { current } = setUp()

    FakeObserver.all[0]?.report(10)
    expect(current()).toEqual(['programma'])

    FakeObserver.all[1]?.report(-5)
    expect(current()).toEqual(['uitslagen'])

    // Scrolling back up, the second heading is under the line again.
    FakeObserver.all[1]?.report(200)
    expect(current()).toEqual(['programma'])
  })

  it('marks the link with aria-current="location", for a place on the page, and not "page"', () => {
    const { link } = setUp()

    FakeObserver.all[0]?.report(10)

    expect(link('programma').getAttribute('aria-current')).toBe('location')
  })

  it('has one observer for each heading that a link points to, with the line where a click puts it', () => {
    setUp()

    // The room of the page under the bar (47), of the heading itself (24) and one pixel.
    expect(FakeObserver.all).toHaveLength(3)
    expect(FakeObserver.all.map((observer) => observer.options.rootMargin)).toEqual(
      Array(3).fill('-72px 0px 1000000px 0px'),
    )
    expect(FakeObserver.all[0]?.observe.mock.calls[0]?.[0]).toBe(document.getElementById('programma'))
  })

  it('counts a heading that a click brought to the line as past it', () => {
    const { current } = setUp()

    // The heading lands 24px under the room of the page: 71px. The line is one pixel lower.
    FakeObserver.all[2]?.report(71)

    expect(current()).toEqual(['stand'])
  })

  it('does not use a link that points to nothing or to another page, and an element that is not shown is not past', () => {
    const { current, link } = setUp()

    for (const observer of FakeObserver.all) {
      observer.report(0)
    }

    expect(current()).toEqual(['stand'])
    expect(link('niets').hasAttribute('aria-current')).toBe(false)
    expect(FakeObserver.all).toHaveLength(3)
  })

  it('takes a heading that has no size, such as one that is not shown, as not past the line', () => {
    const { current } = setUp()
    const entry = { boundingClientRect: { height: 0, top: 0, width: 0 }, isIntersecting: false }

    FakeObserver.all[0]?.callback([entry as IntersectionObserverEntry], {} as IntersectionObserver)

    expect(current()).toEqual([])
  })

  it('is the last link at the bottom of the page when its heading is on the screen but under the line', () => {
    const { current, nextFrame } = setUp()

    scrollWindow({ height: 3000, scrollY: 2200, viewport: 800 })
    vi.spyOn(document.getElementById('stand') as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      height: 30,
      top: 500,
      width: 100,
    } as DOMRect)

    FakeObserver.all[0]?.report(-300)
    FakeObserver.all[2]?.report(500)
    expect(current()).toEqual(['programma'])

    window.dispatchEvent(new Event('scroll'))
    nextFrame()
    expect(current()).toEqual(['stand'])
  })

  it('is not the last link at the bottom of the page when its heading is not on the screen', () => {
    const { current, nextFrame } = setUp()

    scrollWindow({ height: 3000, scrollY: 2200, viewport: 800 })
    vi.spyOn(document.getElementById('stand') as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      height: 0,
      top: 0,
      width: 0,
    } as DOMRect)
    FakeObserver.all[0]?.report(-300)
    window.dispatchEvent(new Event('scroll'))
    nextFrame()

    expect(current()).toEqual(['programma'])
  })

  it('looks at everything under the line, down to the end of the page, so it hears of a jump over a heading', () => {
    setUp()

    expect(FakeObserver.all[0]?.options.rootMargin).toMatch(/^-\d+px 0px \d{6,}px 0px$/)
  })

  it('checks for the bottom once a frame, however many times the page scrolls in it', () => {
    const { nextFrame, requestFrame } = setUp()

    requestFrame.mockClear()
    nextFrame()

    for (let count = 0; count < 5; count++) {
      window.dispatchEvent(new Event('scroll'))
    }

    expect(requestFrame).toHaveBeenCalledTimes(1)
  })

  it('is not at the bottom of a page that does not scroll', () => {
    const { current, nextFrame } = setUp()

    scrollWindow({ height: 700, scrollY: 0, viewport: 800 })
    vi.spyOn(document.getElementById('stand') as HTMLElement, 'getBoundingClientRect').mockReturnValue({
      height: 30,
      top: 500,
      width: 100,
    } as DOMRect)
    FakeObserver.all[2]?.report(500)
    window.dispatchEvent(new Event('scroll'))
    nextFrame()

    expect(current()).toEqual([])
  })

  it('does not listen when the bar is gone, and starts when the width comes under the one of two columns', () => {
    const { changes, current, media } = setUp({ narrow: false })

    expect(FakeObserver.all).toHaveLength(0)

    media.narrow = true
    changes.forEach((change) => change())
    FakeObserver.all[0]?.report(10)

    expect(FakeObserver.all).toHaveLength(3)
    expect(current()).toEqual(['programma'])

    media.narrow = false
    changes.forEach((change) => change())

    expect(current()).toEqual([])
    expect(FakeObserver.all.every((observer) => observer.disconnect.mock.calls.length > 0)).toBe(true)
  })

  it('stops, clears the mark and lets go of the observers', () => {
    const { current, stop } = setUp()

    FakeObserver.all[0]?.report(10)
    stop()

    expect(current()).toEqual([])
    expect(FakeObserver.all.every((observer) => observer.disconnect.mock.calls.length > 0)).toBe(true)
  })

  it('does nothing in a browser without IntersectionObserver, or without media queries', () => {
    const { stop } = setUp()

    stop()
    vi.stubGlobal('IntersectionObserver', undefined)
    delete (window as { IntersectionObserver?: unknown }).IntersectionObserver
    FakeObserver.all = []

    followPage(document.getElementById('row') as HTMLElement, window as typeof globalThis & Window)

    expect(FakeObserver.all).toHaveLength(0)
  })

  it('measures the line again when the window gets another size, and not when it stays', () => {
    setUp()
    const before = FakeObserver.all.length

    window.dispatchEvent(new Event('resize'))
    expect(FakeObserver.all).toHaveLength(before)

    vi.spyOn(window, 'getComputedStyle').mockImplementation(
      (element) =>
        ({
          scrollMarginTop: element.tagName === 'H2' ? '24px' : '0px',
          scrollPaddingLeft: '29px',
          scrollPaddingTop: '63px',
        }) as unknown as CSSStyleDeclaration,
    )
    window.dispatchEvent(new Event('resize'))

    expect(FakeObserver.all).toHaveLength(before * 2)
    expect(FakeObserver.all.at(-1)?.options.rootMargin).toBe('-88px 0px 1000000px 0px')
  })
})

describe('the row of followPage', () => {
  it('scrolls so that the current link is first, after the room for the fade, and never scrolls the page', () => {
    const { row, scrollTo } = setUp()
    const scrollPage = vi.spyOn(window, 'scrollTo')
    const scrollIntoView = vi.fn()

    Element.prototype.scrollIntoView = scrollIntoView
    row.scrollLeft = 50

    FakeObserver.all[2]?.report(10)

    // The link stands 400 from the start of the row, and 29 is where it should be.
    expect(scrollTo).toHaveBeenCalledWith({ behavior: 'smooth', left: 50 + (500 - 100 - 29) })
    expect(scrollPage).not.toHaveBeenCalled()
    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it('scrolls at once for someone who asked for less motion', () => {
    const { scrollTo } = setUp({ reduced: true })

    FakeObserver.all[2]?.report(10)

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'instant' }))
  })

  it('does nothing when the current link is first already', () => {
    const { place, scrollTo } = setUp()

    place('programma', 129.4)
    FakeObserver.all[0]?.report(10)

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does nothing when the row does not scroll, as at the narrowest width, where it wraps', () => {
    const { scrollTo } = setUp({ scrolls: false })

    FakeObserver.all[2]?.report(10)

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does nothing when the current link does not change', () => {
    const { scrollTo } = setUp()

    FakeObserver.all[2]?.report(10)
    FakeObserver.all[2]?.report(5)

    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('does not scroll while a finger is on the row, and does once it is gone', () => {
    const { row, scrollTo } = setUp()

    row.dispatchEvent(new Event('touchstart', { bubbles: true }))
    FakeObserver.all[2]?.report(10)
    expect(scrollTo).not.toHaveBeenCalled()

    row.dispatchEvent(new Event('touchend', { bubbles: true }))
    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('does not scroll the row when the finger lifts and the current link did not change', () => {
    const { row, scrollTo } = setUp()

    row.dispatchEvent(new Event('touchstart', { bubbles: true }))
    row.dispatchEvent(new Event('touchend', { bubbles: true }))

    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does not scroll while a link in the row has the focus of the keyboard, and does once the focus has left', () => {
    vi.useFakeTimers()
    const { link, row, scrollTo } = setUp()

    link('programma').focus()
    vi.spyOn(link('programma'), 'matches').mockImplementation((selector) => selector === ':focus-visible')
    FakeObserver.all[2]?.report(10)
    expect(scrollTo).not.toHaveBeenCalled()

    link('programma').blur()
    row.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    vi.runAllTimers()

    expect(scrollTo).toHaveBeenCalledTimes(1)
  })

  it('does scroll when the focus is there from a press with a finger or a mouse', () => {
    const { link, scrollTo } = setUp()

    link('programma').focus()
    vi.spyOn(link('programma'), 'matches').mockReturnValue(false)
    FakeObserver.all[2]?.report(10)

    expect(scrollTo).toHaveBeenCalledTimes(1)
  })
})

describe('a click in the row of followPage', () => {
  const click = (element: Element, init: MouseEventInit = {}) =>
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, button: 0, cancelable: true, ...init }))

  it('makes the link that was clicked the current one, whatever the page does on its way', () => {
    const { current, link } = setUp()

    FakeObserver.all[0]?.report(10)
    click(link('stand'))
    expect(current()).toEqual(['stand'])

    // The page scrolls on to the heading and passes the one in between.
    FakeObserver.all[1]?.report(-10)
    expect(current()).toEqual(['stand'])
  })

  it('follows the page again once the visitor scrolls', () => {
    const { current, link } = setUp()

    FakeObserver.all[0]?.report(10)
    click(link('stand'))
    window.dispatchEvent(new Event('wheel'))

    expect(current()).toEqual(['programma'])
  })

  it('leaves a click with a modifier key alone, as it does not bring the page to the heading', () => {
    const { current, link } = setUp()

    FakeObserver.all[0]?.report(10)
    click(link('stand'), { ctrlKey: true })
    click(link('stand'), { metaKey: true })

    expect(current()).toEqual(['programma'])
  })

  it('leaves a click on a link to nothing alone', () => {
    const { current, link } = setUp()

    click(link('niets'))

    expect(current()).toEqual([])
  })
})
