import type { PublicMatch } from '@fansite/db/queries'

import { Card, DescriptionList, Heading, Match, Text } from '@fansite/design-system'

import type { CijfersSearch } from './cijfers-search'

import { type CompetitionChoice } from './competition'
import { formatTableDay, matchMoment } from './match-format'
import { shootOutOf } from './match-result'
import {
  type AllMatch,
  attendanceRecordsOf,
  competitionNames,
  extremesOf,
  recordsOf,
  type RecordStreak,
} from './matches'
import { MatchSearchLink } from './MatchSearchLink'
import { BasedOn, imageCredit } from './MatchViews'

const numberFormat = new Intl.NumberFormat('nl-NL')

/** The seasons of a streak: `1999/00`, or `1998/99 tot 1999/00` for one that ran over two. */
export const streakSeasons = ({ seasons }: RecordStreak) =>
  seasons.from === seasons.to ? seasons.from : `${seasons.from} tot ${seasons.to}`

const matchesWord = (count: number) => (count === 1 ? 'wedstrijd' : 'wedstrijden')

/**
 * The card Records of the page with all seasons (it is the card Uitersten of a season): the
 * biggest win and loss and the match with the most goals, each a `Match` with its name
 * above it and its year, then the longest run without a loss and without a win with the seasons
 * it ran over, and how often a shoot-out decided a match. A line without a match is left out.
 * The two goals of Uitersten, the earliest and the last, are left out: a record of a goal is
 * the card of the players. `since` is the first season we have matches of.
 */
export function RecordsCard({
  competition,
  level = 2,
  matches,
  now,
  search,
  since,
}: {
  competition: CompetitionChoice
  level?: 2 | 3
  matches: AllMatch[]
  now: Date
  /** The links to the matches behind a record, in the search of matches. */
  search?: CijfersSearch | undefined
  since: string
}) {
  const { biggestLoss, biggestWin, mostGoals, played } = extremesOf(matches, competition)
  const { shootOuts, unbeaten, winless } = recordsOf(matches, competition)
  const lines = [
    { match: biggestWin, name: 'Grootste overwinning' },
    { match: biggestLoss, name: 'Grootste nederlaag' },
    { match: mostGoals, name: 'Meeste doelpunten' },
  ]
  const shown = lines.flatMap(({ match, name }) => (match === undefined ? [] : [{ match, name }]))
  const streaks = [
    { name: 'Langste reeks zonder nederlaag', streak: unbeaten },
    { name: 'Langste reeks zonder zege', streak: winless },
  ].flatMap(({ name, streak }) => (streak === undefined ? [] : [{ name, streak }]))

  return (
    <Card aria-labelledby="records" shareable={imageCredit(played > 0, { since }, matches)} surface="soft">
      <Heading anchor id="records" level={level}>
        Records
      </Heading>
      {played === 0 ? (
        <Text>We hebben geen uitslagen.</Text>
      ) : (
        <>
          <DescriptionList stacked>
            {shown.map(({ match, name }) => (
              <DescriptionList.Item key={name} term={name}>
                <Match
                  // Only played matches with both scores count, so these are numbers.
                  competition={competition === 'all' ? match.competition : undefined}
                  {...matchMoment(match, now, { withYear: true })}
                  goalsAgainst={match.goalsAgainst ?? 0}
                  goalsFor={match.goalsFor ?? 0}
                  {...shootOutOf(match)}
                  home={match.home}
                  opponent={match.opponent}
                  round={match.round}
                  status="played"
                />
              </DescriptionList.Item>
            ))}
            {streaks.map(({ name, streak }) => (
              <DescriptionList.Item key={name} term={name}>
                <Text>{`${streak.length} ${matchesWord(streak.length)}, ${streakSeasons(streak)}`}</Text>
              </DescriptionList.Item>
            ))}
            {shootOuts.total > 0 && (
              <DescriptionList.Item term="Beslist met strafschoppen">
                <Text>{`${shootOuts.total} keer, ${shootOuts.won} gewonnen`}</Text>
              </DescriptionList.Item>
            )}
          </DescriptionList>
          <MatchSearchLink link={search?.biggestWins()} what="die we wonnen, de grootste zege eerst" />
          <BasedOn known={played} played={played} />
        </>
      )}
    </Card>
  )
}

/** The text of a match for a record: "54.346, bij Ajax op 11 augustus 2024". */
const recordLine = (match: PublicMatch) =>
  `${numberFormat.format(match.attendance ?? 0)}, ${match.home ? 'tegen' : 'bij'} ${match.opponent} op ${formatTableDay(match.matchDate)}`

/**
 * The card Toeschouwers of the page with all seasons: the match with the most visitors, home or
 * away, the home match with the most, and the average at home. It has no chart, because a bar
 * for each of some seven hundred home matches says nothing. The numbers are estimates, and many
 * matches have none, so the line under it says how many it is based on.
 */
export function AttendanceRecordsCard({
  competition,
  level = 2,
  matches,
  since,
}: {
  competition: CompetitionChoice
  level?: 2 | 3
  matches: AllMatch[]
  since: string
}) {
  const { average, homeKnown, known, mostEver, mostHome, played } = attendanceRecordsOf(matches, competition)

  return (
    <Card aria-labelledby="toeschouwers" shareable={imageCredit(known > 0, { since }, matches)}>
      <Heading anchor id="toeschouwers" level={level}>
        Toeschouwers
      </Heading>
      {mostEver === undefined ? (
        <Text>{`We kennen geen toeschouwersaantallen in ${competitionNames(matches, competition)}.`}</Text>
      ) : (
        <>
          <Text>{`Het meest ooit: ${recordLine(mostEver)}`}</Text>
          {mostHome !== undefined && mostHome !== mostEver && <Text>{`Het meest thuis: ${recordLine(mostHome)}`}</Text>}
          {average !== undefined && (
            <Text>{`Gemiddeld ${numberFormat.format(average)} toeschouwers per thuiswedstrijd, in ${homeKnown} ${matchesWord(homeKnown)}`}</Text>
          )}
          <Text appearance="meta">Het aantal toeschouwers is een schatting, volgens Wikipedia.</Text>
          <BasedOn known={known} played={played} />
        </>
      )}
    </Card>
  )
}
