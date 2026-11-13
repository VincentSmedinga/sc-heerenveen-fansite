import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { BarChart } from '../bar-chart/BarChart'
import { Button } from '../button/Button'
import { DataTable } from '../data-table/DataTable'
import { Disclosure } from '../disclosure/Disclosure'
import { DonutChart } from '../donut-chart/DonutChart'
import { Form } from '../form/Form'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { NewsItem } from '../news-item/NewsItem'
import { Notice } from '../notice/Notice'
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
          'Een kaart zet een blok van de pagina op een eigen vlak, met een rand en ronde hoeken. Zo staat elk blok los op de pagina.',
          'Het vlak zegt wat voor blok het is: wit voor de hoofdinhoud, sterk voor de mensen en organisaties achter de inhoud, zacht voor lijsten en records die erbij horen, warm voor iets opmerkelijks of een uitnodiging, en transparant voor een bronvermelding.',
          'Buurkaarten mogen dezelfde kleur hebben, en kleur is nooit het enige teken: in donker zijn zacht en wit gelijk, en warm en sterk ook.',
          'Met `shareable` krijgt de kaart een knop die er een afbeelding van maakt, met het logo, het adres van de site, de datum en de bron; gebruik hem alleen voor cijfers en feiten, nooit voor het werk van journalisten.',
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
  { label: 'Vlak', purpose: 'De hoofdinhoud van de pagina.', surface: 'default' },
  {
    label: 'Sterk vlak',
    purpose: 'De mensen of organisaties achter de inhoud, of een kaart die aan hen gericht is.',
    surface: 'strong',
  },
  {
    label: 'Zacht vlak',
    purpose: 'Een ranglijst, lijst, record of filter die bij de hoofdinhoud hoort, en wat de pagina aanvult.',
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

export const Surfaces = meta.story({ name: 'Vier vlakken', render: renderSurfaces })

// The lines in a card follow the card: the rows of the table, the outline of the disclosure and
// the notice, and the axes of the chart take the colour of the surface they are on.
const renderLines = (only?: CardSurface) => (
  <Page.Body>
    <Page.Main>
      {surfaces
        .filter(({ surface }) => only === undefined || surface === only)
        .map(({ label, surface }) => (
          <Card aria-labelledby={`lines-${surface}`} key={surface} surface={surface}>
            <Heading appearance={3} id={`lines-${surface}`} level={2}>
              {label}
            </Heading>
            <DataTable
              caption={`Een tabel op het ${label.toLowerCase()}`}
              columns={['Seizoen', 'Plek', 'Punten']}
              rows={[
                { cells: [4, 58], header: '2025/26' },
                { cells: [2, 64], header: '2024/25' },
                { cells: [9, 44], header: '2023/24' },
              ]}
            />
            <BarChart
              axis={{ title: 'Speelronde' }}
              bars={[3, 1, 3, 0, 3, 1, 3, 3].map((value) => ({
                tone: value === 3 ? 'positive' : value === 1 ? 'neutral' : 'negative',
                value,
              }))}
              max={3}
              ticks={[0, 1, 3]}
            />
            <Notice>Een mededeling in een kaart.</Notice>
            <Disclosure summary="Uitslag per speelronde">
              <Text>Wat achter de samenvatting staat.</Text>
            </Disclosure>
          </Card>
        ))}
    </Page.Main>
  </Page.Body>
)

export const Lines = meta.story({
  name: 'Lijnen in een kaart',
  render: () => renderLines(),
})

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

export const WithButton = meta.story({
  name: 'Met een knop onder de lijst',
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

export const Shareable = meta.story({
  name: 'Met een knop voor een afbeelding',
  render: renderShareable,
})

const renderPage = () => (
  <Page.Body>
    <Page.Main areas={{ narrow: ['head', 'main', 'side'], wide: ['head head', 'main side'] }}>
      <Page.Cell area="head">
        <Heading level={1}>Nieuws over sc Heerenveen</Heading>
      </Page.Cell>
      <Page.Cell area="main">
        <Card aria-labelledby="page-media">
          <Heading id="page-media" level={2}>
            Laatste nieuws
          </Heading>
          {newsItems}
        </Card>
        <Text>
          Welke media we volgen, lees je bij <Link href="#bronnen">Onze bronnen</Link>.
        </Text>
      </Page.Cell>
      <Page.Section area="side" aria-label="Naast het nieuws">
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
      </Page.Section>
    </Page.Main>
  </Page.Body>
)

export const OnPage = meta.story({ name: 'Op een pagina', render: renderPage })

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

export const Transparent = meta.story({
  name: 'Doorzichtig vlak naast een gewone kaart',
  render: renderTransparent,
})
