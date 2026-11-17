import type { DataTableCell } from '@fansite/design-system'

/** A figure a table shows as text, such as `1,71`, which sorts as the number `1.71`. */
export const figureCell = (sortValue: number, text: string): DataTableCell => ({ sortValue, text })

/** A score such as `7–5`, which a table sorts as the goal difference. */
export const scoreCell = (goalsFor: number, goalsAgainst: number): DataTableCell => ({
  sortValue: goalsFor - goalsAgainst,
  text: `${goalsFor}–${goalsAgainst}`,
})
