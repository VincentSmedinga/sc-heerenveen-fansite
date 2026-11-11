import { BarChart, BarList, Card, Heading, Link, OutcomeBar, Text } from '@fansite/design-system'

import type { GoalQuarters, PlayerRecord, SeasonBars } from './player-charts'

import { quarters } from './player-charts'

/** The ids of the cards, for the headings that name them. */
const ids = { quarters: 'wanneer-hij-scoort', record: 'uitslagen', seasons: 'grafiek-per-seizoen' } as const

/**
 * The card "Wanneer hij scoort": six bars, one per quarter of an hour, and the same numbers as
 * a sentence for a screen reader and for anyone who wants the figure. A sentence says how many
 * goals have no minute, when there are some.
 */
export function PlayerQuartersCard({ quarters: goals }: { quarters: GoalQuarters }) {
  const max = Math.max(1, ...goals.counts)

  return (
    <Card aria-labelledby={ids.quarters}>
      <Heading id={ids.quarters} level={2}>
        Wanneer hij scoort
      </Heading>
      <Text appearance="meta">Doelpunten per kwartier.</Text>
      <BarChart
        axis={{ labels: quarters.map((text, index) => ({ at: index + 0.5, text })) }}
        bars={goals.counts.map((value) => ({ tone: 'positive', value }))}
        max={max}
        ticks={[0, max]}
      />
      <Text>{quarters.map((quarter, index) => `${quarter}: ${goals.counts[index]}`).join(' · ')}</Text>
      {goals.unknown > 0 && (
        <Text appearance="meta">{`Van ${goals.unknown} van de ${goals.total} kennen we de minuut niet.`}</Text>
      )}
    </Card>
  )
}

/**
 * The card with the results of the matches he was in: a sentence with the three numbers, and a
 * bar in three parts that shows them. The sentence says everything; a colour is never the only
 * sign.
 */
export function PlayerRecordCard({ record }: { record: PlayerRecord }) {
  return (
    <Card aria-labelledby={ids.record}>
      <Heading id={ids.record} level={2}>
        {record.title}
      </Heading>
      <OutcomeBar draws={record.draws} losses={record.losses} wins={record.wins} />
      <Text>{`${record.wins} gewonnen, ${record.draws} gelijk en ${record.losses} verloren.`}</Text>
      <Text appearance="meta">Telt de wedstrijden waarvan we de opstelling hebben.</Text>
    </Card>
  )
}

/**
 * The card with a bar per season (#1085): the oldest season on top, the number beside the bar,
 * and the season as a link to its page Spelers. The heading says what the bars count. The bars
 * are decoration; the numbers are the text of the list.
 */
export function PlayerSeasonBarsCard({
  address,
  bars,
}: {
  /** The address of the page Spelers of a season. */
  address: (season: string) => string
  bars: SeasonBars
}) {
  return (
    <Card aria-labelledby={ids.seasons}>
      <Heading id={ids.seasons} level={2}>
        {bars.title}
      </Heading>
      <BarList
        rows={bars.rows.map(({ season, value }) => ({ label: <Link href={address(season)}>{season}</Link>, value }))}
      />
    </Card>
  )
}
