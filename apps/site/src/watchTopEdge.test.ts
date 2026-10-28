// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { watchTopEdge } from './watchTopEdge'

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void

/** An IntersectionObserver that a test drives by hand. */
function stubObserver() {
  const seen: { callback: Callback; disconnected: boolean; options?: IntersectionObserverInit; targets: Element[] }[] =
    []

  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly record: (typeof seen)[number]

      constructor(callback: Callback, options?: IntersectionObserverInit) {
        this.record = { callback, disconnected: false, targets: [], ...(options === undefined ? {} : { options }) }
        seen.push(this.record)
      }

      disconnect() {
        this.record.disconnected = true
      }

      observe(target: Element) {
        this.record.targets.push(target)
      }
    },
  )
  // jsdom's window is not the global one, so the same class is on the window of the document.
  Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: globalThis.IntersectionObserver })

  return {
    // Without a target it is every element that is watched, one entry each.
    see: (isIntersecting: boolean, target?: Element) => {
      const targets = target === undefined ? (seen[0]?.targets ?? []) : [target]

      seen[0]?.callback(targets.map((entry) => ({ isIntersecting, target: entry })))
    },
    seen,
  }
}

const stubDisplayMode = (standalone: boolean) => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: standalone })),
  )
  window.matchMedia = globalThis.matchMedia
}

describe('watchTopEdge', () => {
  let edge: HTMLElement

  beforeEach(() => {
    document.body.innerHTML =
      '<div class="hf-page-top-edge"></div><header class="hf-page-header"></header><nav class="hf-navigation hf-navigation-header"></nav>'
    edge = document.querySelector<HTMLElement>('.hf-page-top-edge')!
    stubDisplayMode(false)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(window, 'IntersectionObserver')
  })

  it('watches the header and the main menu, which count as on the screen while they reach below the strip', () => {
    const observer = stubObserver()

    watchTopEdge(document)

    expect(observer.seen[0]?.targets).toEqual([
      document.querySelector('.hf-page-header'),
      document.querySelector('.hf-navigation-header'),
    ])
    expect(observer.seen[0]?.options?.rootMargin).toBe('-8px 0px 0px 0px')
  })

  it('keeps the strip while the main menu is on the screen after the header has scrolled away', () => {
    const observer = stubObserver()

    watchTopEdge(document)
    observer.see(true)
    observer.see(false, document.querySelector('.hf-page-header')!)
    expect(edge.hidden).toBe(false)

    observer.see(false, document.querySelector('.hf-navigation-header')!)
    expect(edge.hidden).toBe(true)

    observer.see(true, document.querySelector('.hf-navigation-header')!)
    expect(edge.hidden).toBe(false)
  })

  it('takes the strip off when the header has scrolled away and puts it back when the header is back', () => {
    const observer = stubObserver()

    watchTopEdge(document)
    expect(edge.hidden).toBe(false)

    observer.see(false)
    expect(edge.hidden).toBe(true)

    observer.see(true)
    expect(edge.hidden).toBe(false)
  })

  it('stops watching and shows the strip again when it is told to stop', () => {
    const observer = stubObserver()
    const stop = watchTopEdge(document)

    observer.see(false)
    stop()

    expect(observer.seen[0]?.disconnected).toBe(true)
    expect(edge.hidden).toBe(false)
  })

  it('keeps the strip in an app on the home screen, where the status bar is see-through', () => {
    const observer = stubObserver()

    stubDisplayMode(true)
    watchTopEdge(document)

    expect(observer.seen).toHaveLength(0)
    expect(edge.hidden).toBe(false)
  })

  it('keeps the strip in an app that Safari reports with navigator.standalone', () => {
    const observer = stubObserver()

    Object.defineProperty(window.navigator, 'standalone', { configurable: true, value: true })
    watchTopEdge(document)
    Reflect.deleteProperty(window.navigator, 'standalone')

    expect(observer.seen).toHaveLength(0)
  })

  it('does nothing without a strip or without a header', () => {
    const observer = stubObserver()

    document.body.innerHTML = '<header class="hf-page-header"></header>'
    watchTopEdge(document)
    document.body.innerHTML = '<div class="hf-page-top-edge"></div>'
    watchTopEdge(document)

    expect(observer.seen).toHaveLength(0)
  })

  it('does nothing in a browser without IntersectionObserver', () => {
    expect(() => watchTopEdge(document)()).not.toThrow()
    expect(edge.hidden).toBe(false)
  })
})
