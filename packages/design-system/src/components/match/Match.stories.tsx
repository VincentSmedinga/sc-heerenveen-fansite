import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { Text } from '../text/Text'
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
          'De uitslag heeft de kleur van de uitkomst voor sc Heerenveen: groen bij winst, rood bij verlies en neutraal bij gelijkspel, ook in de beker zolang er geen strafschoppen zijn.',
          'Dat volgt uit de doelpunten van sc Heerenveen en niet uit die van de thuisclub: 0–2 uit is een winst en 2–0 uit een verlies.',
          'Een bekerwedstrijd na verlenging zegt "n.v." en na strafschoppen "n.s." met de score ervan, bijvoorbeeld "3–3 (5–3 n.s.)", direct achter de uitslag en in de volgorde van de clubs.',
          'Elke afkorting heeft de volle woorden in een `title`, en een schermlezer hoort de volle woorden na de uitslag: "1 tegen 1, na strafschoppen 4 tegen 3".',
          'Onder een lijst met zulke wedstrijden staat wat de afkortingen betekenen, want een `title` toont alleen onder een muis.',
          'Bij strafschoppen volgt de kleur de strafschoppen: groen als sc Heerenveen ze won en rood als het ze verloor.',
          '',
          'Een gespeelde wedstrijd kan de doelpuntenmakers tonen, in `goals`: één regel tussen de clubs en de tijd, op volgorde van de minuut met de doelpunten van beide clubs, zoals "34’ Trenskow, 45’+1 Vente, 80’ Van Bergen".',
          'De naam van de club staat er niet.',
          'De minuut is groen bij een doelpunt van sc Heerenveen en rood bij een doelpunt van de tegenstander, met dezelfde betekenis als de uitslag, en bij sc Heerenveen ook vet.',
          'Kleur is niet het enige teken: het vet blijft over in forced colours, en een schermlezer hoort per doelpunt de club: "minuut 45 plus 1, Vente, sc Heerenveen".',
          'Een eigen doelpunt staat bij de club die ervan profiteert, met "e.d." erachter, en een penalty heeft "pen." erachter.',
          'Beide zijn afkortingen met de volle woorden in een `title` en voor een schermlezer, en onder een lijst staat wat ze betekenen, want een `title` toont alleen onder een muis.',
          'Zonder doelpunten, of met een lege lijst, komt er geen regel en geen lege ruimte.',
          '',
          'De kleur is een aanvulling en nooit het enige teken: wie hem niet ziet, leest de uitkomst in de doelpunten zelf, dus er komt geen letter of woord bij.',
          'Een wedstrijd die nog moet komen heeft een streepje tussen de namen, dat een schermlezer als "tegen" leest.',
          'De rij van sc Heerenveen zelf is het zwaarst gedrukt, zodat onze club opvalt zonder dat kleur het enige is.',
          'Passen de twee clubs niet op één regel, dan breekt de regel in balans: de clubs komen ongeveer even lang over twee regels, en een naam blijft niet met één woord alleen over.',
          '',
          'De tijd is een `Time`.',
          'Je geeft de tekst zoals een bezoeker hem leest, in Nederlandse tijd, en in `dateTime` de waarde voor machines.',
          'Dat is de aftrap, bijvoorbeeld "zo 1 nov 14:30", of de dag, bijvoorbeeld "zo 25 okt", bij een uitslag.',
          'Is de aftrap nog niet bekend, dan staat er het weekend, zoals "weekend 12–14 februari", en `dateTime` is de eerste dag.',
          'Bij een uitgestelde wedstrijd staat er "Uitgesteld" in plaats van een tijd.',
          '',
          'Is een wedstrijd begonnen en is de uitslag er twee uur later nog niet, dan zet je `resultMissing`.',
          'Onderaan staat dan "Gegevens nog niet beschikbaar", onder de tijd en de plaats, in het rood van "Uitgesteld" maar niet vet.',
          'De tijd blijft staan.',
          'Het is een eerlijke melding van wat we niet weten, zonder gok naar de uitslag.',
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
  title: 'Patronen/Match',
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

// The block of the homepage when the previous match is over but has no result yet: a cup tie
// two hours after the kick-off, with the next match under it.
const renderSidebarMissing = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="wedstrijden-zonder-uitslag-kop">
      <Heading id="wedstrijden-zonder-uitslag-kop" level={2}>
        Wedstrijden
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            competition="KNVB Beker"
            dateTime="2026-10-28T19:00:00Z"
            home={false}
            opponent="Voorbeeld United"
            resultMissing
            round="Tweede ronde"
            stadium="Voorbeeldpark"
            status="scheduled"
            time="wo 28 okt 20:00"
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

// The outcomes seen from the side of sc Heerenveen: a win, a loss and a draw, each at home and
// away, and a level cup tie, which is neutral too. The clubs and the grounds are made up.
const results = [
  { away: [0, 2], competition: 'Eredivisie', home: [2, 0], round: 'Speelronde 1' },
  { away: [3, 1], competition: 'Eredivisie', home: [1, 3], round: 'Speelronde 2' },
  { away: [1, 1], competition: 'Eredivisie', home: [1, 1], round: 'Speelronde 3' },
  { away: [2, 2], competition: 'KNVB Beker', home: [2, 2], round: 'Tweede ronde' },
] as const

const renderResults = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="uitslagen-kop">
      <Heading id="uitslagen-kop" level={2}>
        Uitslagen
      </Heading>
      <List role="list">
        {results.flatMap(({ away, competition, home, round }) => [
          <List.Item key={`${round}-thuis`}>
            <Match
              competition={competition}
              dateTime="2026-10-18"
              goalsAgainst={home[1]}
              goalsFor={home[0]}
              home
              opponent="Proefstad SV"
              round={round}
              stadium="Stadion Proeflaan"
              status="played"
              time="zo 18 okt"
            />
          </List.Item>,
          <List.Item key={`${round}-uit`}>
            <Match
              competition={competition}
              dateTime="2026-10-25"
              goalsAgainst={away[0]}
              goalsFor={away[1]}
              home={false}
              opponent="Voorbeeld United"
              round={round}
              stadium="Voorbeeldpark"
              status="played"
              time="zo 25 okt"
            />
          </List.Item>,
        ])}
      </List>
    </Card>
  </div>
)

// Cup ties decided after extra time: a win after extra time away, a win on penalties at
// home, and a loss on penalties away. The legend under the list is what the site puts there.
const renderCup = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="beker-kop">
      <Heading id="beker-kop" level={2}>
        Beker
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            competition="KNVB Beker"
            dateTime="2026-11-25"
            extraTime
            goalsAgainst={1}
            goalsFor={2}
            home={false}
            opponent="Testdorp FC"
            round="Eerste ronde"
            stadium="Sportpark Proefdorp"
            status="played"
            time="wo 25 nov"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="KNVB Beker"
            dateTime="2026-12-02"
            extraTime
            goalsAgainst={1}
            goalsFor={1}
            home
            opponent="Voorbeeld United"
            penaltiesAgainst={3}
            penaltiesFor={4}
            round="Tweede ronde"
            stadium="Stadion Proeflaan"
            status="played"
            time="wo 2 dec"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="KNVB Beker"
            dateTime="2027-01-20"
            extraTime
            goalsAgainst={2}
            goalsFor={2}
            home={false}
            opponent="Proefstad SV"
            penaltiesAgainst={5}
            penaltiesFor={4}
            round="Achtste finale"
            stadium="Stadion Proeflaan"
            status="played"
            time="wo 20 jan"
          />
        </List.Item>
      </List>
      <Text appearance="meta">n.v. na verlenging, n.s. na strafschoppen</Text>
    </Card>
  </div>
)

// Played matches with their scorers: goals of one club only, of both, a penalty, an own goal,
// added time, a player with two goals, extra time and a very long name. The clubs and the
// players are made up, like the data of the seed.
const renderScorers = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="doelpunten-kop">
      <Heading id="doelpunten-kop" level={2}>
        Doelpuntenmakers
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-10-18"
            goals={[
              { minute: 34, ours: true, player: 'Proefman' },
              { minute: 45, ours: true, player: 'Nepper', stoppageMinutes: 1 },
              { minute: 80, ours: false, player: 'Teststraat' },
            ]}
            goalsAgainst={1}
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
            dateTime="2026-10-25"
            goals={[
              { minute: 12, ours: true, player: 'Proefman' },
              { minute: 77, ours: true, player: 'Proefman' },
            ]}
            goalsAgainst={0}
            goalsFor={2}
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
            dateTime="2026-11-01"
            goals={[
              { minute: 7, ours: false, ownGoal: true, player: 'Kopie' },
              { minute: 23, ours: false, penalty: true, player: 'Teststraat' },
              { minute: 90, ours: true, player: 'Nepper', stoppageMinutes: 4 },
            ]}
            goalsAgainst={2}
            goalsFor={1}
            home
            opponent="Proefstad SV"
            round="Speelronde 3"
            stadium="Stadion Proeflaan"
            status="played"
            time="zo 1 nov"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="KNVB Beker"
            dateTime="2026-11-25"
            extraTime
            goals={[
              { minute: 18, ours: true, penalty: true, player: 'Proefman' },
              { minute: 70, ours: false, player: 'Van der Voorbeeldstraat-Proefmans' },
              { minute: 105, ours: true, ownGoal: true, player: 'Kopie' },
            ]}
            goalsAgainst={1}
            goalsFor={2}
            home={false}
            opponent="Oefenstad FC"
            round="Eerste ronde"
            stadium="Sportpark Maquette"
            status="played"
            time="wo 25 nov"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-11-08"
            goalsAgainst={0}
            goalsFor={0}
            home
            opponent="Demo Boys"
            round="Speelronde 4"
            stadium="Stadion Proeflaan"
            status="played"
            time="zo 8 nov"
          />
        </List.Item>
      </List>
      <Text appearance="meta">e.d. eigen doelpunt, pen. penalty, n.v. na verlenging</Text>
    </Card>
  </div>
)

// Matches that have begun and have no result yet: one in the league, one in the cup, and one
// with a day and no kick-off. The clubs are made up, like the data of the seed.
const renderMissing = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="zonder-uitslag-kop">
      <Heading id="zonder-uitslag-kop" level={2}>
        Zonder uitslag
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-10-25T14:30:00Z"
            home
            opponent="Testdorp FC"
            resultMissing
            round="Speelronde 11"
            stadium="Stadion Proeflaan"
            status="scheduled"
            time="zo 25 okt 15:30"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="KNVB Beker"
            dateTime="2026-10-28T19:00:00Z"
            home={false}
            opponent="Voorbeeld United"
            resultMissing
            round="Tweede ronde"
            stadium="Voorbeeldpark"
            status="scheduled"
            time="wo 28 okt 20:00"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="KNVB Beker"
            dateTime="2026-10-24"
            home
            opponent="Proefstad SV"
            resultMissing
            round="Eerste ronde"
            status="scheduled"
            time="weekend 24–26 oktober"
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

export const ResultsLight = meta.story({
  globals: { theme: 'light' },
  name: 'Uitslagen: winst, verlies en gelijkspel, thuis en uit, licht',
  render: renderResults,
})

export const ResultsDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Uitslagen: winst, verlies en gelijkspel, thuis en uit, donker',
  render: renderResults,
})

export const CupLight = meta.story({
  globals: { theme: 'light' },
  name: 'Beker: na verlenging en na strafschoppen, licht',
  render: renderCup,
})

export const CupDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Beker: na verlenging en na strafschoppen, donker',
  render: renderCup,
})

export const ScorersLight = meta.story({
  globals: { theme: 'light' },
  name: 'Doelpuntenmakers: een of beide clubs, penalty, eigen doelpunt, blessuretijd, lange naam, licht',
  render: renderScorers,
})

export const ScorersDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Doelpuntenmakers: een of beide clubs, penalty, eigen doelpunt, blessuretijd, lange naam, donker',
  render: renderScorers,
})

export const MissingLight = meta.story({
  globals: { theme: 'light' },
  name: 'Zonder uitslag: gegevens nog niet beschikbaar, licht',
  render: renderMissing,
})

export const MissingDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Zonder uitslag: gegevens nog niet beschikbaar, donker',
  render: renderMissing,
})

export const SidebarMissingLight = meta.story({
  globals: { theme: 'light' },
  name: 'Zijbalk, de vorige wedstrijd zonder uitslag en de volgende, licht',
  render: renderSidebarMissing,
})

export const SidebarMissingDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Zijbalk, de vorige wedstrijd zonder uitslag en de volgende, donker',
  render: renderSidebarMissing,
})
