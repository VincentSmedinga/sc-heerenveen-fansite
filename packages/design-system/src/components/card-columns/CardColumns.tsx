import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'

export type CardColumnsProps = ComponentPropsWithoutRef<'div'> & {
  /** 2 columns from 28rem (the default), or 3 from 52rem and 2 from 28rem. */
  columns?: 2 | 3
  /** A card that gets the first column to itself, with the other cards beside it. */
  lead?: ReactNode
}

/**
 * Cards in two columns, or three with `columns`, when the place they are in is wide enough,
 * and one under the other when it is not.
 * The order in the code is the order of reading: the first card on the left, the second on
 * the right, the third on the left again, so a keyboard and a screen reader go through the
 * cards in the order they are written.
 * A card that is taller than its neighbour leaves a gap under the neighbour.
 * In a browser that knows grid lanes, every card goes to the shortest column instead, and
 * the gaps are gone.
 * With `lead`, that card is read first and has the first column to itself, so a card that is
 * much longer than the others leaves no gaps between them. The others stand in the one or two
 * columns beside it, and under it in a narrow place.
 * card-columns.css gives it its look.
 */
export const CardColumns = ({ children, className, columns = 2, lead, ...props }: CardColumnsProps) => {
  const grid = <div className="hf-card-columns-grid">{children}</div>

  return (
    <div {...props} className={classNames('hf-card-columns', columns === 3 && 'hf-card-columns-three', className)}>
      {lead ? (
        <div className="hf-card-columns-split">
          {lead}
          {grid}
        </div>
      ) : (
        grid
      )}
    </div>
  )
}
