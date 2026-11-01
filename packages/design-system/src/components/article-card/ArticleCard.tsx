import type { ComponentPropsWithoutRef } from 'react'

import { useId } from 'react'

import { Card } from '../card/Card'
import { classNames } from '../classNames'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { Text } from '../text/Text'
import { Time } from '../time/Time'

export type ArticleCardProps = Omit<ComponentPropsWithoutRef<'section'>, 'children' | 'title'> & {
  /** A card has no children: everything it shows comes from the props below. */
  children?: never
  /** The date of publication as a visitor reads it, such as `25 oktober 2026`. */
  date: string
  /** The date in the format of the `datetime` attribute, such as `2026-10-25`. */
  dateTime: string
  /** Where the article is. The link opens in the same tab. */
  href: string
  /** The introduction of the article, as the editors wrote it. */
  intro: string
  /**
   * The short form for a narrow column: the title as a link, the date and the introduction,
   * without the link "Lees verder". The long form is for the main column of the homepage.
   */
  short?: boolean
  /** The title of the article. */
  title: string
}

/**
 * The newest article of our own editors, as a card on the homepage: the heading "Van de
 * redactie", under it the title as a link to the article, the date, the introduction and the
 * link "Lees verder". The card is a `section` named by its heading, on the soft surface, so it
 * stands apart from the news under it. The title and "Lees verder"
 * go to the same page; the name of the second link says which article it is for, which starts
 * with its text, so a speech control that says "Lees verder" finds it. article-card.css gives
 * it its look.
 *
 * The short form (`short`) is for a narrow column beside the news: it leaves out "Lees verder",
 * so the title is the one link to the article.
 */
export const ArticleCard = ({
  className,
  date,
  dateTime,
  href,
  intro,
  short = false,
  title,
  ...props
}: ArticleCardProps) => {
  const headingId = useId()

  return (
    <Card aria-labelledby={headingId} surface="soft" {...props} className={classNames('hf-article-card', className)}>
      <Heading id={headingId} level={2}>
        Van de redactie
      </Heading>
      <Heading appearance={3} className="hf-article-card-title" level={3}>
        <Link href={href}>{title}</Link>
      </Heading>
      <Text appearance="meta">
        <Time dateTime={dateTime}>{date}</Time>
      </Text>
      <Text>{intro}</Text>
      {!short && (
        <Text>
          <Link aria-label={`Lees verder over ${title}`} href={href} icon="arrow-right">
            Lees verder
          </Link>
        </Text>
      )}
    </Card>
  )
}
