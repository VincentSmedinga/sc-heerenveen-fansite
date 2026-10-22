import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'
import { Text } from '../text/Text'

export type NewsItemProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A news line has no children: everything it shows comes from the props below. */
  children?: never
  /** The full time of publication, in the format of the `datetime` attribute, such as `2026-10-21T12:05:00Z`. */
  dateTime: string
  /** The headline, as the source published it. */
  headline: string
  /** Where the item is at the source. The link opens in the same tab. */
  href: string
  /** Whether the item is behind the paywall of the source. The component then says so in text. */
  paywalled?: boolean
  /** The name of the source, as it wants to be credited. */
  source: string
  /** The time as a visitor reads it, such as `14:05`. */
  time: string
}

// Between the parts of the line. It is only for the eye: a screen reader reads the parts one after the other.
const separator = <span aria-hidden="true"> · </span>

/**
 * A line of news from another source: the headline as a link to the item at the source, and under it the name of the
 * source, the time and, if the item is behind a paywall, "voor abonnees". There is no intro and no image: we only show
 * those with the permission of the source (editorial principles 1 and 2). news-item.css gives it its look.
 */
export const NewsItem = ({ className, dateTime, headline, href, paywalled, source, time, ...props }: NewsItemProps) => (
  <div {...props} className={classNames('hf-news-item', className)}>
    <Link className="hf-headline hf-news-item-headline" href={href}>
      {headline}
    </Link>
    <Text appearance="meta" className="hf-news-item-meta">
      <span>{source}</span>
      {separator}
      <time dateTime={dateTime}>{time}</time>
      {paywalled && (
        <>
          {separator}
          <span>voor abonnees</span>
        </>
      )}
    </Text>
  </div>
)
