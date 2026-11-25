import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** One row of the list: the player who was best of one match. */
export type WinnerListItem = {
  /** The average grade, written the Dutch way, such as `7,8`. */
  average: string
  /** One small line under the name, such as `Thuis tegen Sparta Rotterdam, 3–1`. */
  line: string
  /** The name of the player. */
  name: string
}

export type WinnerListProps = Omit<ComponentPropsWithoutRef<'ul'>, 'children'> & {
  items: readonly WinnerListItem[]
}

/**
 * The players who were best of their match, one row each, for a side card such as
 * "Eerdere winnaars": the name large with the match in small letters under it, and the
 * average on the right. A screen reader hears "gemiddeld cijfer" before the average.
 */
export function WinnerList({ className, items, ...props }: WinnerListProps) {
  return (
    <ul className={classNames('hf-winner-list', className)} {...props}>
      {items.map((item) => (
        <li className="hf-winner-list-item" key={`${item.name}-${item.line}`}>
          <span className="hf-winner-list-text">
            <span className="hf-winner-list-name">{item.name}</span>
            <span className="hf-meta hf-winner-list-line">{item.line}</span>
          </span>
          <span className="hf-winner-list-average">
            <span className="hf-visually-hidden">Gemiddeld cijfer </span>
            {item.average}
          </span>
        </li>
      ))}
    </ul>
  )
}
WinnerList.displayName = 'WinnerList'
