import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { Time } from '../time/Time'

export type ArticleProps = Omit<ComponentPropsWithoutRef<'article'>, 'title'> & {
  /** The name next to the article, such as "de redactie". The component writes "Door" before
   * it. */
  author: string
  /** The text of the article: paragraphs, headings of level 2, lists and links. */
  children?: React.ReactNode
  /** The date of publication as a visitor reads it, such as `25 oktober 2026`. */
  date: string
  /** The date in the format of the `datetime` attribute, such as `2026-10-25`. */
  dateTime: string
  /** The introduction under the date, in one or two sentences. */
  intro: string
  /** The title of the article. It is the `h1` of the page. */
  title: string
}

// Between the author and the date. The dot is only for the eye and is hidden from a screen
// reader. The spaces stay outside the hidden span, so the parts don't run together in the
// accessibility tree.
const separator = (
  <>
    {' '}
    <span aria-hidden="true">·</span>{' '}
  </>
)

/**
 * An article of our own editors: the title as the `h1` of the page, under it the author and the
 * date, then the introduction, and then the text, which the page passes as children. The text
 * has headings of level 2 at most. Put it in a Page.Main, so the `article` is inside the
 * `main`. article.css gives it its look.
 */
export const Article = ({ author, children, className, date, dateTime, intro, title, ...props }: ArticleProps) => (
  <article {...props} className={classNames('hf-article', className)}>
    <Heading level={1}>{title}</Heading>
    <Text appearance="meta" className="hf-article-meta">
      Door {author}
      {separator}
      <Time dateTime={dateTime}>{date}</Time>
    </Text>
    <Text appearance="intro">{intro}</Text>
    {children}
  </article>
)
