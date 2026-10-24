import { type ComponentPropsWithoutRef, Fragment } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'
import { Text } from '../text/Text'

export type NewsItemProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A news line has no children: everything it shows comes from the props below. */
  children?: never
  /** The full time of publication, in the format of the `datetime` attribute, such as `2026-10-21T12:05:00Z`. */
  dateTime: string
  /**
   * Short facts about the item as text, such as `49 min` or `aflevering 120`, which go after the name of the source, each
   * after a dot. They are facts and no content: a news line has none. The page says what they are in words.
   */
  details?: readonly string[]
  /** The headline, as the source published it. */
  headline: string
  /** Where the item is at the source. The link opens in the same tab. */
  href: string
  /** Whether the item is behind the paywall of the source. The component then says so in text. */
  paywalled?: boolean
  /** The name of the source, as it wants to be credited. */
  source: string
  /** The short day and the time, or the date and the time, as a visitor reads them: `wo 14:05` or `14 okt 14:05`. */
  time: string
}

// Between the parts of the line. The dot is only for the eye and is hidden from a screen reader. The spaces stay outside the
// hidden span, so the parts don't run together in the accessibility tree.
const separator = (
  <>
    {' '}
    <span aria-hidden="true">·</span>{' '}
  </>
)

// A square with an arrow out of its corner: the headline goes to another site. It is drawn here, so nothing loads from
// elsewhere, and it takes the colour of the text around it. The link is named by the headline alone, so the icon is hidden.
const externalLinkIcon = (
  <svg
    aria-hidden="true"
    className="hf-news-item-icon"
    fill="none"
    focusable="false"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth="1.5"
    viewBox="0 0 16 16"
  >
    <path d="M9.5 2.5h4v4" />
    <path d="M13.5 2.5 7.5 8.5" />
    <path d="M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />
  </svg>
)

/**
 * A line of news from another source. On the left the short day and the time, or the date and the time, in red. The
 * column has one width, so the headlines start in the same place on every line, and a date and a time break onto two
 * lines in it. Next to it the headline as a link to the item at the source, and under it the name of the source with an
 * icon for a link to another site, "voor abonnees" if the item is behind a paywall, and short facts such as the
 * duration of a podcast episode. The headline is not
 * underlined, except under the mouse and with the focus of the keyboard. There is no intro and no image: we only show
 * those with the permission of the source (editorial principles 1 and 2). In a line narrower than 24rem the day and the
 * time are above the headline, chosen with a container query in news-item.css; the order in the HTML is the same. The
 * outer div is the container, and the layout div inside it is the grid. news-item.css gives it its look, and draws the
 * lines between the lines of a List.
 */
export const NewsItem = ({
  className,
  dateTime,
  details,
  headline,
  href,
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
          {externalLinkIcon}
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
