import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

import { classNames } from '../classNames'

/**
 * The values as a share of the largest, in percent from 0 to 100, so a bar from zero shows the
 * real proportion. Nobody has a value above zero: no share, so the table has no bars.
 */
export function sharesOf(values: number[]): null | number[] {
  const largest = Math.max(0, ...values)

  return largest === 0
    ? null
    : values.map((value) => Math.round(Math.min(100, Math.max(0, (value / largest) * 100)) * 100) / 100)
}

/**
 * The bar next to a number in a table cell, as long as its share of the largest number. It is
 * decoration: it has no role, name or text and is hidden from a screen reader, which reads the
 * numbers only. bar.css gives the look, and hides it when the place is too narrow.
 */
export const Bar = ({ share }: { share: number }) => (
  <span aria-hidden="true" className="hf-bar" style={{ '--hf-bar-share': share } as CSSProperties} />
)

/**
 * The place of a table with bars that is not one of the tables of the design system, such as
 * a `DataTable` with text whose cells hold a `Bar` (give the table `hf-bar-table`). The bars
 * query the width of this place, so they go where the place is too narrow for them.
 */
export const BarPlace = ({ className, ...props }: ComponentPropsWithoutRef<'div'>) => (
  <div {...props} className={classNames('hf-bar-place', className)} />
)
