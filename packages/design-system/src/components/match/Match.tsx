import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Text } from '../text/Text'
import { Time } from '../time/Time'

/** The name of our own club, which a match always has on one side. */
const ourClub = 'sc Heerenveen'

/** Where a match stands: still to be played, played, or called off without a new date. */
export const matchStatuses = ['scheduled', 'played', 'postponed'] as const

export type MatchProps =
  | (MatchBaseProps & {
      dateTime?: never
      extraTime?: never
      goalsAgainst?: never
      goalsFor?: never
      penaltiesAgainst?: never
      penaltiesFor?: never
      status: 'postponed'
      time?: never
    })
  | (MatchShootOut &
      MatchWithTimeProps & {
        /**
         * Whether the match went to extra time, which only a cup match does. The score is the
         * one after extra time, and the shoot-out, if there was one, is not in it.
         */
        extraTime?: boolean
        /** The goals of the opponent. Only a played match has them, and then it has both. */
        goalsAgainst: number
        /** The goals of sc Heerenveen. */
        goalsFor: number
        status: 'played'
      })
  | (MatchWithTimeProps & {
      extraTime?: never
      goalsAgainst?: never
      goalsFor?: never
      penaltiesAgainst?: never
      penaltiesFor?: never
      status: 'scheduled'
    })

export type MatchStatus = (typeof matchStatuses)[number]

type MatchBaseProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** A match has no children: everything it shows comes from the props below. */
  children?: never
  /** The competition as a visitor knows it, such as `Eredivisie` or `KNVB Beker`. */
  competition: string
  /** Whether sc Heerenveen plays at home. The home club is named first. */
  home: boolean
  /** The club sc Heerenveen plays, as plain text. */
  opponent: string
  /** The round as the source has it, such as `Speelronde 12` or `Tweede ronde`. */
  round: string
  /** The stadium, as plain text. Without it the line only says whether the match is at home. */
  stadium?: null | string | undefined
}

/** The shoot-out of a cup match that was level after extra time: both scores, or none. */
type MatchShootOut =
  | {
      /** The penalties scored by the opponent. */
      penaltiesAgainst: number
      /** The penalties scored by sc Heerenveen. */
      penaltiesFor: number
    }
  | { penaltiesAgainst?: never; penaltiesFor?: never }

type MatchWithTimeProps = MatchBaseProps & {
  /**
   * The day or the moment in a form a machine reads, such as `2026-11-01T13:30:00Z` for a
   * kick-off or `2027-02-12` for a day. For a weekend whose time is not known yet, it is the
   * first day.
   */
  dateTime: string
  /**
   * The time as a visitor reads it, in Dutch time: `zo 1 nov 14:30` for a kick-off, `zo 25 okt`
   * for a day, or `weekend 12–14 februari` while the time is not known yet. The component
   * writes it as given and knows no time zone.
   */
  time: string
}

/** How a played match went for sc Heerenveen, whichever side it played on. */
const outcomeOf = (goalsFor: number, goalsAgainst: number) =>
  goalsFor > goalsAgainst ? 'win' : goalsFor < goalsAgainst ? 'loss' : 'draw'

/** The two numbers of a result from the home club's side, such as `2–0`, with this dash. */
const sides = (home: boolean, ours: number, theirs: number, dash: string) =>
  home ? `${ours}${dash}${theirs}` : `${theirs}${dash}${ours}`

// Between the parts of a line. The dot is only for the eye and is hidden from a screen reader.
// The spaces stay outside the hidden span, so the parts don't run together in the accessibility
// tree.
const separator = (
  <>
    {' '}
    <span aria-hidden="true">·</span>{' '}
  </>
)

/**
 * A match of sc Heerenveen 1 as a line in a list: the competition and the round, the two clubs
 * with the result between them, and under that when and where. It is plain text: a match has no
 * page of its own, so there is no link, and no club badge, only the names. match.css gives it
 * its look, and draws the lines between the lines of a List.
 *
 * The two clubs are in the order they are announced, the home club first, and the line also
 * says "Thuis" or "Uit", so a visitor does not have to work it out. A played match has the
 * result between the names, as "2–0" seen from the home club's side, and a screen reader hears
 * "2 tegen 0". After extra time the result says "n.v." and after a shoot-out "n.s." with its
 * score, as "(4–2 n.s.)" in the order of the clubs; a screen reader hears the full words after
 * the result, as "1 tegen 1, na strafschoppen 4 tegen 2". The result has the colour of the
 * outcome for sc Heerenveen: green for a win, red for a loss and neutral for a draw, whichever
 * side it played on, and in a shoot-out the colour follows the shoot-out. The goals say the
 * same, so a screen reader hears nothing extra. A match that is still to be played has a dash
 * between the names, which is read as "tegen".
 * A postponed match says "Uitgesteld" where the time would be.
 */
export const Match = ({
  className,
  competition,
  dateTime,
  extraTime,
  goalsAgainst,
  goalsFor,
  home,
  opponent,
  penaltiesAgainst,
  penaltiesFor,
  round,
  stadium,
  status,
  time,
  ...props
}: MatchProps) => {
  const [first, second] = home ? [ourClub, opponent] : [opponent, ourClub]
  const shootOut = penaltiesFor !== undefined && penaltiesAgainst !== undefined
  // A shoot-out decides a level score, so the colour follows it; a level one has no winner.
  const outcome =
    status !== 'played'
      ? undefined
      : shootOut
        ? outcomeOf(penaltiesFor, penaltiesAgainst)
        : outcomeOf(goalsFor, goalsAgainst)
  const score =
    status === 'played'
      ? {
          hidden: [
            sides(home, goalsFor, goalsAgainst, ' tegen '),
            shootOut
              ? `na strafschoppen ${sides(home, penaltiesFor, penaltiesAgainst, ' tegen ')}`
              : extraTime
                ? 'na verlenging'
                : undefined,
          ]
            .filter((part) => part !== undefined)
            .join(', '),
          shown: sides(home, goalsFor, goalsAgainst, '–'),
        }
      : { hidden: 'tegen', shown: '–' }

  return (
    <div {...props} className={classNames('hf-match', className)}>
      <Text appearance="meta" className="hf-match-label">
        {competition}
        {separator}
        {round}
      </Text>
      <p className="hf-match-clubs">
        <span className={first === ourClub ? 'hf-match-own' : undefined}>{first}</span>{' '}
        <span className={classNames('hf-match-score', outcome ? `hf-match-${outcome}` : 'hf-match-versus')}>
          <span aria-hidden="true">
            {score.shown}
            {shootOut ? (
              <span className="hf-match-extra">
                {' '}
                ({sides(home, penaltiesFor, penaltiesAgainst, '–')} <abbr title="Na strafschoppen">n.s.</abbr>)
              </span>
            ) : extraTime ? (
              <span className="hf-match-extra">
                {' '}
                <abbr title="Na verlenging">n.v.</abbr>
              </span>
            ) : null}
          </span>
          <span className="hf-visually-hidden">{score.hidden}</span>
        </span>{' '}
        <span className={second === ourClub ? 'hf-match-own' : undefined}>{second}</span>
      </p>
      <Text appearance="meta" className="hf-match-when">
        {status === 'postponed' ? (
          <span className="hf-match-postponed">Uitgesteld</span>
        ) : (
          <Time dateTime={dateTime}>{time}</Time>
        )}
        {separator}
        <span>{home ? 'Thuis' : 'Uit'}</span>
        {stadium ? (
          <>
            {separator}
            <span>{stadium}</span>
          </>
        ) : null}
      </Text>
    </div>
  )
}
