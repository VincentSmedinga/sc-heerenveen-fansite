import type { ReportedPlayerName } from '@fansite/db/match-reports'

import { Card, DataTable, type DataTableRow, GameHeading, Link, PlayerName, Text, Winner } from '@fansite/design-system'
import { isFansPartOn } from '@fansite/shared/fans-env'

import { cacheFor, cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'
import { reasonOf } from '#src/errors'
import {
  fansMatchRatings,
  loadRunningRatings,
  type MatchRatings,
  oldMatchRatings,
  type RatedPlayer,
  ratingMinimum,
  supportersIn,
} from '#src/fans/match-ratings'
import { closingText, coachRow, findRatingWindow, ratingPath } from '#src/fans/rating'
import { nameOfPlayer } from '#src/report-view'

// The card Uitblinker on the page of a match: for an old match (issue 1467) the ratings that
// visitors of the old fansite gave, for a new one (issue 1472) what supporters gave, with the
// Uitblinker of the match in a seal. The card is the same for every visitor: while the window
// is open it has only the count, and the averages come when it closes.

/** A grade with a decimal comma: `7,8`. */
export const gradeText = (value: number) => value.toFixed(1).replace('.', ',')

/** What the card of a new match says: the averages once the window closed, or the count. */
export type NewMatchRatings =
  { closesAt: Date; state: 'open'; supporters: number } | { ratings: MatchRatings; state: 'closed' }

/** The ratings of an old match, or nothing while the game is off. */
export async function loadOldMatchRatings(match: { id: number }): Promise<MatchRatings | undefined> {
  return isFansPartOn('uitblinker') ? oldMatchRatings(match.id) : undefined
}

/**
 * The card Uitblinker of an old match: the heading with "Van de fans" beside it, the seal of
 * the Uitblinker of the match (not when nobody has enough ratings), the table of the players in
 * the order of the line-up, and the source.
 */
export function OldMatchRatingsCard({
  names,
  ratings,
}: {
  names: ReadonlyMap<number, ReportedPlayerName>
  ratings: MatchRatings
}) {
  return (
    <Card aria-labelledby="uitblinker-supporters" game="uitblinker">
      <GameHeading id="uitblinker-supporters" level={2} meta="Van de fans">
        Uitblinker
      </GameHeading>
      <RatingsTable names={names} ratings={ratings} />
      <Text appearance="meta">Cijfers van bezoekers van de Fansite, 2001 tot 2007.</Text>
    </Card>
  )
}

/** The number of supporters who rated, without a full stop: "31 fans gaven cijfers". */
export const supportersText = (count: number, already = false) =>
  `${count === 1 ? '1 fan gaf' : `${count} fans gaven`}${already ? ' al' : ''} cijfers`

/**
 * The card Uitblinker of a new match. Once the window is closed: the seal, the table and the
 * number of supporters, and with fewer than five supporters only the number. While it is open:
 * the number, when the result comes, and the way to give the grades.
 */
export function NewMatchRatingsCard({
  data,
  names,
}: {
  data: NewMatchRatings
  names: ReadonlyMap<number, ReportedPlayerName>
}) {
  return (
    <Card aria-labelledby="uitblinker-supporters" game="uitblinker">
      <GameHeading id="uitblinker-supporters" level={2} meta="Van de fans">
        Uitblinker
      </GameHeading>
      {data.state === 'open' ? (
        <>
          <Text>
            {supportersText(data.supporters, true)}. De uitslag staat hier vanaf {closingText(data.closesAt)}.
          </Text>
          <Text>
            <Link href={ratingPath}>Geef je cijfers</Link>
          </Text>
        </>
      ) : (
        <>
          {data.ratings.supporters < ratingMinimum ? null : <RatingsTable names={names} ratings={data.ratings} />}
          <Text appearance="meta">{supportersText(data.ratings.supporters)}.</Text>
        </>
      )}
    </Card>
  )
}

/**
 * The seal of the Uitblinker of a match, and under it the table of the players with their
 * average and the number of ratings, in the order of `ratings`. A player with fewer than
 * `ratingMinimum` ratings has no average. `names` gives the players their name as the report
 * writes it; without it the name stands as it is.
 */
export function RatingsTable({
  names,
  ratings,
}: {
  names?: ReadonlyMap<number, ReportedPlayerName> | undefined
  ratings: MatchRatings
}) {
  const { coach, players, winner } = ratings

  return (
    <>
      {winner === undefined ? null : (
        <Winner
          average={gradeText(winner.average)}
          label="Uitblinker van de wedstrijd"
          line={`Gemiddelde van ${winner.count} cijfers`}
          name={winner.name}
        />
      )}
      <DataTable
        caption="Cijfers van de fans per speler"
        columns={['Speler', { key: true, name: 'Gem' }, { name: 'Cijfers' }]}
        rows={[
          ...players.map((player) => rowOf(player, winner, names)),
          // The head coach is the last row, after a heavier line, and never has the seal.
          ...(coach === undefined
            ? []
            : [
                {
                  cells: [
                    coach.count >= ratingMinimum ? gradeText(coach.average) : 'nog te weinig cijfers',
                    coach.count,
                  ],
                  header: coachRow(coach.name),
                  total: true,
                },
              ]),
        ]}
        sortable={false}
      />
    </>
  )
}

const getRatingWindow = cacheFor(60 * 1000, () => findRatingWindow(getDatabase().db))

const getRunningSupporters = cacheForKey(60 * 1000, async (key) =>
  supportersIn(await loadRunningRatings(getDatabase().db, Number(key))),
)

/**
 * The ratings of a new match for its card, or nothing: while the game is off, when the window
 * has not closed and is not open for this match, when the report has none, or when nobody
 * rated yet.
 */
export async function loadNewMatchRatings(match: { id: number }): Promise<NewMatchRatings | undefined> {
  if (!isFansPartOn('uitblinker')) {
    return undefined
  }

  const ratings = await fansMatchRatings(match.id)

  if (ratings !== undefined) {
    return { ratings, state: 'closed' }
  }

  const window = await getRatingWindow()

  if (window.state !== 'open' || window.match.id !== match.id) {
    return undefined
  }

  const supporters = await getRunningSupporters(String(match.id))

  return supporters > 0 ? { closesAt: window.closesAt, state: 'open', supporters } : undefined
}

/** The ratings of a new match. A failed reading leaves the card out and logs it. */
export async function readNewMatchRatings(match: { id: number }) {
  try {
    return await loadNewMatchRatings(match)
  } catch (error) {
    console.error(`Could not read what supporters rated at match ${match.id}: ${reasonOf(error)}`)

    return undefined
  }
}

/** The ratings of an old match. A failed reading leaves the card out and logs it. */
export async function readOldMatchRatings(match: { id: number }) {
  try {
    return await loadOldMatchRatings(match)
  } catch (error) {
    console.error(`Could not read what supporters rated at old match ${match.id}: ${reasonOf(error)}`)

    return undefined
  }
}

function rowOf(
  player: RatedPlayer,
  winner: RatedPlayer | undefined,
  names: ReadonlyMap<number, ReportedPlayerName> | undefined,
): DataTableRow {
  const known = player.appearanceId === null ? undefined : names?.get(player.appearanceId)
  const name = nameOfPlayer(player.name, known)

  return {
    cells: [player.count >= ratingMinimum ? gradeText(player.average) : 'nog te weinig cijfers', player.count],
    display: <PlayerName {...name} />,
    header: player.name,
    // In words and on a line of its own: a label in the cell is too wide for the narrow column.
    ...(winner?.playerId === player.playerId ? { secondary: 'Uitblinker' } : {}),
  }
}
