import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { PlayerName } from '../player-name/PlayerName'

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

export type MatchTimelineProps = Omit<ComponentPropsWithoutRef<'ol'>, 'children'> & {
  /**
   * The events in the order of the clock, goals, substitutions, cards and missed penalties
   * together.
   */
  events: MatchTimelineEvent[]
}

/** The words for an event, which name it so the colour or the place is never the only sign. */
const kindNames: Record<Exclude<MatchTimelineEvent['kind'], 'goal'>, string> = {
  'penalty-missed': 'Gemiste strafschop',
  'penalty-saved': 'Gestopte strafschop',
  'red-card': 'Rode kaart',
  substitution: 'Wissel',
  'yellow-card': 'Gele kaart',
  'yellow-red-card': 'Geel-rode kaart',
}

const Name = ({ name }: { name: MatchPlayerName }) => <PlayerName givenName={name.givenName} surname={name.surname} />

function kindName(event: MatchTimelineEvent) {
  if (event.kind !== 'goal') {
    return kindNames[event.kind]
  }

  return event.ownGoal ? 'Eigen doelpunt' : event.penalty ? 'Doelpunt uit een strafschop' : 'Doelpunt'
}

/**
 * The course of a played match as an ordered list: for each event the minute, the name of the
 * event in words, the players and the team. The goals, the substitutions, the cards and the
 * missed penalties stand together in the order of the clock, so the list reads as the match
 * went. A screen reader hears "Minuut 45 plus 2", then the name of the event, the players and
 * the team; the minute with the apostrophe is for the eye. The list has no caption of its own:
 * give it a heading above it and point to it with `aria-labelledby`. match-timeline.css gives
 * it its look.
 */
export const MatchTimeline = ({ className, events, ...props }: MatchTimelineProps) => (
  <ol {...props} className={classNames('hf-match-timeline', className)} role="list">
    {events.map((event, index) => (
      // Two events can share a minute and a player, so the place in the list is the key.
      <li className={classNames('hf-match-event', event.ours && 'hf-match-event-ours')} key={index}>
        <span className="hf-match-event-minute">
          <span aria-hidden="true">
            {event.minute}’
            {event.stoppageMinutes === null || event.stoppageMinutes === undefined ? '' : `+${event.stoppageMinutes}`}
          </span>
          <span className="hf-visually-hidden">
            Minuut {event.minute}
            {event.stoppageMinutes === null || event.stoppageMinutes === undefined
              ? ''
              : ` plus ${event.stoppageMinutes}`}
            .{' '}
          </span>
        </span>
        <span className="hf-match-event-text">
          <span className="hf-match-event-kind">{kindName(event)}</span>
          <span className="hf-visually-hidden">: </span>{' '}
          {event.kind === 'substitution' ? (
            <>
              <Name name={event.playerIn} /> erin, <Name name={event.playerOut} /> eruit
            </>
          ) : (
            <Name name={event.player} />
          )}
          {event.kind === 'goal' && event.assist !== undefined ? (
            <span className="hf-match-event-assist">
              {' '}
              (assist: <Name name={event.assist} />)
            </span>
          ) : null}
          <span className="hf-match-event-team">
            <span className="hf-visually-hidden">, </span>
            {event.team}
          </span>
        </span>
      </li>
    ))}
  </ol>
)
