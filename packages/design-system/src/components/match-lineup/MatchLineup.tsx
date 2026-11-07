import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Heading, type HeadingLevel } from '../heading/Heading'
import { type MatchPlayerName } from '../match-timeline/MatchTimeline'
import { PlayerName } from '../player-name/PlayerName'
import { Text } from '../text/Text'

/** A player in the line-up or on the bench. */
export type MatchLineupPlayer = {
  /** Whether the player is the captain: the line says so in words. */
  captain?: boolean | undefined
  name: MatchPlayerName
  /**
   * Sentences about the player in this match, each on a line of its own in small letters, such
   * as "Gewisseld in de 61e minuut, vervangen door Jansen", "Ingevallen in de 61e minuut voor
   * Jansen" or "Gele kaart in de 34e minuut". Write them out: an arrow or a colour says
   * nothing to a screen reader.
   */
  notes?: string[] | undefined
  shirtNumber: number
}

export type MatchLineupProps = Omit<ComponentPropsWithoutRef<'section'>, 'children'> & {
  /**
   * The players on the bench, including those who came on. Leave it empty for a team without a
   * bench.
   */
  bench: MatchLineupPlayer[]
  /**
   * The level of the heading with the name of the team. The lists under it have a label, not a
   * heading.
   */
  headingLevel: Exclude<HeadingLevel, 1>
  /** The players in the line-up, in the order the source gives them. */
  starters: MatchLineupPlayer[]
  /** The name of the team, as the heading. */
  team: string
}

function Players({ label, players, team }: { label: string; players: MatchLineupPlayer[]; team: string }) {
  return (
    <>
      {/* The list has its own name for a screen reader, so this word is for the eye. */}
      <Text appearance="meta" aria-hidden="true" className="hf-match-lineup-label">
        {label}
      </Text>
      <ul aria-label={`${label} ${team}`} className="hf-match-lineup-list" role="list">
        {players.map((player) => (
          <li key={player.shirtNumber}>
            <PlayerName
              givenName={player.name.givenName}
              shirtNumber={player.shirtNumber}
              surname={player.name.surname}
            >
              {player.captain === true ? 'aanvoerder' : undefined}
            </PlayerName>
            {player.notes?.map((note) => (
              <Text appearance="meta" className="hf-match-lineup-note" key={note}>
                {note}
              </Text>
            ))}
          </li>
        ))}
      </ul>
    </>
  )
}

/**
 * The line-up of one team: the name of the team as a heading, the eleven players of the line-up
 * and the bench, each a list with a label in front of it ("Basis" and "Bank"). A player has the
 * shirt number in front of the name and, when he is the captain, the word behind it; what
 * happened to him in the match, such as a substitution or a card, follows in sentences. The
 * lists are labelled with the team in the name a screen reader gives them. A team without a
 * bench shows no list for it. match-lineup.css gives it its look.
 */
export const MatchLineup = ({ bench, className, headingLevel, starters, team, ...props }: MatchLineupProps) => (
  <section {...props} className={classNames('hf-match-lineup', className)}>
    <Heading level={headingLevel}>{team}</Heading>
    <Players label="Basis" players={starters} team={team} />
    {bench.length > 0 ? <Players label="Bank" players={bench} team={team} /> : null}
  </section>
)
