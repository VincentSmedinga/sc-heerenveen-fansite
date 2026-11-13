import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { Text } from '../text/Text'
import { ShortMatch, type ShortMatchProps } from './ShortMatch'

const meta = preview.meta({
  argTypes: {
    dateTime: { description: 'De dag voor machines, zoals "2026-10-24".' },
    goalsAgainst: { description: 'De doelpunten van de tegenstander, ook bij een uitwedstrijd.' },
    goalsFor: { description: 'De doelpunten van sc Heerenveen, ook bij een uitwedstrijd.' },
    home: { description: 'Of sc Heerenveen thuis speelde, en dus welke club vooraan staat.' },
    opponent: { description: 'De naam van de tegenstander.' },
    penaltiesAgainst: { description: 'De strafschoppen van de tegenstander, samen met `penaltiesFor`.' },
    penaltiesFor: { description: 'De strafschoppen van sc Heerenveen, samen met `penaltiesAgainst`.' },
    time: { description: 'De dag zoals een bezoeker hem leest, zoals "za 24 okt".' },
  },
  component: ShortMatch,
  parameters: {
    docs: {
      description: {
        component: [
          'Een gespeelde wedstrijd van sc Heerenveen 1 als korte regel in een lijst: de dag en de twee clubs met de uitslag ertussen, zoals "za 24 okt sc Heerenveen 3–0 Testdorp FC". De thuisclub staat altijd eerst, en de volgorde zegt dus of het thuis of uit was.',
          'Kies hem voor een selectie die op een eigenschap uit de wedstrijden kiest, zoals de wedstrijden waarin we de nul hielden; voor een volledige lijst, zoals een seizoen, kies je `Match`.',
          'De uitslag heeft de kleur van de uitkomst voor sc Heerenveen, en de cijfers zijn nooit alleen kleur. Een bekerwedstrijd die op strafschoppen is beslist, krijgt de kleur van de serie.',
          'Zet hem in een `List.Item` met `role="list"` op de `List`, in een `Card` onder een kop van niveau 2. Hij is gebouwd uit `Time` en de uitkomst (`outcomeOf`) die ook `Match` gebruikt.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/ShortMatch',
})

// Made-up clubs and days, like the data of the seed.
const shortList = [
  { dateTime: '2026-10-24', goalsAgainst: 0, goalsFor: 3, home: true, opponent: 'Testdorp FC', time: 'za 24 okt' },
  {
    dateTime: '2026-10-17',
    goalsAgainst: 0,
    goalsFor: 1,
    home: false,
    opponent: 'Voorbeeld United',
    time: 'za 17 okt',
  },
  { dateTime: '2026-10-04', goalsAgainst: 0, goalsFor: 0, home: true, opponent: 'Proefstad SV', time: 'zo 4 okt' },
] as const

// A long name at either end of the line: first when we play away, last when we play at home.
const longNames = [
  {
    dateTime: '2026-09-20',
    goalsAgainst: 0,
    goalsFor: 2,
    home: false,
    opponent: 'Koninklijke Sportvereniging Proefdorp-Nepstad-Voorbeeldhoek Combinatie',
    time: 'zo 20 sep',
  },
  {
    dateTime: '2026-09-13',
    goalsAgainst: 1,
    goalsFor: 1,
    home: true,
    opponent: 'Koninklijke Sportvereniging Proefdorp-Nepstad-Voorbeeldhoek Combinatie',
    time: 'zo 13 sep',
  },
] as const

const renderCard = (matches: readonly ShortMatchProps[]) => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="nul-kop">
      <Heading id="nul-kop" level={2}>
        De nul gehouden
      </Heading>
      <Text>{`${matches.length} keer de nul gehouden in 11 wedstrijden`}</Text>
      <List role="list">
        {matches.map((match) => (
          <List.Item key={match.dateTime}>
            <ShortMatch {...match} />
          </List.Item>
        ))}
      </List>
    </Card>
  </div>
)

// Lines with a name above the match, as the card Uitersten has them. The dot is for the eye.
const renderNamed = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="uitersten-kop">
      <Heading id="uitersten-kop" level={2}>
        Uitersten
      </Heading>
      <List role="list">
        {shortList.map((match, index) => (
          <List.Item key={match.dateTime}>
            <Text appearance="meta">
              {index === 0 ? (
                'Grootste overwinning'
              ) : (
                <>
                  Vroegste doelpunt <span aria-hidden="true">·</span> minuut {index + 2}{' '}
                  <span aria-hidden="true">·</span> Proefman
                </>
              )}
            </Text>
            <ShortMatch {...match} />
          </List.Item>
        ))}
      </List>
    </Card>
  </div>
)

const renderLongName = () => renderCard([...shortList, ...longNames])

// Each outcome, home and away. The colour is from the side of sc Heerenveen: 0–2 away is a win.
const outcomes = [
  { dateTime: '2026-10-24', goalsAgainst: 0, goalsFor: 3, home: true, opponent: 'Testdorp FC', time: 'za 24 okt' },
  { dateTime: '2026-10-17', goalsAgainst: 2, goalsFor: 0, home: true, opponent: 'Voorbeeld United', time: 'za 17 okt' },
  { dateTime: '2026-10-10', goalsAgainst: 1, goalsFor: 1, home: false, opponent: 'Proefstad SV', time: 'za 10 okt' },
  { dateTime: '2026-10-07', goalsAgainst: 0, goalsFor: 0, home: true, opponent: 'Nepstad United', time: 'wo 7 okt' },
  { dateTime: '2026-10-03', goalsAgainst: 0, goalsFor: 2, home: false, opponent: 'Nepdorp FC', time: 'za 3 okt' },
  {
    dateTime: '2026-09-26',
    goalsAgainst: 3,
    goalsFor: 1,
    home: false,
    opponent: 'Voorbeeldstad BV',
    time: 'za 26 sep',
  },
] as const

const renderOutcomes = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="uitkomsten-kop">
      <Heading id="uitkomsten-kop" level={2}>
        Wedstrijden tegen Testdorp FC
      </Heading>
      <List role="list">
        {outcomes.map((match) => (
          <List.Item key={match.dateTime}>
            <ShortMatch {...match} />
          </List.Item>
        ))}
      </List>
    </Card>
  </div>
)

// The same list on each surface a card has on the pages, since the colours must hold on all.
const surfaces = [
  { name: 'Wit vlak', surface: 'default' },
  { name: 'Zacht vlak', surface: 'soft' },
  { name: 'Warm vlak', surface: 'warm' },
  { name: 'Sterk vlak', surface: 'strong' },
] as const

const renderSurfaces = () => (
  <div style={{ display: 'grid', gap: '1rem', maxInlineSize: '20rem' }}>
    {surfaces.map(({ name, surface }) => (
      <Card aria-labelledby={`vlak-${surface}`} key={surface} surface={surface}>
        <Heading id={`vlak-${surface}`} level={2}>
          {name}
        </Heading>
        <List role="list">
          {outcomes.slice(0, 3).map((match) => (
            <List.Item key={match.dateTime}>
              <ShortMatch {...match} />
            </List.Item>
          ))}
        </List>
      </Card>
    ))}
  </div>
)

export const Default = meta.story({
  args: { ...shortList[0] },
  name: 'Wedstrijd',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <ShortMatch {...args} />
    </div>
  ),
})

export const Outcomes = meta.story({
  name: 'Winst, verlies en gelijkspel onder elkaar',
  render: renderOutcomes,
})

const renderShootOut = () => (
  <Card>
    <Heading level={2}>Na strafschoppen</Heading>
    <List role="list">
      <List.Item>
        <ShortMatch
          dateTime="2026-10-28"
          goalsAgainst={1}
          goalsFor={1}
          home
          opponent="Testdorp FC"
          penaltiesAgainst={3}
          penaltiesFor={4}
          time="wo 28 okt"
        />
      </List.Item>
      <List.Item>
        <ShortMatch
          dateTime="2026-02-04"
          goalsAgainst={2}
          goalsFor={2}
          home={false}
          opponent="Voorbeeld United"
          penaltiesAgainst={5}
          penaltiesFor={4}
          time="wo 4 feb"
        />
      </List.Item>
    </List>
  </Card>
)

export const ShootOut = meta.story({
  name: 'Na strafschoppen, gewonnen en verloren',
  render: renderShootOut,
})

export const Surfaces = meta.story({
  name: 'Op elk vlak van een kaart',
  render: renderSurfaces,
})

export const Named = meta.story({
  name: 'Met een naam boven de wedstrijd',
  render: renderNamed,
})

export const LongName = meta.story({
  name: 'Een lange naam van een tegenstander',
  render: renderLongName,
})
