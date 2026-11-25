import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Match } from '../match/Match'
import { PlayerName } from '../player-name/PlayerName'
import { Text } from '../text/Text'
import { DescriptionList } from './DescriptionList'

const meta = preview.meta({
  component: DescriptionList,
  parameters: {
    docs: {
      description: {
        component: [
          'Een beschrijvingslijst zet een paar korte feiten naast elkaar als paren van een term en een omschrijving, zoals de competitie en het stadion van een wedstrijd.',
          'Kies hem voor feiten die elk een naam hebben; een rij dingen zonder naam is een `List`, en cijfers in kolommen zijn een `DataTable`.',
          'De omschrijving heeft het gewicht van gewone tekst: de kleine, grijze term onderscheidt hem al. Alleen in de variant met de term links en de waarde rechts is de waarde een getal aan het eind van een rij, en dus op het gewicht van een getal.',
          'Onder elkaar staat boven elk paar een dunne lijn, ook boven het eerste, met de krappe maat van de meeste lijsten.',
          'Kies hem onder elkaar voor een naam boven een waarde, ook als de waarde een zin, een speler of een wedstrijd is: zo hoort een schermlezer wat bij elkaar hoort. Zet een waarde in de maat van gewone tekst in een `Text`, en geef een paar dat niets te tonen heeft, zoals "Nog geen", de eigenschap `empty`. `ShortFact` is er voor een regel zonder naam.',
          'Elk paar is een `DescriptionList.Item`, dat alleen in een beschrijvingslijst werkt.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/DescriptionList',
})

export const Default = meta.story({
  name: 'Beschrijvingslijst',
  render: (args) => (
    <DescriptionList {...args}>
      <DescriptionList.Item term="Competitie">Eredivisie</DescriptionList.Item>
      <DescriptionList.Item term="Ronde">Speelronde 1</DescriptionList.Item>
      <DescriptionList.Item term="Stadion">Stadion Proeflaan</DescriptionList.Item>
    </DescriptionList>
  ),
})

export const TwoFacts = meta.story({
  name: 'Twee feiten met een langere omschrijving',
  render: () => (
    <DescriptionList>
      <DescriptionList.Item term="Hoogste">plek 2, ronde 6–7 en 10–14</DescriptionList.Item>
      <DescriptionList.Item term="Laagste">plek 11, ronde 20</DescriptionList.Item>
    </DescriptionList>
  ),
})

export const Stacked = meta.story({
  name: 'Onder elkaar, voor een zijkolom',
  render: () => (
    <DescriptionList stacked>
      <DescriptionList.Item term="Eerste doelpunt">
        4 februari 2003, uit bij Stormvogels Telstar (1–3)
      </DescriptionList.Item>
      <DescriptionList.Item term="Vaakst bediend door">Richard Knopper, 3 assists</DescriptionList.Item>
    </DescriptionList>
  ),
})

export const Aligned = meta.story({
  name: 'Naam links, waarde rechts, voor een zijkolom',
  render: () => (
    <DescriptionList aligned stacked>
      <DescriptionList.Item term="Spelers">28</DescriptionList.Item>
      <DescriptionList.Item term="Gemiddelde leeftijd">24,3 jaar</DescriptionList.Item>
      <DescriptionList.Item term="Landen">11</DescriptionList.Item>
    </DescriptionList>
  ),
})

export const Records = meta.story({
  name: 'Namen boven een waarde in tekstmaat, met een leeg paar',
  render: () => (
    <DescriptionList stacked>
      <DescriptionList.Item empty term="Hattricks">
        <Text>Nog geen</Text>
      </DescriptionList.Item>
      <DescriptionList.Item term="Dubbelslagen">
        <Text>
          <PlayerName givenName="Testspeler" surname="Een" /> 2×, <PlayerName givenName="Testspeler" surname="Twee" />
        </Text>
      </DescriptionList.Item>
      <DescriptionList.Item term="Strafschoppen">
        <Text>1 van de 17 doelpunten</Text>
      </DescriptionList.Item>
    </DescriptionList>
  ),
})

export const WithMatches = meta.story({
  name: 'Met een wedstrijd als omschrijving',
  render: () => (
    <DescriptionList stacked>
      <DescriptionList.Item term="Grootste overwinning">
        <Match
          dateTime="2026-10-25"
          goalsAgainst={0}
          goalsFor={6}
          home
          opponent="Voorbeeld United"
          round="Speelronde 2"
          status="played"
          time="zo 25 okt"
        />
      </DescriptionList.Item>
      <DescriptionList.Item term="Langste reeks zonder nederlaag">
        <p>12 wedstrijden, 2015/16</p>
      </DescriptionList.Item>
    </DescriptionList>
  ),
})
