import preview from '#.storybook/preview'

import { Button } from '../button/Button'
import { Card } from '../card/Card'
import { Form } from '../form/Form'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { Text } from '../text/Text'
import { ShortMatch } from './ShortMatch'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een gespeelde wedstrijd van sc Heerenveen 1 als korte regel in een lijst: de dag, de tegenstander met "thuis" of "uit", en de uitslag vanuit onze kant, zoals "za 24 okt Testdorp FC · thuis 3–0".',
          'Het is voor een lijst die over onze club gaat, zoals de wedstrijden waarin we de nul hielden of de wedstrijden tegen één club.',
          'Onze eigen naam staat dus niet in de regel.',
          '',
          'De uitslag heeft de kleur van de uitkomst voor sc Heerenveen, zoals in een `Match`: groen bij winst, rood bij verlies en neutraal bij gelijkspel, thuis en uit.',
          'De uitkomst volgt uit `goalsFor` en `goalsAgainst`, met dezelfde regel als `Match`, dus er is geen eigenschap voor.',
          'De kleur is nooit het enige teken: de cijfers zijn de uitslag, ze staan in een zwaarder gewicht, en een schermlezer hoort de uitslag als "3 tegen 0".',
          'In geforceerde kleuren vervangt de browser de kleur en blijft het gewicht.',
          'Een bekerwedstrijd die op strafschoppen is beslist, staat hier als gelijkspel, want het onderdeel kent de strafschoppen niet.',
          '',
          'De regel heeft geen competitie, ronde, stadion, tijd of doelpuntenmakers: dat is een `Match`.',
          '- `time` is de dag zoals een bezoeker hem leest, zoals "za 24 okt", en `dateTime` is de waarde voor machines, zoals "2026-10-24".',
          '- `home` zegt of sc Heerenveen thuis speelde.',
          '- `goalsFor` zijn de doelpunten van sc Heerenveen, `goalsAgainst` die van de tegenstander.',
          '',
          'De regel past op één regel en breekt op een smalle plek: de uitslag gaat dan naar de volgende regel voordat een naam wordt afgebroken.',
          'Een lange naam breekt in plaats van de pagina zijwaarts te laten scrollen.',
          'Het component is een `div`.',
          'Zet hem in een `List.Item` en geef de `List` `role="list"`: Safari noemt een lijst zonder opsommingstekens anders geen lijst meer.',
          'Tussen de regels staat een dunne lijn.',
          'Een regel kan een naam boven de wedstrijd hebben, zoals "Grootste overwinning", als toelichting (`Text` met `appearance="meta"`) in dezelfde `List.Item`, vóór `ShortMatch`.',
          'De lijn staat dan boven de naam en niet ertussen, en de naam staat dicht bij zijn wedstrijd.',
          'Een schermlezer leest eerst de naam.',
          'Zet de lijst in een `Card`, onder een kop van niveau 2.',
        ].join('\n'),
      },
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

const longName = {
  dateTime: '2026-09-20',
  goalsAgainst: 0,
  goalsFor: 2,
  home: false,
  opponent: 'Koninklijke Sportvereniging Proefdorp-Nepstad-Voorbeeldhoek Combinatie',
  time: 'zo 20 sep',
} as const

const renderCard = (
  matches: readonly (typeof shortList)[number][] | readonly [...typeof shortList, typeof longName],
) => (
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

const renderShort = () => renderCard(shortList)

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

const renderLongName = () => renderCard([...shortList, longName])

// Ten lines and the button under them, as the page has it when there are more.
const renderWithButton = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="nul-meer-kop">
      <Heading id="nul-meer-kop" level={2}>
        De nul gehouden
      </Heading>
      <Text>12 keer de nul gehouden in 20 wedstrijden</Text>
      <List role="list">
        {Array.from({ length: 10 }, (_, index) => (
          <List.Item id={`nul-${index + 1}`} key={index}>
            <ShortMatch
              dateTime={`2026-10-${String(24 - index).padStart(2, '0')}`}
              goalsAgainst={0}
              goalsFor={1 + (index % 3)}
              home={index % 2 === 0}
              opponent={`Proefclub ${index + 1}`}
              time={`za ${24 - index} okt`}
            />
          </List.Item>
        ))}
      </List>
      <Form action="/wedstrijden#nul-11" method="get">
        <Button appearance="soft" icon="plus" name="nul" type="submit" value="15">
          Laad 5 meer
        </Button>
      </Form>
    </Card>
  </div>
)

const renderNone = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="nul-geen-kop">
      <Heading id="nul-geen-kop" level={2}>
        De nul gehouden
      </Heading>
      <Text>Nog niet de nul gehouden dit seizoen.</Text>
    </Card>
  </div>
)

// Each outcome, home and away, from the side of sc Heerenveen: 0–2 away is a win.
const outcomes = [
  { dateTime: '2026-10-24', goalsAgainst: 0, goalsFor: 3, home: true, opponent: 'Testdorp FC', time: 'za 24 okt' },
  { dateTime: '2026-10-17', goalsAgainst: 2, goalsFor: 0, home: true, opponent: 'Voorbeeld United', time: 'za 17 okt' },
  { dateTime: '2026-10-10', goalsAgainst: 1, goalsFor: 1, home: false, opponent: 'Proefstad SV', time: 'za 10 okt' },
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
const surfaces = ['default', 'soft', 'warm', 'strong'] as const

const renderSurfaces = () => (
  <div style={{ display: 'grid', gap: '1rem', maxInlineSize: '20rem' }}>
    {surfaces.map((surface) => (
      <Card aria-labelledby={`vlak-${surface}`} key={surface} surface={surface}>
        <Heading id={`vlak-${surface}`} level={2}>
          {`Vlak ${surface}`}
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

export const OutcomesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Winst, verlies en gelijkspel onder elkaar, licht',
  render: renderOutcomes,
})

export const OutcomesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Winst, verlies en gelijkspel onder elkaar, donker',
  render: renderOutcomes,
})

export const SurfacesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Op elk vlak van een kaart, licht',
  render: renderSurfaces,
})

export const SurfacesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Op elk vlak van een kaart, donker',
  render: renderSurfaces,
})

export const ShortLight = meta.story({
  globals: { theme: 'light' },
  name: 'Korte lijst, thuis en uit, licht',
  render: renderShort,
})

export const ShortDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Korte lijst, thuis en uit, donker',
  render: renderShort,
})

export const NamedLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met een naam boven de wedstrijd',
  render: renderNamed,
})

export const LongListLight = meta.story({
  globals: { theme: 'light' },
  name: 'Lange lijst met de knop, licht',
  render: renderWithButton,
})

export const LongListDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Lange lijst met de knop, donker',
  render: renderWithButton,
})

export const NoneLight = meta.story({
  globals: { theme: 'light' },
  name: 'Geen nul gehouden, licht',
  render: renderNone,
})

export const NoneDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Geen nul gehouden, donker',
  render: renderNone,
})

export const LongNameLight = meta.story({
  globals: { theme: 'light' },
  name: 'Een lange naam van een tegenstander, licht',
  render: renderLongName,
})

export const LongNameDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Een lange naam van een tegenstander, donker',
  render: renderLongName,
})
