import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type ShortFactProps = ComponentPropsWithoutRef<'div'> & {
  /**
   * What the line says, such as a `PlayerName`. It is in the stronger weight, and a
   * `PlayerName` in it keeps its own weights.
   */
  children: React.ReactNode
}

/**
 * A short line in a list for one thing without a period before it, such as a player of the
 * squad. short-line.css draws the wrapping, and row-lines.css the thin lines between the lines
 * of a List. For a name above a value use a stacked `DescriptionList`, so a screen reader
 * hears which value belongs to which name.
 */
export const ShortFact = ({ children, className, ...props }: ShortFactProps) => (
  <div {...props} className={classNames('hf-short-line', 'hf-short-fact', className)}>
    <span className="hf-short-line-main">{children}</span>
  </div>
)
