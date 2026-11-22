import {
  Card,
  DataTable,
  Disclosure,
  Heading,
  type KeyFigure,
  KeyFigures,
  Match,
  PredictionList,
  type PredictionListItem,
  Strong,
  tableColumns,
  tableLegend,
  Text,
} from '@fansite/design-system'
import { fantasyScoring } from '@fansite/shared/fantasy-points'

import type { FourPoints, MatchStanding, PointsMatch } from '#src/fans/fjouwer-points'

import { pointsText } from '#src/fans/fjouwer-form'
import { clubsOf } from '#src/fans/prediction'
import { matchMoment } from '#src/match-format'
import { reportAddress } from '#src/report-data'

// The cards of the points of the game Fjouwer (issue 1471): the four of the last match with
// what each player did, the earlier matches, and the scoring.

/** How many earlier matches stand open before the rest goes behind the fold. */
export const shownEarlier = 5

const playedScore = (match: PointsMatch) =>
  match.status === 'played' && match.goalsFor !== null && match.goalsAgainst !== null
    ? { goalsAgainst: match.goalsAgainst, goalsFor: match.goalsFor }
    : undefined

/** The score as it is written on the line: home–away. */
const scoreText = (match: PointsMatch) => {
  const score = playedScore(match)

  if (score === undefined) {
    return undefined
  }

  return match.home ? `${score.goalsFor}–${score.goalsAgainst}` : `${score.goalsAgainst}–${score.goalsFor}`
}

/**
 * The card of the last match of which the supporter had a four: the match with its score, the
 * points and the place as key figures, and the table "Jouw vier" with what each player did.
 * While the report is not finished it shows the four by name and says the points come with the
 * report. A player who did not count, because he was chosen ten times already, is in the table
 * with the reason and 0.
 */
export function LastMatchCard({
  item,
  now,
  standing,
  supporterId,
}: {
  item: FourPoints
  now: Date
  standing: MatchStanding | undefined
  supporterId: number
}) {
  const { match } = item
  const score = playedScore(match)
  const place = placeFigure(standing, supporterId)
  const legend = tableLegend([tableColumns.points])
  const id = `punten-${match.id}`

  return (
    <Card aria-labelledby={id} game="fjouwer">
      <Heading id={id} level={2}>
        Je punten
      </Heading>
      {score === undefined ? (
        <Text>{`${clubsOf(match).home} – ${clubsOf(match).away}`}</Text>
      ) : (
        <Match
          competition={match.competition}
          {...matchMoment({ ...match, status: 'played' }, now)}
          goalsAgainst={score.goalsAgainst}
          goalsFor={score.goalsFor}
          home={match.home}
          opponent={match.opponent}
          reportHref={reportAddress(match.season, match.matchDate, match.clubSlug)}
          round={match.round}
          status="played"
        />
      )}
      {item.ready && item.total !== undefined ? (
        <>
          <KeyFigures
            figures={[
              { figure: pointsText(item.total), label: 'punten', note: 'voor deze wedstrijd' },
              ...(place ? [place] : []),
            ]}
          />
          <DataTable
            appearance="text"
            caption="Jouw vier"
            columns={['Speler', { fold: true, name: 'Wat er gebeurde' }, tableColumns.points]}
            rows={[
              ...item.rows.map((row) => ({
                cells: [row.summary, pointsText(row.points.total)],
                header: row.name,
              })),
              { cells: ['', <Strong key="total">{pointsText(item.total)}</Strong>], header: 'Totaal' },
            ]}
            sortable={false}
          />
          <Text appearance="meta">{legend}</Text>
          <Text appearance="meta">Uit het verslag van de redactie. Een gecorrigeerd verslag corrigeert je punten.</Text>
        </>
      ) : (
        <>
          <Text>{`Jouw vier: ${item.names.join(', ')}.`}</Text>
          <Text>De punten staan er als het verslag af is.</Text>
        </>
      )}
    </Card>
  )
}

/** "2e van 87 bij deze wedstrijd" as a key figure, or nothing for a supporter without one. */
export function placeFigure(standing: MatchStanding | undefined, supporterId: number): KeyFigure | undefined {
  const entry = standing?.places.get(supporterId)

  return standing === undefined || entry === undefined
    ? undefined
    : { figure: `${entry.place}e`, label: 'plek', note: `van ${standing.counted} bij deze wedstrijd` }
}

const listItemOf = (item: FourPoints, now: Date): PredictionListItem => {
  const { match } = item
  const clubs = clubsOf(match)
  const moment = matchMoment({ ...match, status: 'played' }, now)

  return {
    ...clubs,
    competition: match.competition,
    date: moment.time,
    dateTime: moment.dateTime,
    points: item.total,
    prediction: item.names.join(', '),
    score: scoreText(match),
  }
}

/**
 * The card "Eerdere wedstrijden": a row for each earlier match with a four and a finished
 * report, the newest first. The last five stand open and the rest is behind a Disclosure. With
 * no earlier match there is no card.
 */
export function EarlierMatchesCard({ items, now }: { items: readonly FourPoints[]; now: Date }) {
  const finished = items.filter((item) => item.ready)

  if (finished.length === 0) {
    return null
  }

  const open = finished.slice(0, shownEarlier)
  const rest = finished.slice(shownEarlier)

  return (
    <Card aria-labelledby="eerdere-wedstrijden" game="fjouwer">
      <Heading id="eerdere-wedstrijden" level={2}>
        Eerdere wedstrijden
      </Heading>
      <PredictionList aria-labelledby="eerdere-wedstrijden" items={open.map((item) => listItemOf(item, now))} />
      {rest.length === 0 ? null : (
        <Disclosure summary={`Alle ${finished.length} wedstrijden`}>
          <PredictionList aria-label="De andere wedstrijden" items={rest.map((item) => listItemOf(item, now))} />
        </Disclosure>
      )}
    </Card>
  )
}

/** The scoring as rows of the table: the short names, from the numbers that the sum uses. */
export const scoringRows: readonly { header: string; points: number }[] = [
  { header: 'Gespeeld, tot 60 minuten', points: fantasyScoring.playedShort },
  { header: 'Gespeeld, vanaf 60 minuten', points: fantasyScoring.fullGame },
  { header: 'Doelpunt aanvaller', points: fantasyScoring.goal.aanvaller },
  { header: 'Doelpunt middenvelder', points: fantasyScoring.goal.middenvelder },
  { header: 'Doelpunt verdediger of doelman', points: fantasyScoring.goal.verdediger },
  { header: 'Assist', points: fantasyScoring.assist },
  { header: 'Geen tegendoelpunt, doelman of verdediger vanaf 60 minuten', points: fantasyScoring.cleanSheet },
  { header: 'Gele kaart', points: fantasyScoring.yellow },
  { header: 'Rode kaart', points: fantasyScoring.red },
  { header: 'Eigen doelpunt', points: fantasyScoring.ownGoal },
]

/** The soft card "Punten", in the narrow column: the scoring, and who decides. */
export function ScoringCard() {
  return (
    <Card aria-labelledby="punten-telling" game="fjouwer" surface="soft">
      <Heading id="punten-telling" level={2}>
        Punten
      </Heading>
      <DataTable
        caption="Wat een speler oplevert"
        columns={['Onderdeel', 'Punten']}
        rows={scoringRows.map((row) => ({ cells: [pointsText(row.points)], header: row.header }))}
        sortable={false}
      />
      <Text>Het verslag van de redactie beslist wat een speler deed.</Text>
    </Card>
  )
}
