import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { MarkRow } from '../mark-row/MarkRow'
import { Text } from '../text/Text'
import { WikipediaCredit } from '../wikipedia-credit/WikipediaCredit'
import { Match } from './Match'

const meta = preview.meta({
  component: Match,
  parameters: {
    docs: {
      description: {
        component: [
          'Een wedstrijd van sc Heerenveen 1, als regel in een lijst: de dag en het stadion, de twee clubs met de uitslag ertussen, eventueel de doelpuntenmakers, en de competitie met de ronde.',
          'Kies hem voor een volledige lijst, zoals een seizoen of alle wedstrijden tegen één club; voor een selectie die op een eigenschap uit de wedstrijden kiest, kies je `ShortMatch`. Laat `competition` weg onder een kop die de competitie al noemt.',
          'De thuisclub staat eerst en de uitslag heeft de kleur van de uitkomst voor sc Heerenveen, nooit als enig teken. Een wedstrijd kan nog moeten komen, uitgesteld of geannuleerd zijn, live gaan, na verlenging of strafschoppen eindigen, of nog geen uitslag hebben.',
          'Zet hem in een `List.Item` met `role="list"` op de `List`, in een `Card` onder een kop van niveau 2. Hij is gebouwd uit `Time`, `Link` en `Text`, met de uitkomst die ook `ShortMatch` gebruikt.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/Match',
})

// The block as the homepage has it, in the width of the sidebar: the previous and the next
// match. The clubs, the dates and the stadiums are made up, like the data of the seed.
const renderSidebar = () => (
  <div style={{ maxInlineSize: '20rem' }}>
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
            home={false}
            opponent="Voorbeeld United"
            round="Speelronde 27"
            stadium="Voorbeeldpark"
            status="cancelled"
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

// Cup ties decided after extra time: a win away with the score after 90 minutes, a win on
// penalties at home without it, a loss on penalties away with a score after 90 minutes that
// equals the result, and a win at home without it. The legend under the list is what the site
// puts there.
const renderCup = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="beker-kop">
      <Heading id="beker-kop" level={2}>
        Beker
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            afterNinetyAgainst={1}
            afterNinetyFor={1}
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
            afterNinetyAgainst={2}
            afterNinetyFor={2}
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
        <List.Item>
          <Match
            competition="KNVB Beker"
            dateTime="2027-02-03"
            extraTime
            goalsAgainst={2}
            goalsFor={3}
            home
            opponent="Maquette FC"
            round="Kwartfinale"
            stadium="Abe Lenstra Stadion"
            status="played"
            time="wo 3 feb"
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
      <Text appearance="meta">e.d. eigen doelpunt, str. strafschop, n.v. na verlenging</Text>
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

// A match with a line under it, one without to compare, and one with the line under "Gegevens
// nog niet beschikbaar". The clubs and the stadiums are made up.
const renderNote = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="regel-eronder-kop">
      <Heading id="regel-eronder-kop" level={2}>
        Met een regel eronder
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-05-10"
            goalsAgainst={0}
            goalsFor={2}
            home={false}
            note="Gestaakt in minuut 82. Het restant is op 11 mei gespeeld in het Voorbeeldpark."
            opponent="Testdorp FC"
            round="Speelronde 33"
            stadium="Stadion Proeflaan"
            status="played"
            time="zo 10 mei"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-05-03"
            goalsAgainst={1}
            goalsFor={1}
            home
            opponent="Voorbeeld United"
            round="Speelronde 32"
            stadium="Voorbeeldpark"
            status="played"
            time="zo 3 mei"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-10-25T14:30:00Z"
            home
            note="Gestaakt in minuut 64. Het restant wordt op 28 oktober gespeeld in het Voorbeeldpark."
            opponent="Proefstad SV"
            resultMissing
            round="Speelronde 11"
            stadium="Voorbeeldpark"
            status="scheduled"
            time="zo 25 okt 15:30"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const Sidebar = meta.story({
  name: 'Zijbalk, met de vorige en de volgende wedstrijd',
  render: renderSidebar,
})

export const States = meta.story({
  name: 'Alle toestanden: gepland met en zonder aftrap, beker, uitgesteld, geannuleerd, thuis en uit, gespeeld',
  render: renderStates,
})

export const Results = meta.story({
  name: 'Uitslagen: winst, verlies en gelijkspel, thuis en uit',
  render: renderResults,
})

export const Cup = meta.story({
  name: 'Beker: na verlenging en na strafschoppen',
  render: renderCup,
})

export const Scorers = meta.story({
  name: 'Doelpuntenmakers: een of beide clubs, strafschop, eigen doelpunt, blessuretijd, lange naam',
  render: renderScorers,
})

export const Missing = meta.story({
  name: 'Zonder uitslag: gegevens nog niet beschikbaar',
  render: renderMissing,
})

export const WithNote = meta.story({
  name: 'Met een regel eronder: gestaakt en later uitgespeeld, zonder regel, en naast "Gegevens nog niet beschikbaar"',
  render: renderNote,
})

// Under a heading that names the competition, the first line starts with the round and the
// competition is left out. The clubs and the stadiums are made up.
const renderWithoutCompetition = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="uitslagen-beker-kop">
      <Heading id="uitslagen-beker-kop" level={2}>
        KNVB Beker
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            dateTime="2026-10-28"
            goalsAgainst={0}
            goalsFor={2}
            home
            opponent="Proefstad SV"
            round="Tweede ronde"
            stadium="Stadion Proeflaan"
            status="played"
            time="wo 28 okt"
          />
        </List.Item>
        <List.Item>
          <Match
            dateTime="2026-12-02"
            goalsAgainst={1}
            goalsFor={1}
            home={false}
            opponent="Voorbeeld United"
            round="Achtste finale"
            stadium="Voorbeeldpark"
            status="played"
            time="wo 2 dec"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const WithoutCompetition = meta.story({
  name: 'Zonder competitie: de ronde eerst, onder een kop die de competitie noemt',
  render: renderWithoutCompetition,
})

// A season that was stopped: the results list keeps the matches that were never played, in
// their round, and says "Geannuleerd" where a played match has its day. The clubs are made up.
const renderCancelled = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="uitslagen-geannuleerd-kop">
      <Heading id="uitslagen-geannuleerd-kop" level={2}>
        Uitslagen
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            competition="Eredivisie"
            home={false}
            opponent="Voorbeeld United"
            round="Speelronde 28"
            stadium="Voorbeeldpark"
            status="cancelled"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            home
            opponent="Testdorp FC"
            round="Speelronde 27"
            stadium="Stadion Proeflaan"
            status="cancelled"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-03-08"
            goalsAgainst={0}
            goalsFor={2}
            home
            opponent="Proefstad SV"
            round="Speelronde 26"
            stadium="Stadion Proeflaan"
            status="played"
            time="zo 8 mrt"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const Cancelled = meta.story({
  name: 'Geannuleerd: twee wedstrijden die nooit zijn gespeeld, onder een gespeelde',
  render: renderCancelled,
})

// A match with a report has a page of its own, and its line ends with the link. The club and
// the address are made up.
const renderWithReport = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="uitslagen-verslag-kop">
      <Heading id="uitslagen-verslag-kop" level={2}>
        Eredivisie
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            dateTime="2026-10-24"
            goalsAgainst={0}
            goalsFor={6}
            home
            opponent="Testdorp FC"
            reportHref="#verslag"
            round="Speelronde 1"
            stadium="Stadion Proeflaan"
            status="played"
            time="za 24 okt"
          />
        </List.Item>
        <List.Item>
          <Match
            dateTime="2026-10-17"
            goalsAgainst={1}
            goalsFor={1}
            home={false}
            opponent="Voorbeeld United"
            round="Speelronde 2"
            stadium="Voorbeeldpark"
            status="played"
            time="za 17 okt"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const WithReport = meta.story({
  name: 'Met een pagina: de regel eindigt met de link naar het verslag, de andere regel heeft geen link',
  render: renderWithReport,
})

// A match that is being played and has a page: the link says "Live", with no result.
const renderLive = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="live-kop">
      <Heading id="live-kop" level={2}>
        Eredivisie
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            dateTime="2026-11-01T13:30:00Z"
            home
            live
            opponent="Voorbeeld United"
            reportHref="#live"
            round="Speelronde 12"
            stadium="Stadion Proeflaan"
            status="scheduled"
            time="zo 1 nov 14:30"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const Live = meta.story({
  name: 'Wordt gespeeld: de regel eindigt met de link "Live", zonder uitslag',
  render: renderLive,
})

// The goals of an old match: the minute of one goal is not known, so its line has a dash.
const renderGoalWithoutMinute = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="uitslagen-oud-kop">
      <Heading id="uitslagen-oud-kop" level={2}>
        Eredivisie
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            dateTime="1998-05-02"
            goals={[
              { minute: 14, ours: true, player: 'Demo' },
              { minute: null, ours: false, player: 'Dummydijk' },
              { minute: null, ours: true, player: 'Monster' },
            ]}
            goalsAgainst={1}
            goalsFor={2}
            home
            opponent="Voorbeeld United"
            round="Speelronde 34"
            stadium="Stadion Proeflaan"
            status="played"
            time="za 2 mei"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const GoalWithoutMinute = meta.story({
  name: 'Een doelpunt zonder minuut: een streepje in de kleur van de club',
  render: renderGoalWithoutMinute,
})

// The referee ends the last line of a played match; the next match has small lines of its own
// under the clubs. The clubs and the referee are made up.
const renderRefereeAndExtra = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="wedstrijden-extra-kop">
      <Heading id="wedstrijden-extra-kop" level={2}>
        Wedstrijden
      </Heading>
      <List role="list">
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-10-25"
            goalsAgainst={1}
            goalsFor={2}
            home
            opponent="Voorbeeld United"
            referee="Pieter Maquette"
            round="Speelronde 2"
            stadium="Stadion Proeflaan"
            status="played"
            time="zo 25 okt"
          />
        </List.Item>
        <List.Item>
          <Match
            competition="Eredivisie"
            dateTime="2026-11-08T11:15:00Z"
            extra={
              <>
                <Text appearance="meta">Vorige keer: 12 apr 2026, 2–1</Text>
                <MarkRow
                  marks={[
                    { label: 'winst', mark: 'W', tone: 'positive' },
                    { label: 'gelijk', mark: 'G', tone: 'neutral' },
                    { label: 'verlies', mark: 'V', tone: 'negative' },
                    { label: 'winst', mark: 'W', tone: 'positive' },
                    { label: 'gelijk', mark: 'G', tone: 'neutral' },
                  ]}
                  title="Vorm Testdorp FC"
                />
              </>
            }
            home={false}
            opponent="Testdorp FC"
            round="Speelronde 3"
            stadium="Voorbeeldpark"
            status="scheduled"
            time="zo 8 nov 12:15"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const WithRefereeAndExtra = meta.story({
  name: 'Met de scheidsrechter na de ronde, en kleine regels onder de clubs',
  render: renderRefereeAndExtra,
})
