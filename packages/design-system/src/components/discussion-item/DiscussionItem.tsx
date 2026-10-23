import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'
import { Text } from '../text/Text'

export type DiscussionItemProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A discussion line has no children: everything it shows comes from the props below. */
  children?: never
  /** The full time of the last post, in the format of the `datetime` attribute, such as `2026-10-23T11:28:21Z`. */
  dateTime: string
  /** Where the discussion is on the forum. The link opens in the same tab. */
  href: string
  /** The screen name of whoever wrote the last post, as plain text. Without it the line only gives the time. */
  lastPostedBy?: null | string | undefined
  /** The number of replies, without the opening post. The component writes "1 reactie" or "83 reacties". */
  replies: number
  /** The time as a visitor reads it, such as `13:28` or `wo 14:05`. */
  time: string
  /** The title of the discussion, as the forum has it. */
  title: string
}

const countFormat = new Intl.NumberFormat('nl-NL')

// Between the parts of the line. The dot is only for the eye and is hidden from a screen reader. The spaces stay outside the
// hidden span, so the parts don't run together in the accessibility tree.
const separator = (
  <>
    {' '}
    <span aria-hidden="true">·</span>{' '}
  </>
)

/**
 * A line of the discussions of our own forum. The title is a link to the discussion, and under it the number of replies,
 * who wrote the last post and when, as in "83 reacties · laatst Buffon1, 13:28". The name is plain text: no link and no
 * avatar. There is no text of a post and no image. discussion-item.css gives it its look, and draws the lines between the
 * lines of a List.
 */
export const DiscussionItem = ({
  className,
  dateTime,
  href,
  lastPostedBy,
  replies,
  time,
  title,
  ...props
}: DiscussionItemProps) => (
  <div {...props} className={classNames('hf-discussion-item', className)}>
    <Link className="hf-headline hf-discussion-item-title" href={href}>
      {title}
    </Link>
    <Text appearance="meta" className="hf-discussion-item-meta">
      <span>{replies === 1 ? '1 reactie' : `${countFormat.format(replies)} reacties`}</span>
      {separator}
      <span>laatst{lastPostedBy ? ` ${lastPostedBy},` : ''}</span> <time dateTime={dateTime}>{time}</time>
    </Text>
  </div>
)
