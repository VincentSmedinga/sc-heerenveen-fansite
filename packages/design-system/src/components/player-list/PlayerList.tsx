import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'
import { PlayerName } from '../player-name/PlayerName'

/** One player of a PlayerList. */
export type PlayerListItem = {
  /** What we know of his time with us, such as `Verdediger · 2013–2017`. */
  facts?: string | undefined
  /** The page of the player. A player without a page is the name as plain text. */
  href?: string | undefined
  /** Tells the players apart. */
  key: string
  /**
   * The given name with the prefix behind it, such as `Joost van`. Absent for one name. With
   * `order` `given-first` it is the given name alone and the surname has the prefix.
   */
  rest?: string | undefined
  /** The family name, in the stronger weight. */
  surname: string
}

export type PlayerListProps = Omit<ComponentPropsWithoutRef<'ul'>, 'children'> & {
  /**
   * How a name reads. `surname-first` is `Aken, Joost van`, for a list put in order by family
   * name. `given-first` is `Joost van Aken` (`PlayerName`), for a list of results. Defaults to
   * `surname-first`.
   */
  order?: 'given-first' | 'surname-first' | undefined
  /** The players, in the order they are read. */
  players: readonly PlayerListItem[]
}

/**
 * A list of players for a long page: one row for each, with the family name in the stronger
 * weight, a comma and the rest of the name (`Aken, Joost van`), and under it in small, quiet
 * letters what we know of his time with us. The name links to his page when he has one. On a
 * narrow screen the rows stand in one column; on a wide one in two, read from top to bottom.
 * player-list.css gives the look.
 */
export const PlayerList = ({ className, order = 'surname-first', players, ...props }: PlayerListProps) => (
  <ul {...props} className={classNames('hf-player-list', className)} role="list">
    {players.map(({ facts, href, key, rest, surname }) => {
      const name =
        order === 'given-first' ? (
          <PlayerName givenName={rest} surname={surname} />
        ) : (
          <>
            <strong className="hf-player-list-surname">{surname}</strong>
            {rest === undefined || rest === '' ? null : `, ${rest}`}
          </>
        )

      return (
        <li className="hf-player-list-row" key={key}>
          {href === undefined ? name : <Link href={href}>{name}</Link>}
          {facts === undefined || facts === '' ? null : <span className="hf-player-list-facts">{facts}</span>}
        </li>
      )
    })}
  </ul>
)
