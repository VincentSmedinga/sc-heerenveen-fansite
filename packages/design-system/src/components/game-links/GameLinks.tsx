import type { ComponentPropsWithoutRef } from 'react'

import type { CardGame } from '../card/Card'

import { classNames } from '../classNames'
import { attachIcon } from '../icon/attachIcon'
import { Icon, type IconName } from '../icon/Icon'

/** A link to a game that is open for a match. */
export type GameLinkItem = {
  /** The game, which gives the link its icon. The Fantest is about no match, so it has none. */
  game: Exclude<CardGame, 'fantest'>
  /** Where the game is. */
  href: string
  /** The match the link is about, which a screen reader hears after the text. */
  match: string
  /** What the link says. */
  text: string
}

const icons = {
  fjouwer: 'tactics-board',
  prognose: 'crystal-ball',
  uitblinker: 'star',
} as const satisfies Record<GameLinkItem['game'], IconName>

export type GameLinksProps = Omit<ComponentPropsWithoutRef<'ul'>, 'children'> & {
  items: readonly GameLinkItem[]
}

/**
 * The links under a match to the games that are open for it, one on each line. A link starts
 * with the icon of its game and ends with an arrow, both hidden from a screen reader, which
 * hears the text and then the match. It stands after the match and not in it, so it is a link
 * of its own beside the one to the page of the match. game-links.css gives it its look.
 */
export function GameLinks({ className, items, ...props }: GameLinksProps) {
  if (items.length === 0) {
    return null
  }

  return (
    <ul className={classNames('hf-game-links', className)} role="list" {...props}>
      {items.map((item) => (
        <li key={item.game}>
          <a href={item.href}>
            {attachIcon(
              attachIcon(item.text, <Icon name={icons[item.game]} />, 'before'),
              <Icon name="arrow-right" />,
              'after',
            )}{' '}
            <span className="hf-visually-hidden">{item.match}</span>
          </a>
        </li>
      ))}
    </ul>
  )
}

GameLinks.displayName = 'GameLinks'
