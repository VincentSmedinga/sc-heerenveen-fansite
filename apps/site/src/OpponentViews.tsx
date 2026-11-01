import type { PublicClubRecord, PublicSeasonWikipediaPage } from '@fansite/db/queries'

import { Card, DataTable, Heading, List, ShortMatch, Text, WikipediaCredit } from '@fansite/design-system'

import type { SourceVersion } from './card-sources'
import type { ClubSummary, Meeting, Tally } from './opponents'

import { CardLastModified } from './CardLastModified'
import { type CompetitionChoice } from './competition'
import { creditName, formatReadAt, matchMoment, wikipediaUrl } from './match-format'
import { imageCredit, metaSeparator } from './MatchViews'

/**
 * What the cards of the opponents say about the matches they count: all the played matches
 * since the first season we have, in the Eredivisie alone when the choice is `league`. The
 * form is the one of the cards on Statistieken ("Gebaseerd op …"), with the season from which
 * we have data, so a visitor knows how far back the record goes.
 */
export function BasedOnSince({ choice, played, since }: { choice: CompetitionChoice; played: number; since: string }) {
  const matches = played === 1 ? '1 gespeelde wedstrijd' : `alle ${played} gespeelde wedstrijden`

  return (
    <Text appearance="meta">{`Gebaseerd op ${matches}${choice === 'league' ? ' in de Eredivisie' : ''} sinds ${since}`}</Text>
  )
}

/**
 * The columns of the list: the club, and a number each, with the word a screen reader says.
 * Every column can be sorted, and the points are only there with the choice Eredivisie, because
 * the cup gives none.
 */
const clubColumns = (choice: CompetitionChoice) =>
  [
    { name: 'Club', sortable: true },
    { abbreviation: 'G', name: 'gespeeld', sortable: true },
    { abbreviation: 'W', name: 'gewonnen', sortable: true },
    { abbreviation: 'GL', name: 'gelijk', sortable: true },
    { abbreviation: 'V', name: 'verloren', sortable: true },
    { abbreviation: 'D', name: 'doelpunten', sortable: true },
    ...(choice === 'league' ? [{ abbreviation: 'P', name: 'punten', sortable: true }] : []),
  ] as const

/** The points against a club in the Eredivisie: 3 for a win and 1 for a draw. */
const pointsOf = (record: PublicClubRecord) => record.won * 3 + record.drawn

/**
 * The card of the page Tegenstanders with every club we played, A to Z, each name a link to
 * the page of that club (`address` is the base address of the pages of the clubs; `query` is
 * the part of the address that holds the choice, which every link keeps). The columns are the
 * played, won, drawn and lost matches, the goals for and against, as "7–5", and with the
 * choice Eredivisie the points. They are abbreviations, which fit a phone, and the line under
 * the table explains them. The visitor can sort on every column, with JavaScript; the table
 * of the server is A to Z. The goals sort on the goals for. There is no pagination: the list
 * is one page.
 */
export function ClubsCard({
  address,
  choice,
  now,
  query,
  records,
  since,
  sources,
}: {
  address: string
  choice: CompetitionChoice
  now: Date
  query: string
  records: PublicClubRecord[]
  since: string
  sources: readonly SourceVersion[]
}) {
  const played = records.reduce((sum, record) => sum + record.played, 0)

  return (
    <Card aria-labelledby="alle-tegenstanders" surface="soft">
      <Heading id="alle-tegenstanders" level={2}>
        Alle tegenstanders
      </Heading>
      {records.length === 0 ? (
        <Text>We hebben nog geen uitslagen. Kijk straks nog eens.</Text>
      ) : (
        <>
          <DataTable
            caption={`De tegenstanders van sc Heerenveen, van A tot Z, met onze uitslagen tegen elk${choice === 'league' ? ' in de Eredivisie' : ''}`}
            columns={clubColumns(choice)}
            rows={records.map((record) => ({
              cells: [
                record.played,
                record.won,
                record.drawn,
                record.lost,
                { sortValue: record.goalsFor, text: `${record.goalsFor}–${record.goalsAgainst}` },
                ...(choice === 'league' ? [pointsOf(record)] : []),
              ],
              header: record.name,
              href: `${address}/${record.slug}${query}`,
            }))}
          />
          <Text appearance="meta">
            {`G gespeeld, W gewonnen, GL gelijk, V verloren, D doelpunten (voor–tegen)${choice === 'league' ? ', P punten' : ''}`}
          </Text>
          <BasedOnSince choice={choice} played={played} since={since} />
          <CardLastModified card="alle-tegenstanders" now={now} sources={sources} />
        </>
      )}
    </Card>
  )
}

/** A row of the summary: the name of the figure and the figure for the total, home and away. */
const summaryRow = (header: string, tallies: Tally[], figure: (tally: Tally) => number) => ({
  cells: tallies.map(figure),
  header,
})

/**
 * The card of the page of a club with every match against it that was played, the newest
 * first, as short lines. Above each line stand the season and the competition, and the line has
 * the day, the name as Wikipedia wrote the club in that match (so an earlier name shows), where
 * it was played and the result from our side.
 */
export function ClubMeetingsCard({
  meetings,
  now,
  sources,
}: {
  meetings: Meeting[]
  now: Date
  sources: readonly SourceVersion[]
}) {
  return (
    <Card aria-labelledby="wedstrijden" surface="soft">
      <Heading id="wedstrijden" level={2}>
        Wedstrijden
      </Heading>
      <List role="list">
        {meetings.map((match) => (
          <List.Item key={match.id}>
            <Text appearance="meta">
              {match.season}
              {metaSeparator}
              {match.competition}
            </Text>
            <MeetingLine match={match} now={now} />
          </List.Item>
        ))}
      </List>
      <CardLastModified card="wedstrijden" now={now} sources={sources} />
    </Card>
  )
}

/**
 * The card of the page of a club with our record against it: a table with a column for the
 * total, at home and away, and a row for the matches played, won, drawn and lost and the goals
 * for and against, and under it the biggest win and the biggest loss against this club. There
 * are no points, because the cup gives none. It has the button for an image, with the name of
 * the club in the heading, so the image says who it is about.
 */
export function ClubSummaryCard({
  choice,
  name,
  now,
  since,
  sources,
  summary,
}: {
  choice: CompetitionChoice
  name: string
  now: Date
  since: string
  sources: readonly SourceVersion[]
  summary: ClubSummary
}) {
  const tallies = [summary.total, summary.home, summary.away]
  const lines = [
    { match: summary.biggestWin, name: 'Grootste overwinning' },
    { match: summary.biggestLoss, name: 'Grootste nederlaag' },
  ].flatMap(({ match, name: label }) => (match === undefined ? [] : [{ label, match }]))

  return (
    <Card aria-labelledby="onze-uitslagen" shareable={imageCredit(true)} surface="warm">
      <Heading id="onze-uitslagen" level={2}>
        {`Onze uitslagen tegen ${name}`}
      </Heading>
      <DataTable
        caption={`De uitslagen van sc Heerenveen tegen ${name}${choice === 'league' ? ' in de Eredivisie' : ''}, in totaal, thuis en uit`}
        columns={['Onderdeel', 'Totaal', 'Thuis', 'Uit']}
        rows={[
          summaryRow('Gespeeld', tallies, (tally) => tally.played),
          summaryRow('Gewonnen', tallies, (tally) => tally.won),
          summaryRow('Gelijk', tallies, (tally) => tally.drawn),
          summaryRow('Verloren', tallies, (tally) => tally.lost),
          summaryRow('Doelpunten voor', tallies, (tally) => tally.goalsFor),
          summaryRow('Doelpunten tegen', tallies, (tally) => tally.goalsAgainst),
        ]}
      />
      {lines.length > 0 && (
        <List role="list">
          {lines.map(({ label, match }) => (
            <List.Item key={label}>
              <Text appearance="meta">{label}</Text>
              <MeetingLine match={match} now={now} />
            </List.Item>
          ))}
        </List>
      )}
      <BasedOnSince choice={choice} played={summary.total.played} since={since} />
      <CardLastModified card="onze-uitslagen" now={now} sources={sources} />
    </Card>
  )
}

/**
 * The credit of Wikipedia for a page that counts across seasons: a link to each page of each
 * season in `seasons`, with the moment the importer last read any of them, in a card without a
 * border or background, so its text lines up with the cards above. It is nothing when the
 * importer has read none of them.
 */
export function OpponentsCredit({
  pages,
  seasons,
}: {
  pages: PublicSeasonWikipediaPage[]
  seasons: readonly string[]
}) {
  const credited = pages
    .filter((page) => seasons.includes(page.season))
    .map((page) => ({ href: wikipediaUrl(page.title), name: creditName(page.kind, page.season), readAt: page.readAt }))
  const [first, ...rest] = credited

  if (first === undefined) {
    return null
  }

  const readAt = new Date(Math.max(...credited.map((page) => page.readAt.getTime())))

  return (
    <Card as="div" surface="transparent">
      <WikipediaCredit pages={[first, ...rest]} readAt={formatReadAt(readAt)} readAtDateTime={readAt.toISOString()} />
    </Card>
  )
}

/** One played match against the club as a short line. */
function MeetingLine({ match, now }: { match: Meeting; now: Date }) {
  return (
    <ShortMatch
      {...matchMoment(match, now)}
      goalsAgainst={match.goalsAgainst}
      goalsFor={match.goalsFor}
      home={match.home}
      opponent={match.opponent}
    />
  )
}
