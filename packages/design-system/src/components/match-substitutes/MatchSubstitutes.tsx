import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'
import { Heading, type HeadingLevel } from '../heading/Heading'
import { MatchEventIcon } from '../match-event-icon/MatchEventIcon'
import { pitchMinute, type PitchPlayerGoal, pitchRingArc } from '../match-pitch/PitchPlayer'
import { PlayerDisc } from '../match-pitch/PlayerDisc'
import { type MatchPlayerName } from '../match-timeline/MatchTimeline'
import { PlayerName } from '../player-name/PlayerName'

/** A substitute who came on, with what he did. */
export type MatchSubstitute = {
  /** His goals after he came on, in the order of the clock. Leave it out for none. */
  goals?: readonly PitchPlayerGoal[] | undefined
  /** The minute he came on. */
  minute: number
  /** The minutes he played. The ring shows them. */
  minutesPlayed: number
  name: MatchPlayerName
  /** The player he replaced. */
  playerOut: MatchPlayerName
  /** His shirt number, or empty for a player without one: the disc then has no figure. */
  shirtNumber: null | number
  /** The minutes of added time after `minute`, as the 2 of 90+2. */
  stoppageMinutes?: number | undefined
}

export type MatchSubstitutesProps = Omit<ComponentPropsWithoutRef<'section'>, 'children'> & {
  /** Whether the match went into extra time: the rings then run to 120 minutes, not 90. */
  extraTime?: boolean | undefined
  /** The level of the heading "Wissels <team>" in the structure of the page. */
  headingLevel: Exclude<HeadingLevel, 1>
  /** Whether the team is sc Heerenveen: the disc is filled for them, open for the others. */
  ours: boolean
  /**
   * The substitutes who came on, in any order: the list puts them in the order of the clock. A
   * player on the bench who did not play is not in the report, so he is not here either.
   */
  substitutes: readonly MatchSubstitute[]
  /** The name of the team. */
  team: string
}

const fullName = (name: MatchPlayerName) =>
  [name.givenName, name.surname].filter((part) => part !== undefined && part !== '').join(' ')

/** The minute with the added time, as `85` or `90+2`, for the sentence. */
const minuteWords = (minute: number, stoppageMinutes?: number | undefined) =>
  stoppageMinutes === undefined || stoppageMinutes === 0 ? `${minute}` : `${minute}+${stoppageMinutes}`

/** A moment as a number to sort on: 45+2 comes after 45 and before 46. */
const clock = (minute: number, stoppageMinutes?: number | undefined) => minute + (stoppageMinutes ?? 0) / 100

/**
 * The sentence a screen reader hears for a substitute, such as "Sven Kuipers, rugnummer 2, erin
 * in minuut 62 voor Lars Dijkstra, doelpunt in minuut 85". Every mark in the line has a word in
 * it, so no mark is the only sign.
 */
export function substituteSentence(substitute: MatchSubstitute): string {
  const parts = [fullName(substitute.name)]

  if (substitute.shirtNumber !== null) {
    parts.push(`rugnummer ${substitute.shirtNumber}`)
  }

  parts.push(
    `erin in minuut ${minuteWords(substitute.minute, substitute.stoppageMinutes)} voor ${fullName(substitute.playerOut)}`,
  )

  for (const goal of substitute.goals ?? []) {
    const word = goal.ownGoal === true ? 'eigen doelpunt' : 'doelpunt'

    parts.push(goal.minute === null ? word : `${word} in minuut ${minuteWords(goal.minute, goal.stoppageMinutes)}`)
  }

  return parts.join(', ')
}

/**
 * The line of a substitute, one link to the page of the player when he has one. The drawing is
 * hidden from a screen reader, so the link is named by the sentence beside it; a link on the
 * name in the drawing would be a link inside what is hidden. The name in it is underlined and
 * in the colour of a link (match-substitutes.css), the rest of the line is not.
 */
const Line = ({ children, href }: { children: ReactNode; href: string | undefined }) =>
  href === undefined ? (
    children
  ) : (
    <a className="hf-match-substitutes-link" href={href}>
      {children}
    </a>
  )

/**
 * The substitutes of one team who came on, under a heading "Wissels <team>". Each has a
 * disc with the shirt number and a ring that starts at the minute he came on (the same as
 * on the pitch, without the quiet track under it), his name, and under that in small
 * letters the icon "erin", the minute, "voor <name>" and, when he scored, the goal and its
 * minute. A team without substitutes says "Geen wissels." The list has a name for a screen
 * reader and one sentence for each line (`substituteSentence`); everything drawn is hidden
 * from it. Put the lists of the two teams in `MatchSubstitutes.Group`, which puts them
 * side by side from 40 rem wide. match-substitutes.css gives it its look.
 */
export const MatchSubstitutes = ({
  className,
  extraTime = false,
  headingLevel,
  ours,
  substitutes,
  team,
  ...props
}: MatchSubstitutesProps) => {
  const ordered = [...substitutes].sort(
    (a, b) => clock(a.minute, a.stoppageMinutes) - clock(b.minute, b.stoppageMinutes),
  )

  return (
    <section {...props} className={classNames('hf-match-substitutes', className)}>
      <Heading appearance={4} level={headingLevel}>
        Wissels {team}
      </Heading>
      {ordered.length === 0 ? (
        <p className="hf-match-substitutes-none">Geen wissels.</p>
      ) : (
        <ul aria-label={`Wissels ${team}`} className="hf-match-substitutes-list" role="list">
          {ordered.map((substitute, index) => (
            <li key={substitute.shirtNumber ?? `no-number-${index}`}>
              <Line href={substitute.name.href}>
                <span className="hf-visually-hidden">{substituteSentence(substitute)}</span>
                <span aria-hidden="true" className="hf-match-substitutes-line">
                  <PlayerDisc
                    arc={pitchRingArc(
                      {
                        minutesFrom: substitute.minute,
                        minutesPlayed: substitute.minutesPlayed,
                        name: substitute.name,
                        shirtNumber: substitute.shirtNumber,
                      },
                      extraTime,
                    )}
                    ours={ours}
                    shirtNumber={substitute.shirtNumber}
                  />
                  <span className="hf-match-substitutes-text">
                    <PlayerName givenName={substitute.name.givenName} surname={substitute.name.surname} />
                    <span className="hf-match-substitutes-detail">
                      <MatchEventIcon kind="in" /> {pitchMinute(substitute.minute, substitute.stoppageMinutes)} voor{' '}
                      {fullName(substitute.playerOut)}
                      {substitute.goals?.map((goal, goalIndex) => (
                        <span key={`${goal.minute ?? 'unknown'}-${goal.stoppageMinutes ?? 0}-${goalIndex}`}>
                          {' '}
                          · <MatchEventIcon kind={goal.ownGoal === true ? 'own-goal' : 'goal'} />{' '}
                          {pitchMinute(goal.minute, goal.stoppageMinutes)}
                        </span>
                      ))}
                    </span>
                  </span>
                </span>
              </Line>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export type MatchSubstitutesGroupProps = ComponentPropsWithoutRef<'div'>

/**
 * The substitutes of the two teams together: side by side from 40 rem wide, and one under the
 * other below that. It only works with `MatchSubstitutes` in it, so it is written as
 * `MatchSubstitutes.Group`.
 */
const Group = ({ children, className, ...props }: MatchSubstitutesGroupProps) => (
  <div {...props} className={classNames('hf-match-substitutes-group', className)}>
    <div className="hf-match-substitutes-columns">{children}</div>
  </div>
)

// The name in React's developer tools and in the code examples in Storybook.
Group.displayName = 'MatchSubstitutes.Group'

MatchSubstitutes.Group = Group
