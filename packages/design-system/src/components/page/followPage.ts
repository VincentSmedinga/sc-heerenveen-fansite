/**
 * Makes the bar of Page.Shortcuts follow the page: the link to the heading that came past the
 * line under the bar last is the current place, and the row scrolls it to the start. Without
 * script the bar has no current link and works as it did.
 */

/**
 * The widths at which the bar shows: under the width where the Page.Body has two columns, and
 * the bar is gone (see shortcuts.css, which a test compares with this). From there on nothing
 * listens to the scrolling.
 */
export const barWidths = '(width < 52rem)'

/**
 * The index of the current target, from whether each target in the order of the page has come
 * past the line, or -1 before the first has. At the bottom of the page the last card can't
 * scroll up to the line, however short it is, so it is the current one.
 */
export function pickCurrent(passed: readonly boolean[], atBottom: boolean): number {
  if (atBottom && passed.length > 0) {
    return passed.length - 1
  }

  return passed.lastIndexOf(true)
}

/**
 * Where a link to the target puts it: the room the page keeps under the bar that sticks and the
 * room the target keeps for itself (a heading has some). One pixel more, so that a target that
 * lands there has passed the line, and not just reached it.
 */
const lineOf = (win: Window, target: Element) =>
  (parseFloat(win.getComputedStyle(win.document.documentElement).scrollPaddingTop) || 0) +
  (parseFloat(win.getComputedStyle(target).scrollMarginTop) || 0) +
  1

/** How far under the screen the observers look: further than any page is long. */
const toTheEnd = 1_000_000

/** The element that a link to `#id` points to, or null if the link points to nothing. */
const targetOf = (doc: Document, link: HTMLAnchorElement) => {
  const hash = link.getAttribute('href') ?? ''

  try {
    return hash.length > 1 ? doc.getElementById(decodeURIComponent(hash.slice(1))) : null
  } catch {
    return null
  }
}

/**
 * Follows the page for the row of a bar and returns a function that stops. It marks the link to
 * the current place with `aria-current="location"` (the stripe is in shortcuts.css) and scrolls
 * the row, and never the page, so that link stands first after the label and the fade, where
 * the row snaps to (the scroll padding).
 *
 * It asks the browser when a target comes past the line, with an IntersectionObserver, and does
 * not measure the page while it scrolls. The line is where a click on the link puts the
 * target, so a heading that a click brought there has passed it. It is measured when the bar
 * starts, and again if the window gets another size. One thing else needs the scrolling: the
 * bottom of the page, where no target crosses the line any more, which is one cheap check a
 * frame.
 *
 * The visitor decides. The row does not scroll while a finger is on it, or while a link in it
 * has the focus of the keyboard; it scrolls once they are gone, if the current link changed in
 * the meantime. A click on a link makes that link the current one, until the visitor scrolls
 * again, so the bar does not run along the cards that a long jump passes. The row scrolls
 * smoothly, and at once for someone who asked for less motion.
 */
export function followPage(row: HTMLElement, win: typeof globalThis & Window = window): () => void {
  const doc = row.ownerDocument

  if (typeof win.matchMedia !== 'function' || !('IntersectionObserver' in win)) {
    return () => undefined
  }

  const bar = win.matchMedia(barWidths)
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)')
  let stop: () => void = () => undefined

  const start = () => {
    // The links to a target, with the target, in the order of the page.
    const found = Array.from(row.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')).flatMap((link) => {
      const target = targetOf(doc, link)

      return target === null ? [] : [{ link, target }]
    })
    const targets = found.sort((a, b) =>
      a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    const passed = targets.map(() => false)

    if (targets.length === 0) {
      return () => undefined
    }

    let atBottom = false
    let current = -1
    let pinned = -1
    let touching = false
    let pending = false
    // The line of each target, and an observer for each, as the lines differ by target.
    let lines = targets.map(({ target }) => lineOf(win, target))
    let observers: IntersectionObserver[] = []
    let frame = 0

    // A link in the row has the focus of the keyboard: a press with a finger or a mouse gives
    // the focus as well, and may move the row.
    const keyboardInRow = () => {
      const active = doc.activeElement

      return active !== null && row.contains(active) && active.matches(':focus-visible')
    }

    const scrollToCurrent = () => {
      const link = targets[current]?.link

      if (link === undefined) {
        return
      }

      if (touching || keyboardInRow()) {
        pending = true

        return
      }

      pending = false

      // A wrapped row does not scroll. The room is the fade and the room for the focus ring
      // (see shortcuts.css), where the row snaps to.
      const room = parseFloat(win.getComputedStyle(row).scrollPaddingLeft) || 0
      const delta = link.getBoundingClientRect().left - row.getBoundingClientRect().left - room

      if (row.scrollWidth > row.clientWidth && Math.abs(delta) >= 1) {
        row.scrollTo({ behavior: reduced.matches ? 'instant' : 'smooth', left: row.scrollLeft + delta })
      }
    }

    const show = (index: number) => {
      if (index === current) {
        return
      }

      targets[current]?.link.removeAttribute('aria-current')
      targets[index]?.link.setAttribute('aria-current', 'location')
      current = index
      scrollToCurrent()
    }

    const choose = () => show(pinned >= 0 ? pinned : pickCurrent(passed, atBottom))

    const observe = () => {
      for (const observer of observers) {
        observer.disconnect()
      }

      // What an observer sees is everything under the line, down to the end of the page. A
      // target is under the line, and not past it, until its top crosses the line, and then its
      // share in view changes: the browser tells us then, and not before. A target that is past
      // the line is gone from what the observer sees, so it also tells us when the page jumps
      // over it.
      observers = targets.map(({ target }, index) => {
        const observer = new win.IntersectionObserver(
          ([entry]) => {
            if (entry !== undefined && index < passed.length) {
              const box = entry.boundingClientRect

              // An element that is not shown has no size, and so no place above the line.
              passed[index] = box.top <= (lines[index] ?? 0) && (box.width > 0 || box.height > 0)
              choose()
            }
          },
          { rootMargin: `-${lines[index]}px 0px ${toTheEnd}px 0px`, threshold: [0, 1] },
        )

        observer.observe(target)

        return observer
      })
    }

    const reachBottom = () => {
      frame = 0

      const root = doc.documentElement
      const box = targets.at(-1)?.target.getBoundingClientRect()
      // The page scrolls, and is at its end, with the heading of the last card on the screen.
      const bottom =
        root.scrollHeight > win.innerHeight + 1 &&
        win.scrollY + win.innerHeight >= root.scrollHeight - 1 &&
        box !== undefined &&
        box.top < win.innerHeight &&
        (box.width > 0 || box.height > 0)

      if (bottom !== atBottom) {
        atBottom = bottom
        choose()
      }
    }

    const onScroll = () => {
      if (frame === 0) {
        frame = win.requestAnimationFrame(reachBottom)
      }
    }

    // The window gets another size, or the text does: the line moves with the bar. A phone
    // that hides its address bar sends this too, without moving the line.
    const onResize = () => {
      const next = targets.map(({ target }) => lineOf(win, target))

      if (next.some((value, index) => value !== lines[index])) {
        lines = next
        observe()
      }
    }

    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element).closest('a')
      const index = targets.findIndex((item) => item.link === link)

      if (
        index >= 0 &&
        !event.defaultPrevented &&
        event.button === 0 &&
        !(event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
      ) {
        pinned = index
        choose()
      }
    }

    // The visitor takes over the scrolling: what the bar shows follows the page again.
    const onTake = () => {
      if (pinned >= 0) {
        pinned = -1
        choose()
      }
    }

    const onTouch = (event: TouchEvent) => {
      touching = event.type === 'touchstart'

      if (!touching && pending) {
        scrollToCurrent()
      }
    }

    const onFocusOut = () => {
      // The focus has not moved yet while focusout is sent.
      win.setTimeout(() => {
        if (pending) {
          scrollToCurrent()
        }
      }, 0)
    }

    observe()
    onScroll()
    row.addEventListener('click', onClick)
    row.addEventListener('touchstart', onTouch, { passive: true })
    row.addEventListener('touchend', onTouch, { passive: true })
    row.addEventListener('touchcancel', onTouch, { passive: true })
    row.addEventListener('focusout', onFocusOut)
    win.addEventListener('scroll', onScroll, { passive: true })
    win.addEventListener('resize', onResize)

    for (const type of ['wheel', 'touchstart', 'keydown'] as const) {
      win.addEventListener(type, onTake, { passive: true })
    }

    return () => {
      for (const observer of observers) {
        observer.disconnect()
      }

      win.cancelAnimationFrame(frame)
      row.removeEventListener('click', onClick)
      row.removeEventListener('touchstart', onTouch)
      row.removeEventListener('touchend', onTouch)
      row.removeEventListener('touchcancel', onTouch)
      row.removeEventListener('focusout', onFocusOut)
      win.removeEventListener('scroll', onScroll)
      win.removeEventListener('resize', onResize)

      for (const type of ['wheel', 'touchstart', 'keydown'] as const) {
        win.removeEventListener(type, onTake)
      }

      targets[current]?.link.removeAttribute('aria-current')
    }
  }

  // The bar comes and goes with the width: from the width of two columns it is gone, and so
  // is every listener.
  const follow = () => {
    stop()
    stop = bar.matches ? start() : () => undefined
  }

  follow()
  bar.addEventListener('change', follow)

  return () => {
    bar.removeEventListener('change', follow)
    stop()
  }
}
