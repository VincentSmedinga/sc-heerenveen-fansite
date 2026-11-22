import type { ReactNode } from 'react'

import { Heading, type HeadingLevel } from '../heading/Heading'
import { Text } from '../text/Text'

export type GameHeadingProps = {
  /** The name of the game, such as `Prognose`. */
  children: ReactNode
  /** The `id` of the heading, for the `aria-labelledby` of the card. */
  id: string
  /** The level of the heading. */
  level: Exclude<HeadingLevel, 1>
  /** What comes next to the name, such as `Van de fans`. */
  meta: string
}

/**
 * The head of the card of a game: the name as the heading, and next to it, small, whose figures
 * the card shows. On a narrow card the small text wraps under the name. Use it for the card of
 * a game on a page that is not the page of the game itself, such as the page of a match.
 * game-heading.css gives the look.
 */
export const GameHeading = ({ children, id, level, meta }: GameHeadingProps) => (
  <div className="hf-game-heading">
    <Heading id={id} level={level}>
      {children}
    </Heading>
    <Text appearance="meta">{meta}</Text>
  </div>
)
