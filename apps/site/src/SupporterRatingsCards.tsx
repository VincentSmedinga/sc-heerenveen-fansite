import { Card, DataTable, Heading, Link, SeasonPicker, Text } from '@fansite/design-system'

import { yearWinnersPath } from './fans-paths'
import { type RankedPlayer, type YearWinner } from './fans/season-ratings'
import { gradeText, minimumMatches, minimumRatings, oldSourceLine } from './player-ratings'

/** The dash a figure that we do not have shows: a figure we do not have is never a nought. */
const dash = '–'

/**
 * The card "Cijfers van supporters" on Spelers › Cijfers (issue 1474): the players of a season
 * from the highest season rating down, with the link to the Uitblinkers of the year. The card
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
        Cijfers van supporters
      </Heading>
      <SeasonPicker action={action} fields={fields} label={seasonPickerLabel} options={options} value={value} />
      {rows.length === 0 ? (
        <Text>Dit seizoen zijn er nog geen cijfers.</Text>
      ) : (
        <>
          <DataTable
            caption={`Seizoen ${season}, de spelers van hoog naar laag op seizoencijfer`}
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
          <Text appearance="meta">
            {`W: wedstrijden met ${minimumRatings} cijfers of meer. Gem: gemiddelde van alle cijfers van het seizoen. Een speler staat er vanaf ${minimumMatches} wedstrijden.`}
            {seasonOnly ? ' Een streepje: van dat seizoen is alleen het seizoencijfer bekend.' : ''}
          </Text>
        </>
      )}
      {oldSource ? <Text appearance="meta">{oldSourceLine}</Text> : null}
      <Text>
        <Link href={yearWinnersPath}>Uitblinker van het jaar</Link>
      </Text>
    </Card>
  )
}

/** What the season picker of the card is called: the page has another picker of its own. */
export const seasonPickerLabel = 'Seizoen van de cijfers'

/** The text that stands for a season that has no Uitblinker of the year yet. */
export const afterTheSeason = 'Na het seizoen'

/** What stands instead of the table while no season has an Uitblinker. */
export const noYearWinners = 'Nog geen uitblinkers.'

/** The source line under the list of the Uitblinkers of the year. */
export const yearWinnersSource = 'Tot 2006/07: cijfers van bezoekers van de oude Fansite.'

/**
 * The card on the page "Uitblinker van het jaar": a table of the season, the player or players
 * and the season rating, the newest season first. The current season says "Na het seizoen"
 * until it is over. The Uitblinker is named in the table, so no colour carries it.
 */
export function YearWinnersCard({ winners }: { winners: readonly YearWinner[] }) {
  return (
    <Card aria-labelledby="uitblinkers-van-het-jaar" game="uitblinker">
      <Heading id="uitblinkers-van-het-jaar" level={2}>
        Uitblinkers van het jaar
      </Heading>
      {winners.length === 0 ? (
        <Text>{noYearWinners}</Text>
      ) : (
        <DataTable
          appearance="text"
          caption="De Uitblinker van elk seizoen, het nieuwste seizoen eerst"
          columns={['Seizoen', 'Speler', { name: 'Gem' }]}
          rows={winners.map((winner) => ({
            cells: [
              // On an equal rating both players are the winner.
              winner.names.length === 0 ? afterTheSeason : winner.names.join(' en '),
              winner.average === undefined ? dash : gradeText(winner.average),
            ],
            header: winner.season,
          }))}
          // The seasons stand in their own order, the newest first.
          sortable={false}
        />
      )}
      <Text appearance="meta">{yearWinnersSource}</Text>
    </Card>
  )
}
