import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { Tag } from '../tag/Tag'

/** A moment of a season: a link to a match, and a line below it. */
export type CareerMoment = {
  /** Where the match is. */
  href: string
  /** The line below the link, such as `10 april 2004 · hattrick in zeven minuten`. */
  note: string
  /** The name of the match, such as `Testclub – Testteam`. It is the text of the link. */
  title: string
}

/** One period at the club, with the seasons in it, the newest first. */
export type CareerPeriod = {
  /**
   * The line for the gap between this period and the one below it, the older one, such as
   * `2010/11: niet in de selectie`. The page writes it. Leave it out for the oldest period.
   */
  gap?: string
  /** The seasons of the period, the newest first. */
  seasons: readonly CareerSeason[]
  /** The years of the period as they are shown, such as `2007–2010`. It is the heading. */
  years: string
}

/** One season of a career. Everything except the season may be left out. */
export type CareerSeason = {
  /** The competitions of the season, such as `Eredivisie en KNVB beker`. */
  competitions?: string
  /** Marks the season that is running now with the label "Dit seizoen". */
  current?: boolean
  /** Where the season is. */
  href: string
  /** A moment worth a link, such as a hat-trick. */
  moment?: CareerMoment
  /** The shirt number, such as `35`. The component writes "rugnummer" before it. */
  number?: string
  /** A short remark, such as `Geen opstellingen van dit seizoen.` */
  remark?: string
  /** The season as it is shown, such as `2007/08`. It is the text of the link. */
  season: string
}

export type CareerTimelineProps = Omit<ComponentPropsWithoutRef<'ol'>, 'children'> & {
  /** The level of the heading of a period (`h2` or `h3`). The seasons are a level below it. */
  level: 2 | 3
  /** The periods, the newest first. */
  periods: readonly CareerPeriod[]
}

/**
 * The career of a player at the club, from period to period and from season to season, with a
 * gap between two periods in a line of its own. Periods and seasons are lists with a heading
 * each, so a screen reader reads the timeline as a list. The line and the rings are decoration
 * that career-timeline.css draws, and a screen reader doesn't see them. An empty part leaves no
 * empty line.
 */
export const CareerTimeline = ({ className, level, periods, ...props }: CareerTimelineProps) => (
  <ol {...props} className={classNames('hf-career', className)}>
    {periods.map(({ gap, seasons, years }) => (
      <li className="hf-career-period" key={years}>
        <Heading appearance={3} level={level}>
          {years}
        </Heading>
        <ol className="hf-career-seasons">
          {seasons.map(({ competitions, current, href, moment, number, remark, season }) => (
            <li className="hf-career-season" key={season}>
              <div className="hf-career-head">
                <Heading className="hf-career-season-heading" level={(level + 1) as 3 | 4}>
                  <Link href={href}>{season}</Link>
                </Heading>
                {number === undefined ? null : <span className="hf-career-number">rugnummer {number}</span>}
                {current ? <Tag tone="highlight">Dit seizoen</Tag> : null}
              </div>
              {competitions === undefined ? null : <p className="hf-career-competitions">{competitions}</p>}
              {moment === undefined ? null : (
                <p className="hf-career-moment">
                  <Link href={moment.href}>{moment.title}</Link>
                  <span className="hf-career-moment-note">{moment.note}</span>
                </p>
              )}
              {remark === undefined ? null : <p className="hf-career-remark">{remark}</p>}
            </li>
          ))}
        </ol>
        {gap === undefined ? null : <p className="hf-career-gap">{gap}</p>}
      </li>
    ))}
  </ol>
)
