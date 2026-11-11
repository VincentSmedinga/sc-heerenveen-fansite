import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type PlaceCellProps = Omit<ComponentPropsWithoutRef<'td'>, 'children'> & {
  /** The place in the ranking, from 1. */
  position: number
  /**
   * Whether the row shares its place with the row above it: the cell then shows a vertical
   * ellipsis (⋮) in place of the number, and a screen reader hears "gedeeld 4" and never the
   * sign. The first row of a place shows the number.
   */
  shared?: boolean
}

/**
 * Which rows of a ranking share their place with the row above them, from the places of the
 * rows in order: the second and later rows with the same place as the row before them are
 * `true`. The first row is never shared, so a list that carries on in a second table or card
 * starts with a number, and `4, 4, 4, 8` becomes `false, true, true, false`. A table gives the
 * result to `PlaceCell`.
 */
export const sharedPlaces = (positions: readonly number[]): boolean[] =>
  positions.map((position, index) => index > 0 && position === positions[index - 1])

/**
 * The cell with the place of a row in a ranking, in the column before the row header: the
 * number, or a vertical ellipsis (⋮) when the row shares the place of the row above it, so
 * `4, ⋮, ⋮, ⋮, 8` shows at a glance who shares a place. The ellipsis is for the eye; a screen
 * reader hears "gedeeld 4" in its place. Every ranking in the design system shows its places
 * with this cell (the standings, the top scorers and a DataTable with places), so a shared
 * place looks the same everywhere. The ellipsis of a gap row in a DataTable, for a spell away,
 * is another sign for another thing: it stands in the row header, never in this column.
 * It is in the column of the places: the same width and alignment, in light and dark.
 */
export const PlaceCell = ({ className, position, shared = false, ...props }: PlaceCellProps) => (
  <td {...props} className={classNames('hf-numeric', 'hf-rank', shared && 'hf-rank-shared', className)}>
    {shared ? (
      <>
        <span aria-hidden="true">⋮</span>
        <span className="hf-visually-hidden">gedeeld {position}</span>
      </>
    ) : (
      position
    )}
  </td>
)
