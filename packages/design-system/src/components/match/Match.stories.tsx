import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { WikipediaCredit } from '../wikipedia-credit/WikipediaCredit'
import { Match } from './Match'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een wedstrijd van sc Heerenveen 1, als regel in een lijst.',
          'Bovenaan staan de competitie en de ronde, daaronder de twee clubs met de uitslag ertussen, en onderaan wanneer en waar.',
          '',
          'De clubs staan in de volgorde van de aankondiging: de thuisclub eerst.',
          'De regel zegt ook "Thuis" of "Uit", dus een bezoeker hoeft het niet af te leiden uit de volgorde.',
          'Een gespeelde wedstrijd heeft de uitslag tussen de namen, gezien vanaf de thuisclub: "2–0".',
          'Een schermlezer hoort "2 tegen 0".',
          'Een wedstrijd die nog moet komen heeft een streepje tussen de namen, dat een schermlezer als "tegen" leest.',
          'De rij van sc Heerenveen zelf is het zwaarst gedrukt, zodat onze club opvalt zonder dat kleur het enige is.',
          '',
          'De tijd is een `Time`.',
          'Je geeft de tekst zoals een bezoeker hem leest, in Nederlandse tijd, en in `dateTime` de waarde voor machines.',
          'Dat is de aftrap, bijvoorbeeld "zo 1 nov 14:30", of de dag, bijvoorbeeld "zo 25 okt", bij een uitslag.',
          'Is de aftrap nog niet bekend, dan staat er het weekend, zoals "weekend 12–14 februari", en `dateTime` is de eerste dag.',
          'Bij een uitgestelde wedstrijd staat er "Uitgesteld" in plaats van een tijd.',
          '',
          '- `competition`, `round` en `opponent` zijn gewone tekst, zoals de bron ze heeft.',
          '- `home` zegt of sc Heerenveen thuis speelt.',
          '- `status` is `scheduled`, `played` of `postponed`.',
          '  Een gespeelde wedstrijd heeft `goalsFor` en `goalsAgainst`, een andere heeft ze niet.',
          '- `stadium` is het stadion.',
          '  Zonder stadion zegt de regel alleen of de wedstrijd thuis is.',
          '',
          'Een wedstrijd heeft geen eigen pagina, dus er is geen link, en geen clubwapen: alleen de namen.',
          'Het component is een `div`.',
          'Zet hem in een `List.Item` voor een lijst met wedstrijden, en geef de `List` `role="list"`: Safari noemt een lijst zonder opsommingstekens anders geen lijst meer.',
          'De lijst krijgt dan geen opsommingstekens en geen inspringing, en tussen de regels staat een dunne lijn.',
          'Zet de lijst in een `Card`, onder een kop van niveau 2.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Match',
})

// The block as the homepage has it, in the width of the sidebar: the previous and the next
// match. The clubs, the dates and the stadiums are made up, like the data of the seed.
const renderBlock = (maxInlineSize: string) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="wedstrijden-kop">
      <Heading id="wedstrijden-kop" level={2}>
        Wedstrijden
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-10-25"
            goalsAgainst={0}
            goalsFor={1}
            home={false}
            opponent="Voorbeeld United"
            round="Speelronde 2"
            stadium="Voorbeeldpark"
            status="played"
            time="zo 25 okt"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-11-01T18:45:00Z"
            home
            opponent="Proefstad SV"
            round="Speelronde 3"
            stadium="Stadion Proeflaan"
            status="scheduled"
            time="zo 1 nov 19:45"
          />
        </List.Item>
      </List>
      <WikipediaCredit compact />
    </Card>
  </div>
)

const renderSidebar = renderBlock('20rem')

const renderNarrow = renderBlock('16rem')

// Every state a match can be in: still to be played with a kick-off and with only a weekend,
// played at home and away, called off, a cup tie, and a match without a stadium.
const renderStates = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="toestanden-kop">
      <Heading id="toestanden-kop" level={2}>
        Alle toestanden
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-11-04T18:45:00Z"
            home
            opponent="Proefstad SV"
            round="Speelronde 3"
            stadium="Stadion Proeflaan"
            status="scheduled"
            time="wo 4 nov 19:45"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2027-02-12"
            home={false}
            opponent="Nepstad Rangers"
            round="Speelronde 22"
            stadium="Nepstadion"
            status="scheduled"
            time="weekend 12–14 februari"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="KNVB Beker"
            dateTime="2026-11-10T19:00:00Z"
            home={false}
            opponent="SV Proefdorp"
            round="Tweede ronde"
            stadium="Sportpark Proefdorp"
            status="scheduled"
            time="di 10 nov 20:00"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            home
            opponent="Demo Boys"
            round="Speelronde 5"
            stadium="Stadion Proeflaan"
            status="postponed"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-10-18T16:45:00Z"
            goalsAgainst={0}
            goalsFor={2}
            home
            opponent="Testdorp FC"
            round="Speelronde 1"
            stadium="Stadion Proeflaan"
            status="played"
            time="zo 18 okt"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-10-25T18:45:00Z"
            goalsAgainst={3}
            goalsFor={1}
            home={false}
            opponent="Voorbeeld United"
            round="Speelronde 2"
            status="played"
            time="zo 25 okt"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Zijbalk, met de vorige en de volgende wedstrijd, licht',
  render: renderSidebar,
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Zijbalk, met de vorige en de volgende wedstrijd, donker',
  render: renderSidebar,
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Smalle kolom, licht',
  render: renderNarrow,
})

export const NarrowDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Smalle kolom, donker',
  render: renderNarrow,
})

export const StatesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Alle toestanden: gepland met en zonder aftrap, beker, uitgesteld, thuis en uit, gespeeld, licht',
  render: renderStates,
})

export const StatesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Alle toestanden: gepland met en zonder aftrap, beker, uitgesteld, thuis en uit, gespeeld, donker',
  render: renderStates,
})
