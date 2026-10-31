import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type ShortFactProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * What the line says: a number, a sentence or names, such as `1 van de 17 doelpunten`. It
   * is in the stronger weight, and a `PlayerName` in it keeps its own weights.
   */
  children: React.ReactNode
  /**
   * Whether the line says that there is nothing to show, such as `Nog geen`. It then has
   * the normal weight and the quiet colour, so it does not look like a fact.
   */
  empty?: boolean
}

/**
 * A fact as a short line in a list, with a name above it in the same item, as the extremes of
 * the season have a name above their match: "Strafschoppen" as a quiet `Text`, then "1 van de
 * 17 doelpunten". It is the short line of `ShortMatch` for a value that is not a match, and it
 * has the look of it: short-match.css draws the thin lines between the lines of a List, the
 * wrapping and the colours. The name comes first in the item, so a screen reader reads it
 * first and the two stay together.
 */
export const ShortFact = ({ children, className, empty = false, ...props }: ShortFactProps) => (
  <div {...props} className={classNames('hf-short-match', 'hf-short-fact', className)}>
    <span className={empty ? 'hf-short-match-where' : 'hf-short-match-opponent'}>{children}</span>
  </div>
)
