import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

import { classNames } from '../classNames'

export type OutcomeBarProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The matches that ended in a draw. */
  draws: number
  /** The matches that were lost. */
  losses: number
  /** The matches that were won. */
  wins: number
}

/**
 * A bar in three parts, as long as the number of wins, draws and losses, in the colours of the
 * results of a match. It is decoration (`aria-hidden`): a colour is never the only sign, so the
 * page says the three numbers in a sentence next to it. A part with nothing in it is left out.
 * outcome-bar.css gives the look.
 */
export const OutcomeBar = ({ className, draws, losses, wins, ...props }: OutcomeBarProps) => (
  <div {...props} aria-hidden="true" className={classNames('hf-outcome-bar', className)}>
    {(
      [
        ['positive', wins],
        ['neutral', draws],
        ['negative', losses],
      ] as const
    )
      .filter(([, count]) => count > 0)
      .map(([tone, count]) => (
        <span
          className={classNames('hf-outcome-bar-part', `hf-chart-tone-${tone}`)}
          key={tone}
          style={{ '--hf-outcome-bar-count': count } as CSSProperties}
        />
      ))}
  </div>
)
