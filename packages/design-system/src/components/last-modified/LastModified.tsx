import type { ComponentPropsWithoutRef } from 'react'

import { shareMarker } from '../card/shareMarker'
import { Text } from '../text/Text'
import { Time } from '../time/Time'

export type LastModifiedProps = Omit<ComponentPropsWithoutRef<'p'>, 'children'> & {
  /**
   * The moment as a visitor reads it, in Dutch time, such as `wo 14:05` or `wo 21 okt`. The
   * component knows no time zone and no format.
   */
  children: string
  /** The same moment in a form a machine reads, such as `2026-10-21T12:05:00.000Z`. */
  dateTime: string
}

/**
 * The last line of a card with data from an import: "Laatst gewijzigd: wo 14:05". The moment is
 * when the source of the data last changed, not when we read it. It is quiet text (`Text` with
 * `appearance="meta"`) with the moment in a `Time`. The image of the card leaves it out,
 * because the image has the day it was made and the source under it. A card that has no moment
 * shows no line: leave the component out then.
 */
export const LastModified = ({ children, dateTime, ...props }: LastModifiedProps) => (
  <Text appearance="meta" {...props} {...{ [shareMarker]: '' }}>
    Laatst gewijzigd: <Time dateTime={dateTime}>{children}</Time>
  </Text>
)
