import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { MatchEventIcon, type MatchEventIconKind } from '../match-event-icon/MatchEventIcon'
import { type MatchPlayerName } from '../match-timeline/MatchTimeline'
import { PlayerDisc } from './PlayerDisc'

/** The heaviest card the player got in the match. */
export type PitchPlayerCard = {
  kind: 'red-card' | 'yellow-card' | 'yellow-red-card'
  minute: number
  stoppageMinutes?: number | undefined
}

/** What the pitch needs to know of a player in the line-up. */
export type PitchPlayerData = {
  /** Whether he is the captain: a mark and the word in the sentence. */
  captain?: boolean | undefined
  card?: PitchPlayerCard | undefined
  /** His goals, in the order of the clock. A player without any leaves it out. */
  goals?: readonly PitchPlayerGoal[] | undefined
  /** The minute he came on. A player of the line-up leaves it out (0). */
  minutesFrom?: number | undefined
  /** The minutes he played, also when he was sent off. The ring shows them. */
  minutesPlayed: number
  name: MatchPlayerName
  shirtNumber: number
  /** The minute he was substituted. Leave it out for a player who stayed on or was sent off. */
  substitutedOffAt?: number | undefined
}

/** A goal of the player. `ownGoal` is a goal against his own team. */
export type PitchPlayerGoal = {
  minute: number
  ownGoal?: boolean | undefined
  /** The minutes of added time after `minute`, as the 2 of 90+2. */
  stoppageMinutes?: number | undefined
}

export type PitchPlayerProps = Omit<ComponentPropsWithoutRef<'li'>, 'children'> &
  PitchPlayerData & {
    /** Whether the match went into extra time: the ring then runs to 120 minutes, not 90. */
    extraTime?: boolean | undefined
    /** Whether he plays for sc Heerenveen: the disc is filled for them, open for the others. */
    ours: boolean
  }

/** A minute as the page writes it: `12'` or, in added time, `90+2'`. */
export const pitchMinute = (minute: number, stoppageMinutes?: number | undefined) =>
  stoppageMinutes === undefined || stoppageMinutes === 0 ? `${minute}'` : `${minute}+${stoppageMinutes}'`

const cardWords: Record<PitchPlayerCard['kind'], string> = {
  'red-card': 'rode kaart',
  'yellow-card': 'gele kaart',
  'yellow-red-card': 'geel-rode kaart',
}

const fullName = (name: MatchPlayerName) =>
  [name.givenName, name.surname].filter((part) => part !== undefined && part !== '').join(' ')

/**
 * The sentence a screen reader hears for a player, such as "Bram Visser, rugnummer 1,
 * aanvoerder, doelpunt 12', gele kaart 27', eruit 62', 90 minuten". Every mark on the pitch has
 * a word in it, so no mark is the only sign.
 */
export function pitchPlayerSentence(player: PitchPlayerData): string {
  const parts = [fullName(player.name), `rugnummer ${player.shirtNumber}`]

  if (player.captain === true) {
    parts.push('aanvoerder')
  }

  for (const goal of player.goals ?? []) {
    parts.push(
      `${goal.ownGoal === true ? 'eigen doelpunt' : 'doelpunt'} ${pitchMinute(goal.minute, goal.stoppageMinutes)}`,
    )
  }

  if (player.card !== undefined) {
    parts.push(`${cardWords[player.card.kind]} ${pitchMinute(player.card.minute, player.card.stoppageMinutes)}`)
  }

  if (player.substitutedOffAt !== undefined) {
    parts.push(`eruit ${pitchMinute(player.substitutedOffAt)}`)
  }

  parts.push(`${player.minutesPlayed} ${player.minutesPlayed === 1 ? 'minuut' : 'minuten'}`)

  return parts.join(', ')
}

/**
 * The arc of the ring in degrees: where it starts (the minute he came on) and how far it runs
 * (the minutes he played). A full match is 360 degrees, whether it lasted 90 or 120 minutes.
 */
export function pitchRingArc(player: PitchPlayerData, extraTime: boolean) {
  const length = extraTime ? 120 : 90
  const from = Math.min(Math.max(player.minutesFrom ?? 0, 0), length)
  const played = Math.min(Math.max(player.minutesPlayed, 0), length - from)

  return { length: (played / length) * 360, start: (from / length) * 360 }
}

/** The kind of the mark for his goals: red only when every goal was against his own team. */
const goalKind = (goals: readonly PitchPlayerGoal[]): MatchEventIconKind =>
  goals.every((goal) => goal.ownGoal === true) ? 'own-goal' : 'goal'

/**
 * A player on the pitch: a round disc with the shirt number, a ring round it that shows the
 * minutes he played (an arc that starts at the minute he came on, with a gap between disc and
 * ring), marks for a goal (top right, red when every goal was an own goal), the heaviest card
 * (top left), being substituted (bottom right) and the captain (an "A", bottom left), and his
 * surname in small letters under it. A long surname runs over two lines with hyphens, and then
 * ends in "…". It is a list item with one sentence for a screen reader
 * (`pitchPlayerSentence`); everything drawn is hidden from it. The pitch (`MatchPitch`) puts
 * it in place; on its own it is a column of disc and name. pitch-player.css gives it its look.
 */
export const PitchPlayer = ({
  captain,
  card,
  className,
  extraTime = false,
  goals,
  minutesFrom,
  minutesPlayed,
  name,
  ours,
  shirtNumber,
  style,
  substitutedOffAt,
  ...props
}: PitchPlayerProps) => {
  const player: PitchPlayerData = {
    captain,
    card,
    goals,
    minutesFrom,
    minutesPlayed,
    name,
    shirtNumber,
    substitutedOffAt,
  }
  const arc = pitchRingArc(player, extraTime)
  const shownName = name.surname === '' ? (name.givenName ?? '') : name.surname

  return (
    <li
      {...props}
      className={classNames('hf-pitch-player', ours ? 'hf-pitch-player-ours' : 'hf-pitch-player-theirs', className)}
      style={style}
    >
      <span className="hf-visually-hidden">{pitchPlayerSentence(player)}</span>
      <span aria-hidden="true" className="hf-pitch-player-drawing">
        <PlayerDisc arc={arc} ours={ours} shirtNumber={shirtNumber}>
          {goals !== undefined && goals.length > 0 ? (
            <span className="hf-pitch-player-mark hf-pitch-player-mark-goal">
              <MatchEventIcon kind={goalKind(goals)} />
            </span>
          ) : null}
          {card === undefined ? null : (
            <span className="hf-pitch-player-mark hf-pitch-player-mark-card">
              <MatchEventIcon kind={card.kind} />
            </span>
          )}
          {substitutedOffAt === undefined ? null : (
            <span className="hf-pitch-player-mark hf-pitch-player-mark-out">
              <MatchEventIcon kind="out" />
            </span>
          )}
          {captain === true ? <span className="hf-pitch-player-mark hf-pitch-player-mark-captain">A</span> : null}
        </PlayerDisc>
        <span className="hf-pitch-player-name">
          <span className="hf-pitch-player-surname">{shownName}</span>
          {substitutedOffAt === undefined ? null : (
            <span className="hf-pitch-player-off">eruit {pitchMinute(substitutedOffAt)}</span>
          )}
        </span>
      </span>
    </li>
  )
}
