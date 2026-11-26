import { Card, CardColumns, CardLink, DataTable, Heading, ShowAll, Text, Winner } from '@fansite/design-system'

import { yearWinnersPath } from './fans-paths'
import { bestSeasons, type RankedPlayer, ratingsLine, type YearWinner } from './fans/season-ratings'
import { gradeText, minimumMatches, minimumRatings, oldSourceLine } from './player-ratings'

/** The dash a figure that we do not have shows: a figure we do not have is never a nought. */
const dash = '–'

/** How many players of the ranking show at once; a button shows the rest. */
export const shownPlayers = 5

/**
 * The card "Cijfers van de fans" on Spelers › Cijfers (issue 1474): the players of a season
 * from the highest season rating down, the first five at once and the rest on a button
 * (issues 1647 and 1690), with the link to the Uitblinkers of the year. The card
 * has the watermark of the Uitblinker (see `Card`). It is about the season of the page (issue
 * 1691). A season without a player that counts says so instead of showing an empty table.
 */
export function SeasonRankingCard({
  current,
  oldSource,
  rows,
  season,
  seasonOnly,
}: {
  /** Whether it is the running season, which has no ratings yet when `rows` is empty. */
  current: boolean
  /** Whether the numbers come from the old fansite, so the source stands under them. */
  oldSource: boolean
  rows: readonly RankedPlayer[]
  season: string
  /** Whether a row has only a season rating, so the legend says so. */
  seasonOnly: boolean
}) {
  return (
    <Card aria-labelledby="cijfers-van-supporters" game="uitblinker">
      <Heading id="cijfers-van-supporters" level={2}>
        Cijfers van de fans
      </Heading>
      {rows.length === 0 ? (
        <Text>{current ? noRatingsYet : noElection}</Text>
      ) : (
        <>
          <ShowAll moreLabel={`Toon alle ${rows.length} spelers`} shown={shownPlayers} total={rows.length}>
            <DataTable
              caption={`Seizoen ${season}, de spelers van hoog naar laag op seizoencijfer`}
              columns={[
                'Speler',
                { abbreviation: 'W', name: 'Wedstrijden met cijfers' },
                { abbreviation: 'Gem', key: true, name: 'Gemiddeld cijfer' },
              ]}
              legend={`W: wedstrijden met ${minimumRatings} cijfers of meer. Gem: gemiddelde van alle cijfers van het seizoen. Een speler staat er vanaf ${minimumMatches} wedstrijden.${seasonOnly ? ' Een streepje: van dat seizoen is alleen het seizoencijfer bekend.' : ''}`}
              rows={rows.map((row) => ({
                cells: [row.matches ?? dash, gradeText(row.average)],
                header: row.name,
                position: row.place,
              }))}
              // The players stand in the order of the ranking, from the highest rating down.
              sortable={false}
            />
          </ShowAll>
        </>
      )}
      {oldSource ? <Text appearance="meta">{oldSourceLine}</Text> : null}
      <CardLink href={yearWinnersPath}>Uitblinker van het jaar</CardLink>
    </Card>
  )
}

/** What stands instead of the table in the running season while nobody counts yet. */
export const noRatingsYet = 'Dit seizoen zijn er nog geen cijfers.'

/** What stands instead of the table in an earlier season without ratings. */
export const noElection = 'Geen verkiezing in dit seizoen'

/** The text that stands for a season that has no Uitblinker of the year yet. */
export const afterTheSeason = 'Na het seizoen'

/** What stands instead of the table while no season has an Uitblinker. */
export const noYearWinners = 'Nog geen uitblinkers.'

/** The source line under the list of the Uitblinkers of the year. */
export const yearWinnersSource = 'Tot 2006/07: cijfers van bezoekers van de Fansite.'

/** The id of the heading of the card of a season, so the card can name itself. */
const seasonHeadingId = (season: string) => `uitblinker-${season.replace('/', '-')}`

/**
 * The cards on the page "Uitblinker van het jaar" (issue 1613): one card for each season, the
 * newest first, with a star for the winner or for both players on an equal rating. The running
 * season has a card without a star that says "Na het seizoen" until it is over. The card of the
 * best season of all is soft, and its winners are the "Uitblinker van de uitblinkers" (issue
 * 1667). The Uitblinker is named in text, so no colour carries it.
 * Without a season there is one card that says so.
 */
export function YearWinnerCards({ winners }: { winners: readonly YearWinner[] }) {
  if (winners.length === 0) {
    return (
      <Card aria-labelledby="uitblinkers-van-het-jaar" game="uitblinker">
        <Heading id="uitblinkers-van-het-jaar" level={2}>
          Uitblinkers van het jaar
        </Heading>
        <Text>{noYearWinners}</Text>
      </Card>
    )
  }

  const best = bestSeasons(winners)

  return (
    <CardColumns>
      {winners.map((winner) => (
        <Card
          aria-labelledby={seasonHeadingId(winner.season)}
          game="uitblinker"
          key={winner.season}
          surface={best.has(winner.season) ? 'soft' : 'default'}
        >
          <Heading id={seasonHeadingId(winner.season)} level={2}>
            {`Uitblinker ${winner.season}`}
          </Heading>
          {winner.average === undefined ? (
            <Text>{afterTheSeason}</Text>
          ) : (
            // On an equal rating both players are the winner.
            winner.players.map((player) => (
              <Winner
                average={gradeText(winner.average as number)}
                key={player.name}
                label={best.has(winner.season) ? 'Uitblinker van de uitblinkers' : 'Uitblinker van het jaar'}
                line={ratingsLine(player.ratings)}
                name={player.name}
              />
            ))
          )}
        </Card>
      ))}
    </CardColumns>
  )
}
