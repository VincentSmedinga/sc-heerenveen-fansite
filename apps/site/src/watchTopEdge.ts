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
 */

/** How much of the header must be left on the screen for the strip to stay: its own height. */
const stripHeight = '8px'

/** The same check as the pull to refresh uses: is the page an app on the home screen? */
const isApp = (win: Window) =>
  win.matchMedia('(display-mode: standalone)').matches || Reflect.get(win.navigator, 'standalone') === true

/**
 * Hides the strip while the header is off the top of the screen and shows it when the header is
 * back. Returns a function that stops watching and shows the strip again. Does nothing in an
 * app on the home screen, without a strip or a header, or in a browser without
 * IntersectionObserver.
 */
export function watchTopEdge(doc: Document = document): () => void {
  const win = doc.defaultView
  const edge = doc.querySelector<HTMLElement>('.hf-page-top-edge')
  const header = doc.querySelector('.hf-page-header')

  if (win === null || edge === null || header === null || !('IntersectionObserver' in win) || isApp(win)) {
    return () => undefined
  }

  const observer = new win.IntersectionObserver(
    ([entry]) => {
      if (entry !== undefined) {
        edge.hidden = !entry.isIntersecting
      }
    },
    // The header counts as on the screen as long as it reaches below the strip.
    { rootMargin: `-${stripHeight} 0px 0px 0px` },
  )

  observer.observe(header)

  return () => {
    observer.disconnect()
    edge.hidden = false
  }
}
