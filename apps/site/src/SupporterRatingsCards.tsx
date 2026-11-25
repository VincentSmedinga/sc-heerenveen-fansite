import {
  Card,
  CardColumns,
  CardLink,
  DataTable,
  Disclosure,
  Heading,
  SeasonPicker,
  Text,
  Winner,
} from '@fansite/design-system'

import { yearWinnersPath } from './fans-paths'
import { type BestYearWinners, type RankedPlayer, ratingsLine, type YearWinner } from './fans/season-ratings'
import { gradeText, minimumMatches, minimumRatings, oldSourceLine } from './player-ratings'

/** The dash a figure that we do not have shows: a figure we do not have is never a nought. */
const dash = '–'

/** How many players of the ranking show at once; the rest is behind a Disclosure. */
export const shownPlayers = 5

/**
 * The card "Cijfers van de fans" on Spelers › Cijfers (issue 1474): the players of a season
 * from the highest season rating down, the first five at once and the rest behind a Disclosure
 * (issue 1647), with the link to the Uitblinkers of the year. The card
 * has the watermark of the Uitblinker (see `Card`). A season without a player that counts
 * says so instead of showing an empty table.
 */
export function SeasonRankingCard({
  action,
  fields,
  oldSource,
  options,
  rows,
  season,
  seasonOnly,
  value,
}: {
  /** Where the season picker sends the choice: the page itself, with `?seizoen=`. */
  action: string
  fields: Readonly<Record<string, string>>
  /** Whether the numbers come from the old fansite, so the source stands under them. */
  oldSource: boolean
  options: readonly { label: string; value: string }[]
  rows: readonly RankedPlayer[]
  season: string
  /** Whether a row has only a season rating, so the legend says so. */
  seasonOnly: boolean
  value: string
}) {
  return (
    <Card aria-labelledby="cijfers-van-supporters" game="uitblinker">
      <Heading id="cijfers-van-supporters" level={2}>
        Cijfers van de fans
      </Heading>
      <SeasonPicker action={action} fields={fields} label={seasonPickerLabel} options={options} value={value} />
      {rows.length === 0 ? (
        <Text>Dit seizoen zijn er nog geen cijfers.</Text>
      ) : (
        <>
          <RankingTable
            caption={`Seizoen ${season}, de spelers van hoog naar laag op seizoencijfer`}
            rows={rows.slice(0, shownPlayers)}
          />
          {rows.length > shownPlayers && (
            <Disclosure summary={`Toon alle ${rows.length} spelers`}>
              <RankingTable
                caption={`Seizoen ${season}, de andere spelers van hoog naar laag op seizoencijfer`}
                rows={rows.slice(shownPlayers)}
              />
            </Disclosure>
          )}
          <Text appearance="meta">
            {`W: wedstrijden met ${minimumRatings} cijfers of meer. Gem: gemiddelde van alle cijfers van het seizoen. Een speler staat er vanaf ${minimumMatches} wedstrijden.`}
            {seasonOnly ? ' Een streepje: van dat seizoen is alleen het seizoencijfer bekend.' : ''}
          </Text>
        </>
      )}
      {oldSource ? <Text appearance="meta">{oldSourceLine}</Text> : null}
      <CardLink href={yearWinnersPath}>Uitblinker van het jaar</CardLink>
    </Card>
  )
}

/** A table of players of the ranking, with their places. */
function RankingTable({ caption, rows }: { caption: string; rows: readonly RankedPlayer[] }) {
  return (
    <DataTable
      caption={caption}
      columns={[
        'Speler',
        { abbreviation: 'W', name: 'Wedstrijden met cijfers' },
        { abbreviation: 'Gem', key: true, name: 'Gemiddeld cijfer' },
      ]}
      rows={rows.map((row) => ({
        cells: [row.matches ?? dash, gradeText(row.average)],
        header: row.name,
        position: row.place,
      }))}
      // The players stand in the order of the ranking, from the highest rating down.
      sortable={false}
    />
  )
}

/** What the season picker of the card is called: the page has another picker of its own. */
export const seasonPickerLabel = 'Seizoen van de cijfers'

/** The text that stands for a season that has no Uitblinker of the year yet. */
export const afterTheSeason = 'Na het seizoen'

/** What stands instead of the table while no season has an Uitblinker. */
export const noYearWinners = 'Nog geen uitblinkers.'

/** The source line under the list of the Uitblinkers of the year. */
export const yearWinnersSource = 'Tot 2006/07: cijfers van bezoekers van de Fansite.'

/** The id of the heading of the card of a season, so the card can name itself. */
const seasonHeadingId = (season: string) => `uitblinker-${season.replace('/', '-')}`

/**
 * The strong card beside the cards of the seasons: the player with the highest season rating of
 * all the seasons that are over, with that season. On an equal rating every player is in it.
 */
export function BestYearWinnersCard({ best }: { best: BestYearWinners }) {
  return (
    <Card aria-labelledby="uitblinker-van-de-uitblinkers" game="uitblinker" surface="strong">
      <Heading id="uitblinker-van-de-uitblinkers" level={2}>
        Uitblinker van de Uitblinkers
      </Heading>
      {best.players.map((player) => (
        <Winner
          average={gradeText(best.average)}
          key={`${player.season}-${player.name}`}
          label="Uitblinker van de Uitblinkers"
          line={
            player.ratings === undefined
              ? `Seizoen ${player.season} · seizoencijfer van de Fansite`
              : `Seizoen ${player.season} · ${ratingsLine(player.ratings).toLowerCase()}`
          }
          name={player.name}
        />
      ))}
    </Card>
  )
}

/**
 * The cards on the page "Uitblinker van het jaar" (issue 1613): one card for each season, the
 * newest first, with a seal for the winner or for both players on an equal rating. The running
 * season has a card without a seal that says "Na het seizoen" until it is over. The Uitblinker
 * is named in text, so no colour carries it. Without a season there is one card that says so.
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

  return (
    <CardColumns>
      {winners.map((winner) => (
        <Card aria-labelledby={seasonHeadingId(winner.season)} game="uitblinker" key={winner.season}>
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
                label="Uitblinker van het jaar"
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
