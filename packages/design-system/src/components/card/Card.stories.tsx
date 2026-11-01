import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Button } from '../button/Button'
import { DonutChart } from '../donut-chart/DonutChart'
import { Form } from '../form/Form'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { NewsItem } from '../news-item/NewsItem'
import { Page } from '../page/Page'
import { StandingsTable } from '../standings-table/StandingsTable'
import { Text } from '../text/Text'
import { WikipediaCredit } from '../wikipedia-credit/WikipediaCredit'
import { Card, cardElements, type CardSurface, cardSurfaces } from './Card'

// The type of the props as the table of controls shows it: the compiler gives `unknown[number]`
// for the lists.
const union = (values: readonly string[]) => ({ type: { summary: values.map((value) => `'${value}'`).join(' | ') } })

const meta = preview.meta({
  argTypes: {
    as: {
      control: 'select',
      description: 'Het element van de kaart.',
      options: cardElements,
      table: union(cardElements),
    },
    shareable: {
      description:
        'Zet rechtsboven een knop die een afbeelding van de kaart maakt. `source` is de bronvermelding die onder de afbeelding komt.',
      table: { type: { summary: '{ source: ReactNode }' } },
    },
    surface: {
      control: 'radio',
      description: 'Het vlak van de kaart.',
      options: cardSurfaces,
      table: union(cardSurfaces),
    },
  },
  component: Card,
  parameters: {
    docs: {
      description: {
        component: [
          'Een kaart zet een blok van de pagina op een eigen vlak, met een rand en ronde hoeken.',
          'Zo staat elk blok los op de pagina, en dat geeft de pagina rust en richting.',
          'Een kaart met het vlak `transparent` heeft geen rand en achtergrond die je ziet, en geen binnenruimte boven en onder: de tekst erin staat op één lijn met de tekst in de andere kaarten, zonder dat de ruimte tussen de kaarten groter wordt.',
          'Staat er direct onder de kop een lijst, dan is de ruimte daartussen groter dan bij tekst, zodat de eerste regel van de lijst niet tegen de kop zit.',
          'Onder de lijst kan een formulier met een knop staan, zoals "Laad 5 meer" in de kaart met de nul gehouden op Wedstrijden.',
          'Met `shareable` krijgt de kaart rechtsboven een knop die er een afbeelding van maakt, met het logo, het adres van de site, de datum en de bron eronder.',
          'De bezoeker deelt die afbeelding of bewaart hem, en er gaat niets naar een server.',
          'Gebruik hem alleen voor een kaart met cijfers en feiten die we mogen laten rondgaan, nooit voor het werk van journalisten.',
          '',
          'De vier vlakken en het doorzichtige vlak hebben elk een betekenis.',
          'Loop de regels op volgorde door: de eerste die past, wint.',
          '',
          '- **Wit** (`default`): de kaart is waar de pagina voor bestaat, of een bediening die erop werkt.',
          '  Dat zijn de hoofdinhoud van de pagina, zoals de lijsten met nieuws, het programma en de uitslagen, en de filters en het zoekformulier die erbij horen.',
          '  De blokken van de homepage zijn allemaal wit, want elk blok is er de inhoud.',
          '- **Sterk** (`strong`): de kaart gaat over de mensen of organisaties achter de inhoud, of is aan hen gericht.',
          '  Denk aan de hoofdtrainer, "Ben je zelf een bron?" en later het officiële clubnieuws.',
          '- **Warm** (`warm`): iets opmerkelijks.',
          '  Een kaart die bijzonder of oorspronkelijk is, zoals de grafieken van het seizoen en de ringen van Doelpunten per kwartier, of een uitnodiging, zoals de nieuwsbrief van de LC.',
          '  Ongeveer één kaart op de zes is warm, zonder vast maximum per pagina, en nooit om buren van elkaar te onderscheiden.',
          '- **Zacht** (`soft`): ranglijsten, lijsten en records die bij de hoofdinhoud horen, zoals de stand, de doelpuntenmakers en de uitersten, en al het andere dat de pagina aanvult.',
          '- **Transparant** (`transparent`): bronvermeldingen.',
          '  De schakelaar voor de competitie blijft zoals hij is, zonder vlak.',
          '- **Buurkaarten mogen dezelfde kleur hebben.**',
          '  Moeten twee kaarten uit elkaar, verander dan de volgorde of de kop, niet de kleur.',
          '- **Kleur is nooit het enige teken.**',
          '  In donker zijn zacht en wit gelijk, en warm en sterk ook, dus de betekenis moet ook uit de plaats en de kop komen.',
          '',
          '**Welk vlak kies ik?**',
          'Stel de vragen op volgorde, en neem het vlak van het eerste ja.',
          '',
          '1. Is de kaart waar de pagina voor bestaat, of een bediening die erop werkt, zoals een filter of een zoekformulier? Kies wit.',
          '2. Gaat de kaart over de mensen of organisaties achter de inhoud, of is hij aan hen gericht? Kies sterk.',
          '3. Is de kaart bijzonder of oorspronkelijk, of is hij een uitnodiging? Kies warm.',
          '4. Hoort de kaart bij de hoofdinhoud, of vult hij de pagina aan, als ranglijst, lijst of record? Kies zacht.',
          '5. Is het een bronvermelding? Kies transparant.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Card',
})

const newsItems = (
  <List role="list">
    <List.Item>
      <NewsItem
        dateTime="2026-10-21T12:05:00Z"
        headline="Heerenveen wint in blessuretijd van Testclub"
        href="#heerenveen-wint"
        source="Testkrant"
        time="wo 14:05"
      />
    </List.Item>
    <List.Item>
      <NewsItem
        dateTime="2026-10-21T08:30:00Z"
        headline="Trainer over de blessures: ‘Er komt niemand terug voor zondag’"
        href="#blessures"
        paywalled
        source="Testkrant"
        time="wo 10:30"
      />
    </List.Item>
  </List>
)

export const Default = meta.story({
  args: { as: 'section', surface: 'default' },
  name: 'Kaart',
  render: ({ as = 'section', ...args }) => (
    // A name from the heading is only allowed on elements that have a role to name: not on a
    // div.
    <Card {...args} aria-labelledby={as === 'div' ? undefined : 'card-heading'} as={as}>
      <Heading appearance={3} id="card-heading" level={2}>
        Nieuws
      </Heading>
      {newsItems}
    </Card>
  ),
})

const surfaces: { label: string; purpose: string; surface: CardSurface }[] = [
  { label: 'Vlak', purpose: 'De hoofdinhoud van de pagina, of een bediening die erop werkt.', surface: 'default' },
  {
    label: 'Sterk vlak',
    purpose: 'De mensen of organisaties achter de inhoud, of een kaart die aan hen gericht is.',
    surface: 'strong',
  },
  {
    label: 'Zacht vlak',
    purpose: 'Een ranglijst, lijst of record die bij de hoofdinhoud hoort, en wat de pagina aanvult.',
    surface: 'soft',
  },
  { label: 'Warm vlak', purpose: 'Iets opmerkelijks: iets bijzonders of een uitnodiging.', surface: 'warm' },
]

const renderSurfaces = () => (
  <Page.Body>
    <Page.Main>
      {surfaces.map(({ label, purpose, surface }) => (
        <Card aria-labelledby={`surface-${surface}`} key={surface} surface={surface}>
          <Heading appearance={3} id={`surface-${surface}`} level={2}>
            {label}
          </Heading>
          <Text>{purpose}</Text>
          {newsItems}
        </Card>
      ))}
    </Page.Main>
  </Page.Body>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Vier vlakken, licht', render: renderSurfaces })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Vier vlakken, donker', render: renderSurfaces })

const renderWithButton = () => (
  <Page.Body>
    <Page.Main>
      <Card aria-labelledby="button-heading">
        <Heading id="button-heading" level={2}>
          Laatste nieuws
        </Heading>
        {newsItems}
        <Form action="/#nieuws-3" method="get">
          <Button name="nieuws" type="submit" value="10">
            Laad 5 meer
          </Button>
        </Form>
      </Card>
    </Page.Main>
  </Page.Body>
)

export const WithButtonLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met een knop onder de lijst, licht',
  render: renderWithButton,
})

export const WithButtonDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met een knop onder de lijst, donker',
  render: renderWithButton,
})

const renderShareable = () => (
  <Page.Body>
    <Page.Main>
      <Card
        aria-labelledby="share-soft"
        shareable={{ source: <WikipediaCredit compact lead="Gegevens van" /> }}
        surface="soft"
      >
        <Heading anchor id="share-soft" level={2}>
          Stand
        </Heading>
        <StandingsTable
          caption="Stand op 18 oktober 2026"
          rows={[
            { club: 'Demo Boys', played: 10, points: 25, position: 1 },
            { club: 'sc Heerenveen', played: 10, points: 19, position: 2 },
            { club: 'Voorbeeld United', played: 10, points: 15, position: 3 },
          ]}
        />
      </Card>
      <Card
        aria-labelledby="share-warm"
        shareable={{ source: <WikipediaCredit compact lead="Gegevens van" /> }}
        surface="warm"
      >
        <Heading anchor id="share-warm" level={2}>
          Doelpunten per kwartier
        </Heading>
        <DonutChart.Group>
          <DonutChart
            slices={[
              { label: '0-15', value: 3 },
              { label: '16-30', value: 5 },
              { label: '31-45', value: 2 },
            ]}
            title="Voor"
            tone="positive"
          />
          <DonutChart
            slices={[
              { label: '0-15', value: 1 },
              { label: '16-30', value: 2 },
              { label: '31-45', value: 3 },
            ]}
            title="Tegen"
            tone="negative"
          />
        </DonutChart.Group>
      </Card>
    </Page.Main>
  </Page.Body>
)

export const ShareableLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met een knop voor een afbeelding, licht',
  render: renderShareable,
})

export const ShareableDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met een knop voor een afbeelding, donker',
  render: renderShareable,
})

const renderPage = () => (
  <Page.Body>
    <Page.Main>
      <Heading level={1}>Nieuws over sc Heerenveen</Heading>
      <Card aria-labelledby="page-media">
        <Heading id="page-media" level={2}>
          Laatste nieuws
        </Heading>
        {newsItems}
      </Card>
      <Text>
        Welke media we volgen, lees je bij <Link href="#bronnen">Onze bronnen</Link>.
      </Text>
    </Page.Main>
    <Page.Sidebar aria-label="Naast het nieuws">
      <Card aria-labelledby="page-match" surface="soft">
        <Heading appearance={3} id="page-match" level={2}>
          Volgende wedstrijd
        </Heading>
        <Text appearance="meta">Hier komt een blok met de volgende wedstrijd.</Text>
      </Card>
      <Card aria-labelledby="page-forum">
        <Heading appearance={3} id="page-forum" level={2}>
          Nieuwste discussies
        </Heading>
        <List>
          <List.Item>Hier komt een lijst uit het forum.</List.Item>
          <List.Item>Met een paar onderwerpen onder elkaar.</List.Item>
        </List>
      </Card>
    </Page.Sidebar>
  </Page.Body>
)

export const OnPageLight = meta.story({ globals: { theme: 'light' }, name: 'Op een pagina, licht', render: renderPage })

export const OnPageDark = meta.story({ globals: { theme: 'dark' }, name: 'Op een pagina, donker', render: renderPage })

const renderTransparent = () => (
  <Page.Body>
    <Page.Main>
      <Card aria-labelledby="transparent-card">
        <Heading appearance={3} id="transparent-card" level={2}>
          Gewone kaart
        </Heading>
        <Text>De tekst staat op dezelfde plek als in de kaart eronder.</Text>
      </Card>
      <Card as="div" surface="transparent">
        <Text>
          Een doorzichtige kaart heeft geen rand of achtergrond, en zijn tekst staat op één lijn met de tekst erboven.
        </Text>
      </Card>
    </Page.Main>
  </Page.Body>
)

export const TransparentLight = meta.story({
  globals: { theme: 'light' },
  name: 'Doorzichtig vlak naast een gewone kaart, licht',
  render: renderTransparent,
})

export const TransparentDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Doorzichtig vlak naast een gewone kaart, donker',
  render: renderTransparent,
})
