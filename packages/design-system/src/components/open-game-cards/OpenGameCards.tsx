import { type ComponentPropsWithoutRef, useId } from 'react'

import { CardLink } from '../card-link/CardLink'
import { Card, type CardGame } from '../card/Card'
import { classNames } from '../classNames'
import { Heading } from '../heading/Heading'
import { Tag } from '../tag/Tag'
import { Text } from '../text/Text'

/** One game that is open now. */
export type OpenGameCardItem = {
  /** The game, which gives the card its watermark. */
  game: CardGame
  /** Where the game is. */
  href: string
  /** What the link says, short: "Voorspel". */
  link: string
  /** The name of the link, which starts with `link` and says what it is about. */
  linkName: string
  /** The name of the game, the heading of its card. */
  name: string
  /** Until when it is open: "Open tot za 16.45". */
  tag: string
}

export type OpenGameCardsProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  items: readonly OpenGameCardItem[]
}

/**
 * A small card for each game that is open now, two beside each other, also on a phone and in a
 * narrow column. Each card is on the soft surface with the watermark of its game, and has the
 * name as an h2, a green tag with the moment it closes and a short link. The name gets smaller
 * in a narrow card, so no word breaks in two. Without a game there is nothing.
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
        <Card
          aria-labelledby={`${id}-${item.game}`}
          className="hf-open-game-card"
          game={item.game}
          key={item.game}
          surface="soft"
        >
          <Heading id={`${id}-${item.game}`} level={2}>
            {item.name}
          </Heading>
          <Text>
            <Tag tone="open">{item.tag}</Tag>
          </Text>
          <CardLink aria-label={item.linkName} href={item.href}>
            {item.link}
          </CardLink>
        </Card>
      ))}
    </div>
  )
}

OpenGameCards.displayName = 'OpenGameCards'
