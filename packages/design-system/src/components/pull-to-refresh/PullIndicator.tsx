import type { CSSProperties } from 'react'

export type PullIndicatorProps = {
  /** How far the pull has come, from 0 to 1. At 1 the page reloads when the finger lets go. */
  progress: number
  /** True once the finger has let go and the page is reloading. */
  refreshing?: boolean
}

/**
 * What the visitor sees while pulling a page down to refresh it: a small label at the top of the screen that says what
 * to do, and what letting go will do. It comes down with the finger, except with less motion: then it stays where it
 * is and appears when letting go will refresh.
 *
 * It is hidden from screen readers (`aria-hidden`). It is a hint for a finger on the screen; a screen reader never
 * sees the gesture, and the page that loads after it is announced by the screen reader itself.
 */
export const PullIndicator = ({ progress, refreshing = false }: PullIndicatorProps) => (
  <div
    aria-hidden="true"
    className="hf-pull-indicator"
    data-ready={progress >= 1 || undefined}
    style={{ '--hf-pull-progress': progress } as CSSProperties}
  >
    {refreshing ? 'Bezig met verversen' : progress >= 1 ? 'Loslaten om te verversen' : 'Trek omlaag om te verversen'}
  </div>
)
