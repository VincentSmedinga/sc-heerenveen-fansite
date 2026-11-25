import {
  Card,
  CardLink,
  DataTable,
  Heading,
  type KeyFigure,
  KeyFigures,
  PredictionList,
  Text,
} from '@fansite/design-system'
import { maxPredictionPoints, pointsPerPart } from '@fansite/shared/prediction-points'

import { ScoringCard as GameScoringCard, MatchLine } from '#src/fans/GameCards'
import { clubsOf, predictionPath } from '#src/fans/prediction'
import { type CrowdFigures, type ScoredPrediction, totalsOf } from '#src/fans/prediction-results'
import { guessText, listItemOf, playedScore, reasonText, scoreText } from '#src/fans/prediction-words'
import { RulesLink } from '#src/fans/RulesLink'

// The cards of the points of the game Prognose (issue 1449): what a fan predicted, the
// points of a match, how everybody did, and the scoring itself.

/** How many matches the list "Jouw voorspellingen" shows before the link to all of them. */
export const shownPredictions = 5

/** The address of the page with the whole list. */
export const allPredictionsAddress = `${predictionPath}?alle=ja#jouw-voorspellingen`

const plural = (count: number, one: string, many: string) => (count === 1 ? `1 ${one}` : `${count} ${many}`)

/**
 * The card "Zo deed iedereen het", in the narrow column: how many had the full-time score
 * exactly right, how many the outcome, and the average. Under five predictions it says only how
 * many there were, because a share of three people says little and shows who they are.
 */
export function CrowdCard({ figures }: { figures: CrowdFigures }) {
  return (
    <Card aria-labelledby="zo-deed-iedereen-het" game="prognose">
      <Heading id="zo-deed-iedereen-het" level={2}>
        Zo deed iedereen het
      </Heading>
      {figures.average === undefined ? (
        <Text>{`${plural(figures.count, 'fan voorspelde', 'fans voorspelden')} deze wedstrijd.`}</Text>
      ) : (
        <>
          <Text>{`${plural(figures.exact, 'fan had', 'fans hadden')} de eindstand precies goed.`}</Text>
          <Text>{`${plural(figures.outcome, 'fan had', 'fans hadden')} de uitslag goed.`}</Text>
          <Text>{`Gemiddeld ${figures.average.toFixed(1).replace('.', ',')} punten, van ${plural(figures.count, 'voorspelling', 'voorspellingen')}.`}</Text>
        </>
      )}
    </Card>
  )
}

/**
 * The card of a match that has a result, with the points of the fan: the match with its
 * score, the points, and the table "Hoe je punten tellen" with a line under each row that says
 * why. A match that is still being played shows only the half-time row, if it has points, with
 * the line that the points of the final score come after the match. The page does not pass such
 * a match yet: the database holds a half-time score only with the result (#1445), so that
 * branch waits for the rule to change.
 */
export function PointsCard({
  item,
  now,
  places,
}: {
  item: ScoredPrediction
  now: Date
  /** Your place at this match and in the ranking of its season, as key figures. */
  places?: readonly KeyFigure[]
}) {
  const { match, points, result } = item
  const clubs = clubsOf(match)
  const played = match.state === 'played'
  const score = playedScore(match)
  const rows = [
    ...(points.halfTime === undefined || result.halfTime === undefined
      ? []
      : [
          {
            cells: [scoreText(item.guess.halfTime), scoreText(result.halfTime), points.halfTime.points],
            header: 'Rust',
            secondary: reasonText(points.halfTime, 'halfTime', clubs),
          },
        ]),
    ...(points.fullTime === undefined || result.fullTime === undefined
      ? []
      : [
          {
            cells: [scoreText(item.guess.fullTime), scoreText(result.fullTime), points.fullTime.points],
            header: 'Eind',
            secondary: reasonText(points.fullTime, 'fullTime', clubs),
          },
        ]),
  ]

  return (
    <Card aria-labelledby={`punten-${match.id}`} game="prognose">
      <Heading id={`punten-${match.id}`} level={2}>
        Je punten
      </Heading>
      {score === undefined ? (
        <Text>
          {clubs.home} – {clubs.away}
        </Text>
      ) : (
        <MatchLine match={match} now={now} played />
      )}
      <Text>{guessText(item)}</Text>
      {played ? (
        <KeyFigures
          figures={[{ figure: String(points.total), label: 'punten', note: 'voor deze wedstrijd' }, ...(places ?? [])]}
        />
      ) : null}
      {rows.length === 0 ? null : (
        <DataTable
          caption="Hoe je punten tellen"
          columns={['Onderdeel', 'Jij', 'Uitslag', 'Punten']}
          rows={[...rows, ...(played ? [{ cells: ['', '', points.total], header: 'Totaal', total: true }] : [])]}
          sortable={false}
        />
      )}
      {played ? null : <Text>De punten voor de eindstand komen na de wedstrijd.</Text>}
      <RulesLink />
    </Card>
  )
}

/** The card "Punten": the scoring as a table, with the link to the rules. */
export function ScoringCard() {
  return (
    <GameScoringCard game="prognose">
      <ScoringTable caption="Wat een voorspelling oplevert" />
      <Text>{`De telling van de Fansite. Hoogstens ${maxPredictionPoints} punten per wedstrijd.`}</Text>
      <RulesLink />
    </GameScoringCard>
  )
}

/**
 * The table of the scoring, from the same numbers that `predictionPoints` uses, so the table
 * and the sum cannot differ. The outcomes are the rows and the two parts the columns: three
 * short columns fit a narrow column and a phone without abbreviations. The card "Punten" and
 * the page with the rules show it.
 */
export function ScoringTable({ caption }: { caption: string }) {
  const { fullTime, halfTime } = pointsPerPart

  return (
    <DataTable
      caption={caption}
      columns={['Onderdeel', 'Rust', 'Eind']}
      rows={[
        { cells: [halfTime.exact, fullTime.exact], header: 'Precies goed' },
        { cells: [halfTime.outcome, fullTime.outcome], header: 'Uitslag goed' },
        { cells: [halfTime.goals, fullTime.goals], header: 'Eén doelpuntental goed' },
      ]}
      sortable={false}
    />
  )
}

/**
 * The card "Jouw voorspellingen": a row for each match, the newest first, with the points in
 * its head and the number of predictions small behind them. It shows the last five, and `all`
 * shows every one. A fan without predictions gets one line instead of the list. The words
 * "Jouw voorspellingen" stay in the head for a screen reader, and name the card and the list.
 */
export function YourPredictionsCard({
  all,
  items,
  now,
}: {
  all: boolean
  items: readonly ScoredPrediction[]
  now: Date
}) {
  const { count, points } = totalsOf(items)
  const shown = all ? items : items.slice(0, shownPredictions)

  return (
    <Card aria-labelledby="jouw-voorspellingen-kop" game="prognose" id="jouw-voorspellingen">
      <Heading id="jouw-voorspellingen-kop" level={2}>
        {items.length === 0 ? (
          'Jouw voorspellingen'
        ) : (
          <>
            <Text as="span" className="hf-visually-hidden">
              Jouw voorspellingen:{' '}
            </Text>
            {plural(points, 'punt', 'punten')}
            <Text as="span" className="hf-visually-hidden">
              ,
            </Text>{' '}
            <Text appearance="meta" as="span">
              {plural(count, 'voorspelling', 'voorspellingen')}
            </Text>
          </>
        )}
      </Heading>
      {items.length === 0 ? (
        <Text>Nog niets. Doe mee aan de Prognose.</Text>
      ) : (
        <>
          <PredictionList
            aria-labelledby="jouw-voorspellingen-kop"
            items={shown.map((item) => listItemOf(item, now))}
          />
          {items.length > shown.length ? (
            <CardLink href={allPredictionsAddress}>{`Alle ${count} voorspellingen`}</CardLink>
          ) : null}
          <RulesLink />
        </>
      )}
    </Card>
  )
}
