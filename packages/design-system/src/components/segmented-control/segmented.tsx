import { type ReactNode, type RefObject, useLayoutEffect } from 'react'

/**
 * Puts the thumb under the chosen option. The options are as wide as their text, so the thumb
 * cannot be placed from a count and an index: the group measures the chosen option and gives
 * the thumb its place and width as two custom properties, `--hf-segmented-x` and
 * `--hf-segmented-width`, and marks itself with `data-placed`. The stylesheet slides the thumb
 * with a transition, which the motion tokens make instant with reduced motion. Without script,
 * and on a page that was rendered on the server, the chosen option draws the thumb itself, in
 * the same place, so nothing is wrong before the script runs. A value that is none of the
 * options leaves the thumb out.
 */
export const useSegmentedThumb = (group: RefObject<HTMLDivElement | null>, value: string) => {
  useLayoutEffect(() => {
    const element = group.current

    if (!element) {
      return
    }

    const place = () => {
      const chosen = element.querySelector<HTMLElement>(':scope > [aria-current], :scope > [aria-pressed="true"]')

      if (!chosen) {
        element.removeAttribute('data-placed')

        return
      }

      element.style.setProperty('--hf-segmented-x', `${chosen.offsetLeft}px`)
      element.style.setProperty('--hf-segmented-width', `${chosen.offsetWidth}px`)
      element.setAttribute('data-placed', '')
    }

    place()

    // The options change width when the font arrives and when the place gets narrower.
    if (typeof ResizeObserver === 'undefined') {
      return
    }

    const observer = new ResizeObserver(place)

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [group, value])
}

/**
 * The text of an option. A second copy of it in bold is laid over the first, invisible and
 * without height, so the option is as wide for its regular text as for its bold text: the
 * chosen option gets heavier letters, and the group must not change its width with the choice.
 */
export const SegmentedLabel = ({ children, text }: { children: ReactNode; text: string }) => (
  <span className="hf-segmented-label" data-label={text}>
    {children}
  </span>
)
