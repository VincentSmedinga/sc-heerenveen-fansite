import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Heading, type HeadingLevel } from '../heading/Heading'
import { MatchEventIcon } from '../match-event-icon/MatchEventIcon'
import { type MatchPlayerName } from '../match-timeline/MatchTimeline'
import { PlayerName } from '../player-name/PlayerName'
import { type MatchPenaltyResult, penaltySeriesFigures } from './penalty-series'

export type { MatchPenaltyResult } from './penalty-series'

/** A kick of the shoot-out. */
export type MatchPenaltyKick = {
  /** The player who took it. Leave it out when the player is not known. */
  player?: MatchPlayerName | undefined
  /** `scored` is in the goal, `missed` is past it and `saved` is stopped by the keeper. */
  result: MatchPenaltyResult
}

/** A round of the shoot-out: the kick of each team. A team that did not kick has none. */
export type MatchPenaltyRound = {
  /** The kick of sc Heerenveen. */
  ours?: MatchPenaltyKick | undefined
  /** The kick of the opponent. */
  theirs?: MatchPenaltyKick | undefined
}

export type MatchPenaltySeriesProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'> & {
  /** The level of the heading "Strafschoppenserie" in the structure of the page. */
  headingLevel: HeadingLevel
  /** The name of the opponent, written out, such as `Testdorp FC`. */
  opponent: string
  /** The rounds in the order they were kicked, from the first. */
  rounds: readonly MatchPenaltyRound[]
}

/** The name of our own club, which a match always has on one side. */
const ourClub = 'sc Heerenveen'

/** After this round the deciding rounds begin: a team that is level kicks on, one by one. */
const regularRounds = 5

/** The word a screen reader hears before a kick, and the word the eye reads beside a miss. */
const resultWords: Record<MatchPenaltyResult, string> = { missed: 'Naast', saved: 'Gestopt', scored: 'Raak' }

const Kick = ({ kick }: { kick: MatchPenaltyKick | undefined }) =>
  kick === undefined ? (
    <span className="hf-visually-hidden">Geen schot</span>
  ) : (
    <>
      <MatchEventIcon kind={kick.result === 'scored' ? 'goal' : 'penalty-missed'} size="large" />
      <span className="hf-visually-hidden">{resultWords[kick.result]}: </span>
      {kick.player === undefined ? (
        <span className="hf-match-penalty-unknown">Speler onbekend</span>
      ) : (
        <PlayerName givenName={kick.player.givenName} surname={kick.player.surname} />
      )}
      {kick.result === 'scored' ? null : (
        <span aria-hidden="true" className="hf-match-penalty-word">
          {' '}
          ({resultWords[kick.result].toLowerCase()})
        </span>
      )}
    </>
  )

/** The kicks of one team as a row of chips, with a gap before the deciding rounds. */
const KickRow = ({ kicks }: { kicks: (MatchPenaltyKick | undefined)[] }) => (
  <span className="hf-match-penalty-kicks">
    {kicks.map((kick, index) =>
      kick === undefined ? null : (
        <span
          className={classNames('hf-match-penalty-kick', index === regularRounds && 'hf-match-penalty-deciding')}
          key={index}
        >
          <MatchEventIcon kind={kick.result === 'scored' ? 'goal' : 'penalty-missed'} size="large" />
        </span>
      ),
    )}
  </span>
)

const Team = ({ goals, kicks, name }: { goals: number; kicks: (MatchPenaltyKick | undefined)[]; name: string }) => (
  <div className="hf-match-penalty-team">
    <span className="hf-match-penalty-name">{name}</span>
    <span className="hf-match-penalty-total">
      <span className="hf-visually-hidden">{name}: </span>
      {goals}
    </span>
    <KickRow kicks={kicks} />
  </div>
)

/**
 * The penalty shoot-out of a match, twice: as a row of kicks for each team with the total, and
 * as a table with a line for each round, the kickers of both teams and the score after the
 * round. The row is the quick look and is hidden from a screen reader, except for the totals,
 * whose hidden text names the team. The table is what a screen reader reads: its caption says
 * the final score, and every cell starts with "Raak:", "Naast:" or "Gestopt:". A kick that did
 * not score also has the word in small letters beside the player, so the cross through the
 * ring is never the only sign. A kick without a known player says "Speler onbekend". The
 * deciding rounds, after the fifth, stand a little apart in the row. The component has its own
 * heading and no card around it: put it in a `Card`. match-penalty-series.css gives it its
 * look.
 */
export const MatchPenaltySeries = ({
  className,
  headingLevel,
  opponent,
  rounds,
  ...props
}: MatchPenaltySeriesProps) => {
  const { ours, rounds: figures, theirs } = penaltySeriesFigures(rounds)

  return (
    <div {...props} className={classNames('hf-match-penalty-series', className)}>
      <Heading level={headingLevel}>Strafschoppenserie</Heading>
      <div className="hf-match-penalty-teams">
        <Team goals={ours} kicks={rounds.map((round) => round.ours)} name={ourClub} />
        <Team goals={theirs} kicks={rounds.map((round) => round.theirs)} name={opponent} />
      </div>
      <table className="hf-match-penalty-table">
        <caption className="hf-visually-hidden">
          Strafschoppenserie, stand {ours}–{theirs}
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <span aria-hidden="true">Nr.</span>
              <span className="hf-visually-hidden">Ronde</span>
            </th>
            <th scope="col">{ourClub}</th>
            <th scope="col">{opponent}</th>
            <th scope="col">Stand</th>
          </tr>
        </thead>
        <tbody>
          {figures.map(({ number, round, standing }) => (
            <tr key={number}>
              <th scope="row">{number}</th>
              <td>
                <Kick kick={round.ours} />
              </td>
              <td>
                <Kick kick={round.theirs} />
              </td>
              <td className="hf-match-penalty-standing">
                <span aria-hidden="true">
                  {standing[0]}–{standing[1]}
                </span>
                <span className="hf-visually-hidden">
                  {standing[0]} tegen {standing[1]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
