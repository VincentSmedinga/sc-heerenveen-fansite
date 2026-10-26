import { type ComponentPropsWithoutRef, Fragment } from 'react'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
import { Link } from '../link/Link'
import { Text } from '../text/Text'

export type NewsItemProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A news line has no children: everything it shows comes from the props below. */
  children?: never
  /**
   * The full time of publication, in the format of the `datetime` attribute, such as
   * `2026-10-21T12:05:00Z`.
   */
  dateTime: string
  /**
   * Short facts about the item as text, such as `49 min` or `aflevering 120`, which go after
   * the name of the source, each after a dot. They are facts and no content: a news line has
   * none. The page says what they are in words.
   */
  details?: readonly string[]
  /** The headline, as the source published it. */
  headline: string
  /** Where the item is at the source. The link opens in the same tab. */
  href: string
  /**
   * Whether the item is a page of our own site, such as an article of the editors. The icon for
   * a link to another site is then left out.
   */
  internal?: boolean
  /**
   * Whether the item is behind the paywall of the source. The component then says so in text.
   */
  paywalled?: boolean
  /** The name of the source, as it wants to be credited. */
  source: string
  /**
   * The short day and the time, or the date and the time, as a visitor reads them: `wo 14:05`
   * or `14 okt 14:05`.
   */
  time: string
}

// Between the parts of the line. The dot is only for the eye and is hidden from a screen
// reader. The spaces stay outside the hidden span, so the parts don't run together in the
// accessibility tree.
const separator = (
  <>
    {' '}
    <span aria-hidden="true">·</span>{' '}
  </>
)

/**
 * A line of news from another source. On the left the short day and the time, or the date and
 * the time, in red. The column has one width, so the headlines start in the same place on every
 * line, and a date and a time break onto two lines in it. Next to it the headline as a link to
 * the item at the source, and under it the name of the source with an icon for a link to
 * another site, "voor abonnees" if the item is behind a paywall, and short facts such as the
 * duration of a podcast episode. The headline is not underlined, except under the mouse and
 * with the focus of the keyboard. There is no intro and no image: we only show those with the
 * permission of the source (editorial principles 1 and 2). In a line narrower than 24rem the
 * day and the time are above the headline, chosen with a container query in news-item.css; the
 * order in the HTML is the same. The outer div is the container, and the layout div inside it
 * is the grid. news-item.css gives it its look, and draws the lines between the lines of a
 * List.
 */
export const NewsItem = ({
  className,
  dateTime,
  details,
  headline,
  href,
  internal = false,
  paywalled,
  source,
  time,
  ...props
}: NewsItemProps) => (
  <div {...props} className={classNames('hf-news-item', className)}>
    <div className="hf-news-item-layout">
      <time className="hf-meta hf-news-item-time" dateTime={dateTime}>
        {time}
      </time>
      <div className="hf-news-item-body">
        <Link className="hf-headline hf-news-item-headline" href={href}>
          {headline}
        </Link>
        <Text appearance="meta" className="hf-news-item-meta">
          <span>{source}</span>
          {!internal && <Icon name="external-link" />}
          {paywalled && (
            <>
              {separator}
              <span>voor abonnees</span>
            </>
          )}
          {details?.map((detail) => (
            <Fragment key={detail}>
              {separator}
              <span>{detail}</span>
            </Fragment>
          ))}
        </Text>
      </div>
    </div>
  </div>
)
