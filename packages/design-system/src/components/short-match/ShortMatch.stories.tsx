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
          'Het is voor een lijst die over onze club gaat, zoals de wedstrijden waarin we de nul hielden.',
          'Onze eigen naam staat dus niet in de regel.',
          '',
          'De regel heeft geen competitie, ronde, stadion, tijd of doelpuntenmakers: dat is een `Match`.',
          "Hij heeft ook niet de kleur van de uitkomst, want in zo'n lijst hebben alle regels dezelfde soort uitslag.",
          'Een schermlezer hoort de uitslag als "3 tegen 0".',
          '',
          '- `time` is de dag zoals een bezoeker hem leest, zoals "za 24 okt", en `dateTime` is de waarde voor machines, zoals "2026-10-24".',
          '- `home` zegt of sc Heerenveen thuis speelde.',
          '- `goalsFor` zijn de doelpunten van sc Heerenveen, `goalsAgainst` die van de tegenstander.',
          '',
          'De regel past op één regel en breekt op een smalle plek: de uitslag gaat dan naar de volgende regel voordat een naam wordt afgebroken.',
          'Een lange naam breekt in plaats van de pagina zijwaarts te laten scrollen.',
          'Het component is een `div`.',
          'Zet hem in een `List.Item` en geef de `List` `role="list"`: Safari noemt een lijst zonder opsommingstekens anders geen lijst meer.',
          'Tussen de regels staat een dunne lijn.',
          'Zet de lijst in een `Card`, onder een kop van niveau 2.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/ShortMatch',
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
