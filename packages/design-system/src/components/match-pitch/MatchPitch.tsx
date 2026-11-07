import type { ComponentPropsWithoutRef, CSSProperties } from 'react'

import { classNames } from '../classNames'
import { Disclosure } from '../disclosure/Disclosure'
import { Heading, type HeadingLevel } from '../heading/Heading'
import { MatchEventIcon } from '../match-event-icon/MatchEventIcon'
import { PlayerName } from '../player-name/PlayerName'
import { Tag } from '../tag/Tag'
import { isCrowdedFormation, parseFormation, pitchSpots } from './pitch-layout'
import { PitchPlayer, type PitchPlayerData } from './PitchPlayer'

export type MatchPitchProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** Whether the match went into extra time: the rings then run to 120 minutes, not 90. */
  extraTime?: boolean | undefined
  /** The level of the headings of the two teams in the list under the pitch. */
  headingLevel: Exclude<HeadingLevel, 1>
  /** The opponent: at the top of an upright pitch and on the right of one that lies down. */
  opponent: MatchPitchTeam
  /** sc Heerenveen: at the bottom of an upright pitch and on the left of one that lies down. */
  ours: MatchPitchTeam
}

/** One of the two teams on the pitch. */
export type MatchPitchTeam = {
  /**
   * The formation, such as `4-3-3`. Leave it out when the report has none: the team is then not
   * on the pitch, and the list under the pitch names its players.
   */
  formation?: null | string | undefined
  /** The name of the team. */
  name: string
  /**
   * The eleven players of the line-up in the order of the form: the goalkeeper first, then the
   * rows of the formation from the defence to the attack, each row from left to right.
   */
  players: readonly PitchPlayerData[]
}

type Placed = { drawn: boolean; formation: null | string | undefined; team: MatchPitchTeam }

function Roster({ headingLevel, team }: { headingLevel: Exclude<HeadingLevel, 1>; team: MatchPitchTeam }) {
  return (
    <div className="hf-match-pitch-roster">
      <Heading appearance={4} level={headingLevel}>
        {team.name}
        {team.formation === undefined || team.formation === null || team.formation === '' ? null : (
          <span className="hf-match-pitch-roster-formation"> · {team.formation}</span>
        )}
      </Heading>
      <ol className="hf-match-pitch-roster-list" role="list">
        {team.players.map((player) => (
          <li key={player.shirtNumber}>
            <PlayerName
              givenName={player.name.givenName}
              shirtNumber={player.shirtNumber}
              surname={player.name.surname}
            >
              {player.captain === true ? 'aanvoerder' : undefined}
            </PlayerName>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Team({ extraTime, ours, placed }: { extraTime: boolean; ours: boolean; placed: Placed }) {
  const spots = placed.drawn ? pitchSpots(placed.formation, placed.team.players.length, ours) : null

  if (spots === null) {
    return null
  }

  return (
    <ol aria-label={`Opstelling ${placed.team.name}, ${placed.formation}`} className="hf-match-pitch-team" role="list">
      {placed.team.players.map((player, index) => {
        const spot = spots[index]

        return (
          <PitchPlayer
            {...player}
            extraTime={extraTime}
            key={player.shirtNumber}
            ours={ours}
            style={
              {
                '--hf-pitch-landscape-share': `${spot?.landscapeShare}%`,
                '--hf-pitch-landscape-x': `${spot?.landscape.x}%`,
                '--hf-pitch-landscape-y': `${spot?.landscape.y}%`,
                '--hf-pitch-portrait-x': `${spot?.portrait.x}%`,
                '--hf-pitch-portrait-y': `${spot?.portrait.y}%`,
                '--hf-pitch-share': `${spot?.share}%`,
              } as CSSProperties
            }
          />
        )
      })}
    </ol>
  )
}

/**
 * The line-up of both teams on a pitch: a striped grass mat with the halfway line, the centre
 * circle, the penalty areas and the goal areas, and on it the eleven players of each team in
 * the place of their formation (see `pitchSpots`). It stands upright on a phone, with sc
 * Heerenveen at the bottom, and lies down from 40 rem wide, with sc Heerenveen on the left.
 * Above the pitch stand the two teams with the colour of their disc (filled for sc Heerenveen,
 * open for the opponent) and their formation; under it the explanation of the marks, and under
 * that the disclosure "Opstelling als lijst" with the players of each team.
 *
 * For a screen reader the pitch is a list for each team, "Opstelling <team>, <formation>", with
 * one sentence for each player in the order of the formation; everything drawn is hidden from
 * it. The pitch has no controls of its own. A team without a formation, or with one that
 * does not fit the number of its players, is not on the pitch: a sentence says so, and the list
 * under the pitch names its players. With a row of five players, or five rows, the names do not
 * fit on a narrow pitch, so they are left out there and a sentence points to the list.
 * match-pitch.css gives it its look.
 */
export const MatchPitch = ({
  className,
  extraTime = false,
  headingLevel,
  opponent,
  ours,
  ...props
}: MatchPitchProps) => {
  const teams = [
    { side: true, team: ours },
    { side: false, team: opponent },
  ].map(({ side, team }) => ({
    ours: side,
    placed: {
      drawn: pitchSpots(team.formation, team.players.length, side) !== null,
      formation: team.formation,
      team,
    } satisfies Placed,
  }))
  const missing = teams.filter(({ placed }) => !placed.drawn).map(({ placed }) => placed.team.name)
  const crowded = teams.some(({ placed }) => {
    const rows = placed.drawn ? parseFormation(placed.formation) : null

    return rows !== null && isCrowdedFormation(rows)
  })

  return (
    <div {...props} className={classNames('hf-match-pitch', className)}>
      <div className="hf-match-pitch-teams">
        {teams.map(({ ours: isOurs, placed }) => (
          <span className="hf-match-pitch-team-name" key={placed.team.name}>
            <span
              aria-hidden="true"
              className={classNames('hf-match-pitch-swatch', isOurs && 'hf-match-pitch-swatch-ours')}
            />
            {placed.team.name}
            {placed.drawn ? <Tag>{placed.formation ?? ''}</Tag> : null}
          </span>
        ))}
      </div>
      <div className={classNames('hf-match-pitch-field', crowded && 'hf-match-pitch-crowded')}>
        <span className="hf-match-pitch-line hf-match-pitch-line-half" />
        <span className="hf-match-pitch-line hf-match-pitch-line-circle" />
        <span className="hf-match-pitch-line hf-match-pitch-line-penalty-area hf-match-pitch-line-first" />
        <span className="hf-match-pitch-line hf-match-pitch-line-penalty-area hf-match-pitch-line-second" />
        <span className="hf-match-pitch-line hf-match-pitch-line-goal-area hf-match-pitch-line-first" />
        <span className="hf-match-pitch-line hf-match-pitch-line-goal-area hf-match-pitch-line-second" />
        {teams.map(({ ours: isOurs, placed }) => (
          <Team extraTime={extraTime} key={placed.team.name} ours={isOurs} placed={placed} />
        ))}
      </div>
      {crowded ? (
        <p className="hf-match-pitch-note hf-match-pitch-note-crowded">
          Bij deze formatie passen de namen niet op een smal scherm. De lijst hieronder noemt ze.
        </p>
      ) : null}
      {missing.length === 0 ? null : (
        <p className="hf-match-pitch-note">
          Voor {missing.join(' en ')} past de formatie niet bij de spelers; de lijst hieronder toont de opstelling.
        </p>
      )}
      <ul aria-label="Uitleg van de merken" className="hf-match-pitch-legend" role="list">
        <li>
          <span aria-hidden="true" className="hf-match-pitch-legend-disc">
            9
          </span>
          Rugnummer
        </li>
        <li>Ring: minuten gespeeld</li>
        <li>
          <MatchEventIcon kind="goal" /> Doelpunt
        </li>
        <li>
          <MatchEventIcon kind="yellow-card" /> Kaart
        </li>
        <li>
          <MatchEventIcon kind="out" /> Eruit gewisseld
        </li>
        <li>
          <b aria-hidden="true">A</b> Aanvoerder
        </li>
      </ul>
      <Disclosure summary="Opstelling als lijst">
        <div className="hf-match-pitch-rosters">
          <Roster headingLevel={headingLevel} team={ours} />
          <Roster headingLevel={headingLevel} team={opponent} />
        </div>
      </Disclosure>
    </div>
  )
}
