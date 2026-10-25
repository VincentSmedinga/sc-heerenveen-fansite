import type { ComponentPropsWithoutRef } from 'react'

import { useId } from 'react'

import { Card } from '../card/Card'
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
  /** The title of the article. */
  title: string
}

/**
 * The newest article of our own editors, as a card on the homepage: the heading "Van de
 * redactie", under it the title as a link to the article, the date, the introduction and the
 * link "Lees verder". The card is a `section` named by its heading. The title and "Lees verder"
 * go to the same page; the name of the second link says which article it is for, which starts
 * with its text, so a speech control that says "Lees verder" finds it. article-card.css gives
 * it its look.
 */
export const ArticleCard = ({ date, dateTime, href, intro, title, ...props }: ArticleCardProps) => {
  const headingId = useId()

  return (
    <Card aria-labelledby={headingId} {...props}>
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
      <Text>
        <Link aria-label={`Lees verder over ${title}`} href={href} icon="arrow-right">
          Lees verder
        </Link>
      </Text>
    </Card>
  )
}
