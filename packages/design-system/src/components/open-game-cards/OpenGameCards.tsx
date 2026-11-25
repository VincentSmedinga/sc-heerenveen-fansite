import { type ComponentPropsWithoutRef, useId } from 'react'

import { CardLink } from '../card-link/CardLink'
import { Card, type CardGame } from '../card/Card'
import { classNames } from '../classNames'
import { Heading } from '../heading/Heading'

/** One game that is open now. */
export type OpenGameCardItem = {
  /** The game, which gives the card its watermark. */
  game: CardGame
  /** Where the game is. */
  href: string
  /** What the link says: "Voorspel de uitslag". */
  link: string
  /** The name of the link, which starts with `link` and says what it is about. */
  linkName: string
  /** The name of the game, the heading of its card. */
  name: string
}

export type OpenGameCardsProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  items: readonly OpenGameCardItem[]
}

/**
 * A card for each game that is open now, below each other. Each card has the watermark and the
 * heading in the colour of its game, the name as an h2 and a link that says what you can do. A
 * card only stands there while its game is open. Without a game there is nothing.
 * open-game-cards.css gives it its look.
 */
export function OpenGameCards({ className, items, ...props }: OpenGameCardsProps) {
  const id = useId()

  if (items.length === 0) {
    return null
  }

  return (
    <div className={classNames('hf-open-game-cards', className)} {...props}>
      {items.map((item) => (
        <Card aria-labelledby={`${id}-${item.game}`} className="hf-open-game-card" game={item.game} key={item.game}>
          <Heading id={`${id}-${item.game}`} level={2}>
            {item.name}
          </Heading>
          <CardLink aria-label={item.linkName} href={item.href}>
            {item.link}
          </CardLink>
        </Card>
      ))}
    </div>
  )
}

OpenGameCards.displayName = 'OpenGameCards'
