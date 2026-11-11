import { Card, Heading, PlayerFiguresTable, tableColumns, Text, TopScorersTable } from '@fansite/design-system'

import type { CompetitionChoice } from './competition'
import type { ReportFigures } from './report-figures'

import { basedOnSentence, figureRows, type RankedFigure, rankedPlaces, reportPlaces } from './report-figures'

// The cards of the page Spelers with the figures of the match reports (#832): the lists of the
// assists and the minutes, and the table of all the players. They count only the reports that
// are `klaar`, say how many of the played matches that is, and credit the sc Heerenveen
// Fansite.

/** The credit under the image of a card, and in the card: where the figures come from. */
const ownRecords = 'Bron: sc Heerenveen Fansite'

/** The credit for the image of a card. */
const credit = <Text appearance="meta">{ownRecords}</Text>

/** The competitions the figures count, for the caption of a table. */
const competitionWords = (competition: CompetitionChoice) =>
  competition === 'league' ? 'de Eredivisie' : 'alle competities'

/** What the figures rest on and where they come from: two lines under the content of a card. */
function Footing({ figures }: { figures: Pick<ReportFigures, 'known' | 'played'> }) {
  return (
    <>
      <Text appearance="meta">{basedOnSentence(figures)}</Text>
      {/* The image has its own credit under it, so the card's line is not copied into it. */}
      <Text appearance="meta" data-hf-card-share-skip="">
        {ownRecords}
      </Text>
    </>
  )
}

const rankings = {
  assists: {
    anchor: 'assists',
    caption: 'assists van sc Heerenveen',
    column: tableColumns.assists,
    empty: 'Er is nog geen assist in de verslagen.',
    heading: 'Assists',
    line: (total: number) => (total === 1 ? '1 speler gaf een assist' : `${total} spelers gaven een assist`),
    topLine: (total: number) => `De top ${reportPlaces} van ${total} spelers die een assist gaven`,
  },
  minutes: {
    anchor: 'minuten',
    caption: 'minuten van sc Heerenveen',
    column: tableColumns.minutes,
    empty: 'Er zijn nog geen minuten in de verslagen.',
    heading: 'Minuten',
    line: (total: number) => (total === 1 ? '1 speler heeft gespeeld' : `${total} spelers hebben gespeeld`),
    topLine: (total: number) => `De top ${reportPlaces} van ${total} spelers die speelden`,
  },
} as const satisfies Record<RankedFigure, object>

/**
 * The card with the table of all the players of the reports: the matches, the line-ups, the
 * times he came on, the minutes, the goals, the assists and the cards. It is a card of the
 * main column, since the table is wide, and white like the squad it follows.
 */
export function AllPlayersCard({
  competition,
  figures,
  season,
  seasonOnImage,
}: {
  competition: CompetitionChoice
  figures: ReportFigures
  season: string
  seasonOnImage?: string | undefined
}) {
  return (
    <Card
      aria-labelledby="alle-spelers"
      shareable={figures.players.length > 0 ? { season: seasonOnImage, source: credit } : undefined}
    >
      <Heading anchor id="alle-spelers" level={2}>
        Alle spelers
      </Heading>
      {figures.players.length === 0 ? (
        <Text>Er staan nog geen spelers in de verslagen.</Text>
      ) : (
        <>
          <Text>
            {figures.players.length === 1
              ? '1 speler staat in de verslagen'
              : `${figures.players.length} spelers staan in de verslagen`}
          </Text>
          <PlayerFiguresTable
            caption={`Alle spelers in de verslagen van sc Heerenveen in het seizoen ${season}, in ${competitionWords(competition)}`}
            rows={figureRows(figures.players)}
          />
        </>
      )}
      <Footing figures={figures} />
    </Card>
  )
}

/**
 * A card with the top five of a figure (the assists or the minutes): a line under the heading
 * for how many players it is, the table with equal places shared, and under it what the figures
 * rest on. The card is soft and in the sidebar, and has the button for an image.
 */
export function RankingCard({
  competition,
  figure,
  figures,
  season,
  seasonOnImage,
}: {
  competition: CompetitionChoice
  figure: RankedFigure
  figures: ReportFigures
  season: string
  seasonOnImage?: string | undefined
}) {
  const words = rankings[figure]
  const { rows, total } = rankedPlaces(figures.players, figure, true)
  const everybody = rankedPlaces(figures.players, figure, false).rows.length

  return (
    <Card
      aria-labelledby={words.anchor}
      shareable={total > 0 ? { season: seasonOnImage, source: credit } : undefined}
      surface="soft"
    >
      <Heading anchor id={words.anchor} level={2}>
        {words.heading}
      </Heading>
      {total === 0 ? (
        <Text>{words.empty}</Text>
      ) : (
        <>
          <Text>{rows.length < everybody ? words.topLine(total) : words.line(total)}</Text>
          <TopScorersTable
            caption={`De top ${reportPlaces} van de ${words.caption} in het seizoen ${season}, in ${competitionWords(competition)}`}
            figure={words.column}
            rows={rows}
          />
        </>
      )}
      <Footing figures={figures} />
    </Card>
  )
}
