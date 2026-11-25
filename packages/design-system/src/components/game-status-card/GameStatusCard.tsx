import type { ComponentPropsWithoutRef } from 'react'

import { Button } from '../button/Button'
import { CardLink } from '../card-link/CardLink'
import { Card, type CardGame } from '../card/Card'
import { Form } from '../form/Form'
import { Heading } from '../heading/Heading'
import { Tag, type TagProps } from '../tag/Tag'
import { Text } from '../text/Text'

/** The way to the page of the game: a button for what is still to be done, or a link. */
export type GameStatusAction = {
  href: string
  /** What the button or link says, clear on its own: "Voorspellen", "Naar de Prognose". */
  label: string
  type: 'button' | 'link'
}

export type GameStatusCardProps = ComponentPropsWithoutRef<'section'> & {
  action: GameStatusAction
  /** The game, which gives the card its watermark. */
  game: CardGame
  /** The name of the game, the h2 of the card. */
  heading: string
  /** How the game stands, in words and in a tone: "Gesloten" is `closed`. */
  tag: { text: string; tone: NonNullable<TagProps['tone']> }
}

/**
 * A card of one game on the page Fans: the name, a tag that says how the game stands, what is
 * going on (the children) and the way to the page of the game. The button is a form that only
 * goes to the page: the design system has no link as a button.
 */
export function GameStatusCard({ action, children, game, heading, tag, ...props }: GameStatusCardProps) {
  const id = `spel-${game}`

  return (
    <Card aria-labelledby={id} game={game} {...props}>
      <Heading id={id} level={2}>
        {heading}
      </Heading>
      <Text>
        <Tag tone={tag.tone}>{tag.text}</Tag>
      </Text>
      {children}
      {action.type === 'button' ? (
        <Form action={action.href} method="get">
          <Button type="submit">{action.label}</Button>
        </Form>
      ) : (
        <CardLink href={action.href}>{action.label}</CardLink>
      )}
    </Card>
  )
}

GameStatusCard.displayName = 'GameStatusCard'
