import { Card, DataTable, Heading, Link, List, Text } from '@fansite/design-system'
import {
  cardExamples,
  exampleFacts,
  type FantasyExample,
  fullMatchExample,
  minutesExamples,
} from '@fansite/shared/fantasy-examples'
import { fantasyPoints } from '@fansite/shared/fantasy-points'
import { maxPredictionPoints } from '@fansite/shared/prediction-points'

import { fansPath } from '#src/fans-paths'
import { pointsText } from '#src/fans/fjouwer-form'
import { maxPerLine, maxUsesPerSeason, picksPerMatch } from '#src/fans/fjouwer-rules'
import { examplePoints, exampleResult } from '#src/fans/prediction-rules'
import { scoreText } from '#src/fans/prediction-words'

import { scoringRows } from '../fjouwer/PointsCards'
import { ScoringTable } from '../prognose/PointsCards'

// The cards of the page with the rules of the games (issue 1455), one for each game and one
// for the account. Each takes its words from the code of the game where it can: the scoring
// table and the example come from the same numbers as the points themselves.

/** The tie rule of the ranking, in the words of the legend of the table of the ranking. */
export const tieRule =
  'Gelijk? Meer precieze eindstanden eerst, dan meer precieze ruststanden, anders delen jullie een plaats.'

/** The card about the account, without a watermark: it is no game. */
export function AccountRulesCard() {
  return (
    <Card aria-labelledby="account">
      <Heading anchor id="account" level={2}>
        Account
      </Heading>
      <Text>Voor de spellen heb je een account nodig. Een account is een schermnaam en een e-mailadres.</Text>
      <List role="list">
        <List.Item>Je hebt geen wachtwoord. Je logt in met een link en een code die we je mailen.</List.Item>
        <List.Item>
          Anderen zien je schermnaam en je punten in de standen. Dat kun je uitzetten op{' '}
          <Link href={`${fansPath}/mijn-account`}>Mijn account</Link>.
        </List.Item>
        <List.Item>Op Mijn account log je ook uit en kun je je account opheffen.</List.Item>
      </List>
      <Text>
        Wat we bewaren, lees je bij <Link href="/privacy#account">Privacy</Link>.
      </Text>
    </Card>
  )
}

/** The card of the game Fjouwer, with its watermark. */
export function FjouwerRulesCard() {
  return (
    <Card aria-labelledby="fjouwer" game="fjouwer">
      <Heading anchor id="fjouwer" level={2}>
        Fjouwer
      </Heading>
      <Text>Kies vier spelers van sc Heerenveen 1. Wat zij in de wedstrijd doen, levert punten op.</Text>
      <Heading level={3}>Zo kies je</Heading>
      <List role="list">
        <List.Item>
          {`Je kiest ${picksPerMatch} spelers uit de selectie, hoogstens ${maxPerLine} per linie: doelman, verdediger, middenvelder en aanvaller.`}
        </List.Item>
        <List.Item>
          Je kunt je keuze wijzigen tot de aftrap. Is de aanvangstijd nog niet bekend, dan sluit het kiezen om 00.00 uur
          op de dag van de wedstrijd.
        </List.Item>
        <List.Item>Kies je niets, dan houd je de vier van de vorige wedstrijd.</List.Item>
        <List.Item>
          {`Een speler mag in hoogstens ${maxUsesPerSeason} wedstrijden per seizoen meespelen in jouw vier. Daarna scoort hij voor jou niets meer.`}
        </List.Item>
        <List.Item>Een speler die niet speelt, scoort niets. Je krijgt geen vervanger.</List.Item>
      </List>
      <Heading level={3}>Zo tellen de punten</Heading>
      <DataTable
        caption="Wat een speler oplevert"
        columns={['Onderdeel', 'Punten']}
        rows={scoringRows.map((row) => ({ cells: [pointsText(row.points)], header: row.header }))}
        sortable={false}
      />
      <Text>Het totaal van je vier is de som van de punten van de vier spelers. Dat kan negatief zijn.</Text>
      <Heading level={3}>Wat niet telt, en wat opvalt</Heading>
      <List role="list">
        <List.Item>Een strafschop in een beslissende reeks telt niet, ook niet als assist.</List.Item>
        <List.Item>De verlenging telt wel mee, voor doelpunten en voor minuten.</List.Item>
        <List.Item>
          Blessuretijd telt niet als minuten: een wedstrijd duurt voor de minuten 90, met verlenging 120.
        </List.Item>
        <List.Item>
          Een rode kaart na twee gele kaarten geeft −8 en niet −11: de rode kaart komt in de plaats van de gele.
        </List.Item>
        <List.Item>
          &quot;Geen tegendoelpunt&quot; kijkt naar de hele wedstrijd, ook als je speler al was gewisseld. Een eigen
          doelpunt van onze club telt als tegendoelpunt.
        </List.Item>
      </List>
      <Heading level={3}>Het verslag beslist</Heading>
      <Text>
        De punten komen uit het verslag van de wedstrijd dat de redactie maakt. Een assist is het oordeel van de bron
        die zij gebruikt. De punten verschijnen als het verslag klaar is, en een correctie in het verslag corrigeert ook
        je punten.
      </Text>
      <Heading level={3}>Voorbeelden</Heading>
      <Text>Een hele wedstrijd: vier spelers die samen 40 punten halen.</Text>
      <ExampleTable caption="Voorbeeld: een hele wedstrijd" examples={fullMatchExample} total />
      <Text>Kaarten: een rode kaart vervangt de gele, en het totaal van een speler kan onder nul komen.</Text>
      <ExampleTable caption="Voorbeeld: kaarten" examples={cardExamples} />
      <Text>
        Minuten en tegendoelpunten: de grens van 60 minuten telt, en een invaller die niet speelt krijgt niets.
      </Text>
      <ExampleTable caption="Voorbeeld: minuten en tegendoelpunten" examples={minutesExamples} />
      <Heading level={3}>De stand</Heading>
      <Text>
        De stand telt per seizoen en alleen de wedstrijden met een klaar verslag. Je naam staat alleen in een stand als
        je dat wilt: dat zet je aan of uit op <Link href={`${fansPath}/mijn-account`}>Mijn account</Link>.
      </Text>
    </Card>
  )
}

/** The card of the game Prognose, with its watermark. */
export function PredictionRulesCard() {
  return (
    <Card aria-labelledby="prognose" game="prognose">
      <Heading anchor id="prognose" level={2}>
        Prognose
      </Heading>
      <Text>Voorspel de ruststand en de eindstand van de volgende wedstrijd.</Text>
      <List role="list">
        <List.Item>
          Je voorspelt de eerstvolgende wedstrijd van sc Heerenveen 1: competitie, beker, play-offs en Europa. Een
          oefenwedstrijd telt niet.
        </List.Item>
        <List.Item>Je kunt je voorspelling wijzigen tot de aftrap. Daarna staat hij vast.</List.Item>
        <List.Item>
          De eindstand is de stand na 90 minuten plus blessuretijd, ook bij een wedstrijd met verlenging.
        </List.Item>
        <List.Item>Er zijn geen prijzen. Bij een onenigheid beslist de redactie.</List.Item>
      </List>
      <Heading level={3}>Zo tellen de punten</Heading>
      <ScoringTable caption="Punten per onderdeel" />
      <Text>{`Een perfecte voorspelling is ${maxPredictionPoints} punten waard. Het doelsaldo levert niets op.`}</Text>
      <Heading level={3}>Een voorbeeld</Heading>
      <DataTable
        caption={`Voorbeeld: de ruststand was ${scoreText(exampleResult.halfTime)} en de eindstand ${scoreText(exampleResult.fullTime)}`}
        columns={[
          'Jij',
          { abbreviation: 'R', name: 'punten voor de ruststand' },
          { abbreviation: 'E', name: 'punten voor de eindstand' },
          { abbreviation: 'P', key: true, name: 'totaal punten' },
        ]}
        rows={examplePoints.map(({ fullTime, guess, halfTime, total }) => ({
          cells: [halfTime, fullTime, total],
          header: `${scoreText(guess.halfTime)}, ${scoreText(guess.fullTime)}`,
        }))}
        sortable={false}
      />
      <Text appearance="meta">
        Jij: je voorspelling, rust en eind. R: punten voor de rust. E: punten voor de eind. P: totaal.
      </Text>
      <Heading level={3}>De stand</Heading>
      <Text>
        De <Link href={`${fansPath}/prognose/stand`}>stand</Link> is er per seizoen en per wedstrijd. {tieRule}
      </Text>
    </Card>
  )
}

/** The short card of the game Uitblinker, with its watermark. */
export function RatingRulesCard() {
  return (
    <Card aria-labelledby="uitblinker" game="uitblinker">
      <Heading anchor id="uitblinker" level={2}>
        Uitblinker
      </Heading>
      <Text>Geef de spelers na een wedstrijd een cijfer. Wie het hoogst scoort, is de uitblinker.</Text>
      <List role="list">
        <List.Item>
          Je geeft elke speler die 30 minuten of meer speelde een cijfer van 1 tot 10, en ook de trainer. Je geeft ze
          allemaal, anders slaan we niets op.
        </List.Item>
        <List.Item>
          Het kan zodra het verslag van de wedstrijd klaar is, tot de volgende aftrap en hoogstens zeven dagen. Je kunt
          je cijfers in die tijd wijzigen.
        </List.Item>
        <List.Item>
          De uitblinker is de speler met het hoogste gemiddelde. Een speler telt mee vanaf 5 cijfers. De trainer is
          nooit de uitblinker.
        </List.Item>
      </List>
    </Card>
  )
}

/** The table of one worked example of Fjouwer: each player with what counted, and the total. */
function ExampleTable({
  caption,
  examples,
  total,
}: {
  caption: string
  examples: readonly FantasyExample[]
  total?: boolean
}) {
  const worked = examples.map((example) => {
    const points = fantasyPoints(exampleFacts(example.facts))

    return {
      example,
      reasons: points?.lines.map((line) => `${line.reason} (${pointsText(line.points)})`).join(', ') || 'Niets',
      total: points?.total ?? 0,
    }
  })

  return (
    <DataTable
      caption={caption}
      columns={['Speler', 'Wat telde', 'Punten']}
      rows={[
        ...worked.map(({ example, reasons, total: points }) => ({
          cells: [reasons, pointsText(points)],
          header: example.name,
        })),
        ...(total
          ? [{ cells: ['', pointsText(worked.reduce((sum, row) => sum + row.total, 0))], header: 'Samen', total: true }]
          : []),
      ]}
      sortable={false}
    />
  )
}
