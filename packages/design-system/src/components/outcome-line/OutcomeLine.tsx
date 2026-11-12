import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { OutcomeBar } from '../outcome-bar/OutcomeBar'

export type OutcomeLineProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The text, such as `9 gewonnen · 15 gelijk · 52 verloren`. It carries the meaning. */
  children: string
  draws: number
  losses: number
  wins: number
}

/**
 * One line with the results: a thin bar in the colours of the outcomes, and the text. The
 * bar is decoration and hidden from a screen reader; the text says the same.
 */
export const OutcomeLine = ({ children, className, draws, losses, wins, ...props }: OutcomeLineProps) => (
  <div {...props} className={classNames('hf-outcome-line', className)}>
    <OutcomeBar className="hf-outcome-line-bar" draws={draws} losses={losses} wins={wins} />
    <span>{children}</span>
  </div>
)
