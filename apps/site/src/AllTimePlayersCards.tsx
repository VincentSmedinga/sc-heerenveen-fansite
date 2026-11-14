import {
  Card,
  Disclosure,
  Heading,
  Link,
  List,
  PlayerName,
  tableColumns,
  Text,
  TopScorersTable,
} from '@fansite/design-system'

import type { allTimeScorersOf } from './all-time-players'

import {
  type AllTimeMatch,
  type CountPlace,
  countRows,
  type Hattrick,
  hattrickDay,
  matchKey,
  scorersMore,
  scorersShown,
  shortListPlaces,
  type YearsPlace,
} from './all-time-players'
import { type CompetitionChoice, competitionWords } from './competition'
import { scorersCoverage } from './matches'
import { imageCredit } from './MatchViews'

// The cards of the page Spelers · Cijfers with the choice "Alle seizoenen" (#1219). They count
// every season we have, and a card with nothing to say is left out by the page.

/** What the cards say about the competitions they count, such as `alle wedstrijden`. */
const wordsOf = (competition: CompetitionChoice) => competitionWords(competition)

/** How many players stand in these places: a place can hold more than one. */
const playersIn = (places: readonly YearsPlace[]) => places.reduce((sum, place) => sum + place.players.length, 0)

/**
 * The card Topscorers sinds <season>: the first ten places of the goal scorers of all seasons,
 * as the card of a season counts them, with the years each was with the club. Under the table a
 * closed block shows the places 11 to 25, and a line says for how many matches we don't know
 * the scorers. The card is white and stands in the main column.
 */
export function AllTimeScorersCard({
  competition,
  matches,
  scorers,
}: {
  competition: CompetitionChoice
  matches: readonly AllTimeMatch[]
  scorers: ReturnType<typeof allTimeScorersOf>
}) {
  const { more, since, top, topGoals, total } = scorers
  const { known, played } = scorersCoverage([...matches], competition)
  const caption = (part: string) =>
    `${part} van sc Heerenveen sinds ${since ?? ''}, in ${wordsOf(competition)}, met de jaren bij de club`
  const cut = playersIn(top) < total

  return (
    <Card aria-labelledby="topscorers-sinds-1990-91" shareable={imageCredit(true, undefined, [...matches])}>
      <Heading anchor id="topscorers-sinds-1990-91" level={2}>
        {`Topscorers sinds ${since ?? ''}`}
      </Heading>
      <Text>
        {cut
          ? `De top ${scorersShown} van ${total} spelers die scoorden`
          : total === 1
            ? '1 speler heeft gescoord'
            : `${total} spelers hebben gescoord`}
      </Text>
      <TopScorersTable
        caption={caption(cut ? `De top ${scorersShown} van de doelpuntenmakers` : 'Doelpuntenmakers')}
        rows={top}
        showYears
      />
      {more.length > 0 && (
        <Disclosure summary={`Toon de top ${scorersMore}`}>
          <TopScorersTable
            caption={caption(`De plaatsen ${scorersShown + 1} tot en met ${scorersMore} van de doelpuntenmakers`)}
            rows={more}
            scaleTo={topGoals}
            showYears
          />
        </Disclosure>
      )}
      {known < played && (
        <Text appearance="meta">
          {`Van ${played - known} ${played - known === 1 ? 'wedstrijd' : 'wedstrijden'} kennen we de doelpuntenmakers niet.`}
        </Text>
      )}
    </Card>
  )
}

/**
 * The card Hattricks: the players with the most of them, from the first five places, and a
 * closed block with every hattrick: the player, the match and its day. The match is a link when
 * it has a page (`reportHrefs`, by season, competition and round). The card is soft, in the
 * sidebar.
 */
export function HattricksCard({
  competition,
  hattricks,
  matches,
  reportHrefs,
}: {
  competition: CompetitionChoice
  hattricks: { list: Hattrick[]; top: CountPlace[]; total: number }
  matches: readonly AllTimeMatch[]
  reportHrefs: ReadonlyMap<string, string>
}) {
  const { list, top, total } = hattricks

  return (
    <Card aria-labelledby="hattricks" shareable={imageCredit(true, undefined, [...matches])} surface="soft">
      <Heading anchor id="hattricks" level={2}>
        Hattricks
      </Heading>
      <Text>{total === 1 ? '1 hattrick' : `${total} hattricks`}</Text>
      <TopScorersTable
        caption={`De top ${shortListPlaces} van de spelers met de meeste hattricks voor sc Heerenveen, in ${wordsOf(competition)}`}
        figure={tableColumns.hattricks}
        rows={countRows(top)}
      />
      <Disclosure summary={total === 1 ? 'Toon de hattrick' : `Toon alle ${total} hattricks`}>
        <List role="list">
          {list.map((hattrick) => {
            const { competition: played, date, label, round, season } = hattrick.match
            const href = reportHrefs.get(matchKey(season, played, round))

            return (
              <List.Item key={`${hattrick.id}-${date}`}>
                <PlayerName
                  givenName={hattrick.scorer.givenName}
                  href={hattrick.scorer.href}
                  surname={hattrick.scorer.surname}
                />
                {hattrick.goals > 3 && ` (${hattrick.goals} doelpunten)`}
                <Text appearance="meta">
                  {`${hattrickDay(date)} · `}
                  {href === undefined ? label : <Link href={href}>{label}</Link>}
                </Text>
              </List.Item>
            )
          })}
        </List>
      </Disclosure>
    </Card>
  )
}

/**
 * The card Strafschoppen benut: the first five places of the players who scored the most
 * penalties for sc Heerenveen, and under it the total of all seasons. The card is soft, in the
 * sidebar.
 */
export function PenaltiesCard({
  competition,
  matches,
  penalties,
  since,
}: {
  competition: CompetitionChoice
  matches: readonly AllTimeMatch[]
  penalties: { top: CountPlace[]; total: number }
  since: string | undefined
}) {
  const { top, total } = penalties

  return (
    <Card aria-labelledby="strafschoppen" shareable={imageCredit(true, undefined, [...matches])} surface="soft">
      <Heading anchor id="strafschoppen" level={2}>
        Strafschoppen benut
      </Heading>
      <TopScorersTable
        caption={`De top ${shortListPlaces} van de spelers die de meeste strafschoppen benutten voor sc Heerenveen, in ${wordsOf(competition)}`}
        figure={tableColumns.penalties}
        rows={countRows(top)}
      />
      <Text appearance="meta">
        {`${total} ${total === 1 ? 'strafschop' : 'strafschoppen'} benut sinds ${since ?? ''}`}
      </Text>
    </Card>
  )
}
