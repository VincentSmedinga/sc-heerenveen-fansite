import { type ComponentPropsWithoutRef, type ReactNode, useId } from 'react'

import { classNames } from '../classNames'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'

export type OnThisDayMatch = {
  /** The clubs in the order they were announced, such as `FC Testdorp – sc Heerenveen`. */
  clubs: string
  /** The result as written, such as `1–3`. */
  score: string
  /** The year, such as `2023`. */
  year: string
}

export type OnThisDayProps = Omit<ComponentPropsWithoutRef<'section'>, 'children' | 'title'> & {
  /** The link under the matches, such as `Alle wedstrijden in november`. */
  children?: ReactNode
  /** One line under the heading: how many matches there are, and where they were played. */
  intro: string
  /** The matches, the newest first. */
  matches: readonly OnThisDayMatch[]
  /** The heading, such as `Op deze dag: 11 november`. */
  title: string
}

/**
 * The matches that were played on the date of today in earlier years, in a warm card: the
 * year, the clubs and the result of each, and a link to more. Leave the card out on a day
 * without matches.
 */
export const OnThisDay = ({ children, className, intro, matches, title, ...props }: OnThisDayProps) => {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className={classNames('hf-card hf-card-warm hf-on-this-day', className)}
      {...props}
    >
      <Heading id={headingId} level={2}>
        {title}
      </Heading>
      <p className="hf-on-this-day-intro">{intro}</p>
      <List className="hf-on-this-day-list" plain role="list">
        {matches.map((match) => (
          <List.Item className="hf-on-this-day-match" key={`${match.year}|${match.clubs}`}>
            <span className="hf-on-this-day-year">{match.year}</span>
            <span className="hf-on-this-day-clubs">{match.clubs}</span>
            <span className="hf-on-this-day-score">{match.score}</span>
          </List.Item>
        ))}
      </List>
      {children === undefined ? null : <p className="hf-on-this-day-more">{children}</p>}
    </section>
  )
}
