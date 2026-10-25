/*
 * Touch events are not Baseline widely available and never will be: desktop Safari doesn't have them. Pointer events
 * are, but a browser cancels those (pointercancel) as soon as it starts to scroll, and the pull starts as a scroll
 * (that the page bounces). Touch events keep coming, and a visitor on a home screen app always has a touch screen.
 */
/* eslint-disable baseline-js/use-baseline -- touch events are not Baseline, see above; not a date but a permanent gap */
/** How far a finger has to travel down, in pixels, before letting go reloads the page. */
export const pullDistance = 80

/** How far a finger may move before we decide whether it moves down or sideways, in pixels. */
const deadZone = 10

export type PullOptions = {
  /** Called with how far the pull has come, from 0 to 1, whenever that changes. 0 means the pull is over. */
  onChange: (progress: number) => void
  /** Called when the finger lets go after 1 was reached. */
  onRefresh: () => void
}

/**
 * True when the site runs as an app from the home screen: Chrome and others say so in a media query, iOS Safari in a
 * property.
 */
export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || Reflect.get(navigator, 'standalone') === true
}

/**
 * Watches the touches on a document for a pull down from the top of the page, with one finger. It never stops the
 * touch, so the page scrolls and bounces as it always does. It starts nothing when the page is not at the top, when
 * the touch starts in a field or an element that scrolls, when a second finger joins, and when the finger first goes
 * up or sideways. Returns a function that stops watching.
 */
export function watchPull(root: Document, { onChange, onRefresh }: PullOptions): () => void {
  let start: undefined | { x: number; y: number }
  let progress = 0

  const atTop = () => (root.scrollingElement?.scrollTop ?? 0) <= 0

  const report = (next: number) => {
    if (next !== progress) {
      progress = next
      onChange(next)
    }
  }

  const stop = () => {
    start = undefined
    report(0)
  }

  const onTouchStart = (event: TouchEvent) => {
    start = undefined
    const [touch] = event.touches

    if (event.touches.length === 1 && touch && atTop() && !isForSomethingElse(event.target, root)) {
      start = { x: touch.clientX, y: touch.clientY }
    }
  }

  const onTouchMove = (event: TouchEvent) => {
    const [touch] = event.touches

    if (!start) {
      return
    }

    if (event.touches.length !== 1 || !touch || !atTop()) {
      stop()
      return
    }

    const down = touch.clientY - start.y
    const sideways = Math.abs(touch.clientX - start.x)

    if (down < 0 || (Math.max(down, sideways) >= deadZone && sideways > down)) {
      stop()
      return
    }

    report(Math.round(Math.min(down / pullDistance, 1) * 100) / 100)
  }

  const onTouchEnd = () => {
    const pulled = start !== undefined && progress >= 1

    start = undefined

    if (pulled) {
      onRefresh()
    } else {
      report(0)
    }
  }

  root.addEventListener('touchstart', onTouchStart, { passive: true })
  root.addEventListener('touchmove', onTouchMove, { passive: true })
  root.addEventListener('touchend', onTouchEnd)
  root.addEventListener('touchcancel', stop)

  return () => {
    root.removeEventListener('touchstart', onTouchStart)
    root.removeEventListener('touchmove', onTouchMove)
    root.removeEventListener('touchend', onTouchEnd)
    root.removeEventListener('touchcancel', stop)
  }
}

/**
 * True when a touch that starts on `target` is meant for something else than pulling the page down: a field to type
 * in, or an element that scrolls sideways or is scrolled down, which the finger would move instead of the page.
 */
function isForSomethingElse(target: EventTarget | null, root: Document): boolean {
  for (let element = target instanceof Element ? target : null; element; element = element.parentElement) {
    if (element === root.body || element === root.documentElement) {
      return false
    }

    if (element.matches('input, select, textarea, [contenteditable]:not([contenteditable="false"])')) {
      return true
    }

    const { overflowX, overflowY } = getComputedStyle(element)
    const scrollsSideways = /auto|scroll/.test(overflowX) && element.scrollWidth > element.clientWidth
    const scrolledDown = /auto|scroll/.test(overflowY) && element.scrollTop > 0

    if (scrollsSideways || scrolledDown) {
      return true
    }
  }

  return false
}
