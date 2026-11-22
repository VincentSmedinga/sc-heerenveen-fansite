import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from 'react'

import { sharesOf } from '../bar/Bar'
import { classNames } from '../classNames'

export type BarListProps = Omit<ComponentPropsWithoutRef<'ul'>, 'children'> & {
  /** The rows, the first on top: a bar is as long as the share of its number in the largest. */
  rows: readonly BarListRow[]
  /** What follows each number in the text of a row, such as `%`; the bars stay as long. */
  unit?: string
  /** Room for a name in words, such as a country, instead of a season. */
  wide?: boolean
}

/** One row of a bar list: what it is about, as a name or a link, and its number. */
export type BarListRow = {
  /** The name of the row, such as a season. A link is fine: the bar is not part of it. */
  label: ReactNode
  /** The number the bar is as long as, and the number the row shows as text. */
  value: number
  /** The row is only there on a wide screen, so a narrow one gets a shorter list. */
  wideOnly?: boolean
}

/**
 * A list of lying bars, one row per name: the name, the bar and the number after it. The name
 * and the number are the text of the list, and the bar is decoration that a screen reader
 * skips (`aria-hidden`), so a reader gets "2003/04, 19". The bars are as long as their share of
 * the largest number, from the same start, so the rows can be compared. bar-list.css gives the
 * look. The number column is as wide as the longest number, with room for two digits at least.
 */
export const BarList = ({ className, rows, unit = '', wide = false, ...props }: BarListProps) => {
  const shares = sharesOf(rows.map(({ value }) => value))
  // The number column is as wide as the longest number, so four digits (minutes) don't spill.
  const digits = Math.max(0, ...rows.map(({ value }) => String(value).length + unit.length))

  return (
    <ul
      {...props}
      className={classNames('hf-bar-list', wide && 'hf-bar-list-wide', className)}
      role="list"
      style={{ '--hf-bar-list-digits': digits, ...props.style } as CSSProperties}
    >
      {rows.map(({ label, value, wideOnly }, index) => (
        <li className={classNames('hf-bar-list-row', wideOnly && 'hf-bar-list-wide-only')} key={index}>
          <span className="hf-bar-list-label">{label}</span>
          <span aria-hidden="true" className="hf-bar-list-track">
            <span
              className="hf-bar-list-fill hf-chart-tone-plain"
              style={{ '--hf-bar-list-share': shares?.[index] ?? 0 } as CSSProperties}
            />
          </span>
          <span className="hf-bar-list-value">{`${value}${unit}`}</span>
        </li>
      ))}
    </ul>
  )
}
