/**
 * Safari on an iPhone colours its status bar from the strip fixed to the top of the page (see
 * .hf-page-top-edge in page.css), so the bar stays blue while the page scrolls. That is wanted
 * while the header is at the top, and not once the header has scrolled away: the strip then
 * goes too, and Safari takes the colour of the page again, like it does without the strip.
 * An app on the home screen keeps the strip, because its status bar is see-through and what
 * scrolls under it would show behind the white text (see the decision in docs/beslissingen.md).
 *
 * The strip is taken off with the `hidden` attribute, so refreshTopEdge() in theme.ts, which
 * uses `display`, can't bring it back by itself.
 *
 * Safari also draws what scrolls under its status bar, blurred, and so shows the menu of the
 * header in the bar as the header leaves. Before that, once the header's bottom edge is within
 * the height of the bar, the header gets the attribute `data-scrolled-away`, and page.css makes
 * what is in it see-through. The blue band of the header itself stays until it is gone.
 */

/** How much of the header must be left on the screen for the strip to stay: its own height. */
const stripHeight = '8px'

/** The same for what is in the header: about the height of the status bar of an iPhone. */
const barHeight = '64px'

/** The attribute on the header while its content is off. Keep it the same in page.css. */
const scrolledAway = 'data-scrolled-away'

/** The same check as the pull to refresh uses: is the page an app on the home screen? */
const isApp = (win: Window) =>
  win.matchMedia('(display-mode: standalone)').matches || Reflect.get(win.navigator, 'standalone') === true

/**
 * Hides the strip while the header is off the top of the screen, and what is in the header
 * while it is leaving, and shows them when the header is back. Returns a function that stops
 * watching and shows them again. Does nothing in an app on the home screen, without a strip or
 * a header, or in a browser without IntersectionObserver.
 */
export function watchTopEdge(doc: Document = document): () => void {
  const win = doc.defaultView
  const edge = doc.querySelector<HTMLElement>('.hf-page-top-edge')
  const header = doc.querySelector('.hf-page-header')

  if (win === null || edge === null || header === null || !('IntersectionObserver' in win) || isApp(win)) {
    return () => undefined
  }

  // The header counts as on the screen as long as it reaches below the top margin.
  const watch = (top: string, onChange: (onScreen: boolean) => void) => {
    const observer = new win.IntersectionObserver(
      ([entry]) => {
        if (entry !== undefined) {
          onChange(entry.isIntersecting)
        }
      },
      { rootMargin: `-${top} 0px 0px 0px` },
    )

    observer.observe(header)

    return observer
  }
  const observers = [
    watch(stripHeight, (onScreen) => {
      edge.hidden = !onScreen
    }),
    watch(barHeight, (onScreen) => {
      header.toggleAttribute(scrolledAway, !onScreen)
    }),
  ]

  return () => {
    for (const observer of observers) {
      observer.disconnect()
    }
    edge.hidden = false
    header.removeAttribute(scrolledAway)
  }
}
