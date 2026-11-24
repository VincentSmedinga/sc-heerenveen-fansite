import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'

/** One row of the list: a game that is open now, with one sentence and a link to it. */
export type OpenGameListItem = {
  /** The address of the page of the game. */
  href: string
  /** The words of the link, such as `Voorspel`. */
  link: string
  /**
   * The name of the link when the words alone don't say where it goes, such as `Voorspel sc
   * Heerenveen – FC Twente`. It starts with `link`.
   */
  linkName?: string | undefined
  /** The name of the game, such as `Prognose`. */
  name: string
  /** One sentence on what can be done now. */
  sentence: string
}

export type OpenGameListProps = Omit<ComponentPropsWithoutRef<'ul'>, 'children'> & {
  items: readonly OpenGameListItem[]
}

/**
 * The games that are open now, for a card such as Fans on the home page: a row for each game
 * with its name and a dash, one sentence under it, and the link to the game at the end of the
 * row. The sentence wraps under the name, and the link stays beside it.
 */
export function OpenGameList({ className, items, ...props }: OpenGameListProps) {
  return (
    <ul className={classNames('hf-open-game-list', className)} {...props}>
      {items.map((item) => (
        <li className="hf-open-game-list-item" key={item.href}>
          <span className="hf-open-game-list-text">
            <b>{item.name}</b>
            <span aria-hidden="true"> —</span>{' '}
            <span className="hf-meta hf-open-game-list-sentence">{item.sentence}</span>
          </span>
          <Link aria-label={item.linkName} href={item.href}>
            {item.link}
          </Link>
        </li>
      ))}
    </ul>
  )
}
OpenGameList.displayName = 'OpenGameList'
