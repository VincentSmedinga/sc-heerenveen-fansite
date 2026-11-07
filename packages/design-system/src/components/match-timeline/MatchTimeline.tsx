import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Heading, type HeadingLevel } from '../heading/Heading'
import { MatchEventIcon, type MatchEventIconKind } from '../match-event-icon/MatchEventIcon'
import { PlayerName } from '../player-name/PlayerName'
import { halfOf, type MatchHalf, matchHalves } from './halves'

/** A name as `PlayerName` shows it: the given name, and the surname in the stronger weight. */
export type MatchPlayerName = {
  /** The given name. Leave it out for a player known by one name. */
  givenName?: string | undefined
  /** The surname. Empty for a name that cannot be split: it is then in `givenName`. */
  surname: string
}

/** The moment of an event and the team it belongs to, which every event has. */
type MatchEventBase = {
  /** The minute on the clock: 45 for "45+2". */
  minute: number
  /** Whether the event is of sc Heerenveen. Otherwise it is of the opponent. */
  ours: boolean
  /** The minutes of added time after `minute`: 2 for "45+2". Leave it out in regular time. */
  stoppageMinutes?: null | number | undefined
  /** The name of the team, written out, such as `sc Heerenveen` or `Testdorp FC`. */
  team: string
}

/** The kinds of event that only name one player. */
export const matchPlayerEventKinds = [
  'yellow-card',
  'yellow-red-card',
  'red-card',
  'penalty-missed',
  'penalty-saved',
] as const

export type MatchPlayerEventKind = (typeof matchPlayerEventKinds)[number]

export type MatchTimelineEvent =
  | (MatchEventBase & {
      /** The player who gave the assist. Not for a penalty or an own goal. */
      assist?: MatchPlayerName | undefined
      kind: 'goal'
      /**
       * Whether it is an own goal. The team and `ours` are the one of the player who scored it,
       * so the line says whose player made it.
       */
      ownGoal?: boolean | undefined
      /** Whether it was scored from the penalty spot. */
      penalty?: boolean | undefined
      /** The player who scored. */
      player: MatchPlayerName
    })
  | (MatchEventBase & {
      kind: 'substitution'
      /** The player who comes on. */
      playerIn: MatchPlayerName
      /** The player who goes off. */
      playerOut: MatchPlayerName
    })
  | (MatchEventBase & { kind: MatchPlayerEventKind; player: MatchPlayerName })

export type MatchTimelineProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /**
   * The events in the order of the clock, goals, substitutions, cards and missed penalties
   * together. The component puts them in the block they belong to.
   */
  events: MatchTimelineEvent[]
  /**
   * Whether the match went into extra time. The events after minute 90 then stand in a third
   * block, "Verlenging". Without it they stay in the second half.
   */
  extraTime?: boolean | undefined
  /**
   * The level of the headings of the blocks in the structure of the page. The default is 3,
   * for a page where the course of the match has a heading of level 2.
   */
  headingLevel?: Exclude<HeadingLevel, 1> | undefined
}

/**
 * What an event is called for a screen reader, which hears it before the name of the player.
 * The eye gets the icon instead, and a word beside an icon that says the same would be said
 * twice. A missed or a stopped penalty has the same icon, so those two keep their word.
 */
const kindNames: Record<Exclude<MatchTimelineEvent['kind'], 'goal'>, string> = {
  'penalty-missed': 'Gemiste strafschop',
  'penalty-saved': 'Gestopte strafschop',
  'red-card': 'Rode kaart',
  substitution: 'Wissel',
  'yellow-card': 'Gele kaart',
  'yellow-red-card': 'Geel-rode kaart',
}

const blockNames: Record<MatchHalf, string> = {
  'extra-time': 'Verlenging',
  first: 'Eerste helft',
  second: 'Tweede helft',
}

const Name = ({ name }: { name: MatchPlayerName }) => <PlayerName givenName={name.givenName} surname={name.surname} />

function iconKind(event: MatchTimelineEvent): MatchEventIconKind {
  if (event.kind === 'goal') {
    return event.ownGoal ? 'own-goal' : 'goal'
  }

  return event.kind === 'penalty-saved' ? 'penalty-missed' : event.kind
}

function kindName(event: MatchTimelineEvent) {
  if (event.kind !== 'goal') {
    return kindNames[event.kind]
  }

  return event.ownGoal ? 'Eigen doelpunt' : event.penalty ? 'Doelpunt (strafschop)' : 'Doelpunt'
}

const hasWord = (event: MatchTimelineEvent) => event.kind === 'penalty-missed' || event.kind === 'penalty-saved'

const hasAddedTime = (event: MatchTimelineEvent) =>
  event.stoppageMinutes !== null && event.stoppageMinutes !== undefined

/** What a screen reader hears first: the team, the minute and the kind of event. */
const spoken = (event: MatchTimelineEvent) => {
  const added = hasAddedTime(event) ? ` plus ${event.stoppageMinutes}` : ''

  return `${event.team}: Minuut ${event.minute}${added}, ${kindName(event)}: `
}

function Event({ event }: { event: MatchTimelineEvent }) {
  return (
    // Two events can share a minute and a player, so the place in the list is the key.
    <li className="hf-match-event">
      <span
        aria-hidden="true"
        className={classNames('hf-match-event-minute', event.ours && 'hf-match-event-minute-ours')}
      >
        {event.minute}’{hasAddedTime(event) ? `+${event.stoppageMinutes}` : ''}
      </span>
      <span className="hf-match-event-text">
        <span className="hf-visually-hidden">{spoken(event)}</span>
        <span className="hf-match-event-line">
          <MatchEventIcon kind={iconKind(event)} />
          {hasWord(event) ? (
            <>
              <span aria-hidden="true" className="hf-match-event-kind">
                {kindName(event)}
              </span>{' '}
            </>
          ) : null}
          {event.kind === 'substitution' ? (
            <>
              <Name name={event.playerIn} /> voor <Name name={event.playerOut} />
            </>
          ) : (
            <Name name={event.player} />
          )}
          {event.kind === 'goal' && (event.ownGoal === true || event.penalty === true) ? (
            <span aria-hidden="true" className="hf-match-event-note">
              {' '}
              ({event.ownGoal === true ? 'eigen doelpunt' : 'strafschop'})
            </span>
          ) : null}
        </span>
        {event.kind === 'goal' && event.assist !== undefined ? (
          <span className="hf-match-event-assist">
            assist <Name name={event.assist} />
          </span>
        ) : null}
      </span>
    </li>
  )
}

/**
 * The course of a played match in two halves next to each other, and a third block, Verlenging,
 * under them after extra time. In a block every event is one line: the minute in a pill, filled
 * for sc Heerenveen and open for the opponent, then the icon and the name of the player. A goal
 * from a penalty or an own goal says so after the name, a substitution is "A voor B", and the
 * assist is on a line of its own in small letters. A word beside an icon that says the same is
 * left out for the eye. A screen reader hears the team, the minute and the kind of event first:
 * "sc Heerenveen: Minuut 45 plus 2, Doelpunt (strafschop): ...". Each block is a numbered list
 * with a name, under a heading of the level given. The blocks stand next to each other from a
 * container of 40 rem and under each other below. match-timeline.css gives it its look.
 */
export const MatchTimeline = ({
  className,
  events,
  extraTime = false,
  headingLevel = 3,
  ...props
}: MatchTimelineProps) => (
  <div {...props} className={classNames('hf-match-timeline', className)} role="group">
    <div className="hf-match-timeline-blocks">
      {matchHalves
        .filter((half) => half !== 'extra-time' || extraTime)
        .map((half) => {
          const inBlock = events.filter((event) => halfOf(event.minute, extraTime) === half)

          return (
            <div
              className={classNames('hf-match-timeline-block', half === 'extra-time' && 'hf-match-timeline-extra-time')}
              key={half}
            >
              <Heading level={headingLevel}>{blockNames[half]}</Heading>
              {inBlock.length === 0 ? (
                <p className="hf-match-timeline-empty">Niets wat we bijhouden.</p>
              ) : (
                <ol aria-label={blockNames[half]} className="hf-match-timeline-list" role="list">
                  {inBlock.map((event, index) => (
                    <Event event={event} key={index} />
                  ))}
                </ol>
              )}
            </div>
          )
        })}
    </div>
  </div>
)
