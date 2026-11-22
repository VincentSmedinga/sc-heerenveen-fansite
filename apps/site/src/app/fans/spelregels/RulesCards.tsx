import { Card, DataTable, Heading, Link, List, Text } from '@fansite/design-system'
import { maxPredictionPoints } from '@fansite/shared/prediction-points'

import { fansPath } from '#src/fans-paths'
import { examplePoints, exampleResult } from '#src/fans/prediction-rules'
import { scoreText } from '#src/fans/prediction-words'

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
      <ScoringTable caption="Punten per onderdeel" short />
      <Text appearance="meta">
        Precies: de stand precies goed. Uitslag: thuiswinst, gelijkspel of uitwinst goed. Eén: precies één van de twee
        doelpuntentallen goed.
      </Text>
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
