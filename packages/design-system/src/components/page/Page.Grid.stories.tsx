import { type ReactNode } from 'react'

import preview from '#.storybook/preview'

import { Heading } from '../heading/Heading'
import { SeasonPicker } from '../season-picker/SeasonPicker'
import { Switch } from '../switch/Switch'
import { Text } from '../text/Text'
import { Page, type PageAreas, type PageColumns } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een pagina is een raster met benoemde gebieden: een `Page.Main` met `areas` zegt welke gebieden de pagina heeft op een smal en op een breed scherm, en welke verdeling van de kolommen ze kiest.',
          'Elke cel noemt zijn gebied met `area`. Zo kan een cel op een telefoon vóór de hoofdinhoud staan en op een breed scherm ernaast, zonder dat de volgorde van de code en van het toetsenbord verandert.',
          '',
          '- De kop met de inleiding staat bovenaan over de hele breedte, dan de werkbalk (`Page.Toolbar`), dan de inhoud en als laatste de bronvermelding.',
          '- Een cel naast de hoofdinhoud is een `Page.Section` met een naam. Kaarten die alleen onder elkaar staan, gaan samen in één sectie, die zelf rijen heeft.',
          '- De werkbalk hoort bij de hele pagina, zoals de keuze van een seizoen. Een pagina zonder werkbalk heeft op die plek geen lege ruimte.',
          '',
          'De verhalen voor een smal of breed scherm staan alleen in het canvas, met de instelling Viewport van de werkbalk.',
        ].join('\n'),
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Main met gebieden',
})

type Layout = { areas: PageAreas; columns?: PageColumns; render: () => ReactNode }

const filler = 'Dit is een tekst om de hoogte van de cel te zien. Een cel is zo hoog als wat erin staat.'

const MainCell = () => (
  <Page.Cell area="main">
    <Heading appearance={3} level={2}>
      Hoofdinhoud
    </Heading>
    <Text>{filler}</Text>
    <Text>{filler}</Text>
    <Text>{filler}</Text>
  </Page.Cell>
)

const Head = () => (
  <Page.Cell area="head">
    <Heading level={1}>Een pagina met gebieden</Heading>
    <Text>De kop met de inleiding staat bovenaan, over de hele breedte.</Text>
  </Page.Cell>
)

const Card = ({ id, title }: { id: string; title: string }) => (
  <div>
    <Heading appearance={3} id={id} level={2}>
      {title}
    </Heading>
    <Text>{filler}</Text>
  </div>
)

const options = [
  { label: '2025/26', value: '2025-26' },
  { label: '2024/25', value: '2024-25' },
]

const ToolbarRow = () => (
  <Page.Toolbar>
    <SeasonPicker action="/kies" onSubmit={(event) => event.preventDefault()} options={options} value="2025-26" />
    <Switch label="Alleen de Eredivisie" />
  </Page.Toolbar>
)

const layouts = {
  equal: {
    areas: { narrow: ['head', 'main', 'other'], wide: ['head head', 'main other'] },
    columns: 'equal',
    render: () => (
      <>
        <Head />
        <MainCell />
        <Page.Section area="other" aria-labelledby="other-title">
          <Card id="other-title" title="Tweede kolom" />
        </Page.Section>
      </>
    ),
  },
  first: {
    areas: {
      narrow: ['head', 'toolbar', 'summary', 'main', 'side'],
      wide: ['head head', 'toolbar toolbar', 'main summary', 'main side'],
    },
    render: () => (
      <>
        <Head />
        <ToolbarRow />
        <Page.Section area="summary" aria-labelledby="summary-title">
          <Card id="summary-title" title="Samenvatting" />
        </Page.Section>
        <MainCell />
        <Page.Section area="side" aria-labelledby="side-title">
          <Card id="side-title" title="Zijkolom" />
          <Card id="side-more" title="Nog een kaart" />
        </Page.Section>
      </>
    ),
  },
  main: {
    areas: { narrow: ['head', 'main'], wide: ['head', 'main'] },
    render: () => (
      <>
        <Head />
        <MainCell />
      </>
    ),
  },
  side: {
    areas: { narrow: ['head', 'main', 'side'], wide: ['head head', 'main side'] },
    render: () => (
      <>
        <Head />
        <MainCell />
        <Page.Section area="side" aria-labelledby="side-title">
          <Card id="side-title" title="Zijkolom" />
          <Card id="side-more" title="Nog een kaart" />
        </Page.Section>
      </>
    ),
  },
  start: {
    areas: { narrow: ['head', 'filter', 'main'], wide: ['head head', 'filter main'] },
    columns: 'start-side',
    render: () => (
      <>
        <Head />
        <Page.Section area="filter" aria-labelledby="filter-title">
          <Card id="filter-title" title="Filter" />
        </Page.Section>
        <MainCell />
      </>
    ),
  },
  toolbar: {
    areas: {
      narrow: ['head', 'toolbar', 'main', 'side'],
      wide: ['head head', 'toolbar toolbar', 'main side'],
    },
    render: () => (
      <>
        <Head />
        <ToolbarRow />
        <MainCell />
        <Page.Section area="side" aria-labelledby="side-title">
          <Card id="side-title" title="Zijkolom" />
        </Page.Section>
      </>
    ),
  },
} satisfies Record<string, Layout>

const page = ({ areas, columns, render }: Layout) => (
  <Page>
    <Page.Body>
      <Page.Main areas={areas} {...(columns === undefined ? {} : { columns })}>
        {render()}
      </Page.Main>
    </Page.Body>
  </Page>
)

const story = (name: keyof typeof layouts, title: string, viewport?: string) =>
  meta.story({
    globals: viewport === undefined ? {} : { viewport: { value: viewport } },
    name: title,
    render: () => page(layouts[name]),
    ...(viewport === undefined ? {} : { tags: ['!autodocs'] }),
  })

export const Main = story('main', 'Alleen een hoofdkolom')
export const Main320 = story('main', 'Alleen een hoofdkolom, 320 pixels', 'w320')
export const Main400 = story('main', 'Alleen een hoofdkolom, 400 pixels', 'w400')
export const Main560 = story('main', 'Alleen een hoofdkolom, 560 pixels', 'w560')
export const Main900 = story('main', 'Alleen een hoofdkolom, 900 pixels', 'w900')
export const Main1280 = story('main', 'Alleen een hoofdkolom, 1280 pixels', 'w1280')

export const Side = story('side', 'Met een zijkolom')
export const Side320 = story('side', 'Met een zijkolom, 320 pixels', 'w320')
export const Side400 = story('side', 'Met een zijkolom, 400 pixels', 'w400')
export const Side560 = story('side', 'Met een zijkolom, 560 pixels', 'w560')
export const Side900 = story('side', 'Met een zijkolom, 900 pixels', 'w900')
export const Side1280 = story('side', 'Met een zijkolom, 1280 pixels', 'w1280')

export const First = story('first', 'Met een cel die op een telefoon voor de hoofdinhoud staat')
export const First320 = story('first', 'Met een cel die op een telefoon voor de hoofdinhoud staat, 320 pixels', 'w320')
export const First400 = story('first', 'Met een cel die op een telefoon voor de hoofdinhoud staat, 400 pixels', 'w400')
export const First560 = story('first', 'Met een cel die op een telefoon voor de hoofdinhoud staat, 560 pixels', 'w560')
export const First900 = story('first', 'Met een cel die op een telefoon voor de hoofdinhoud staat, 900 pixels', 'w900')
export const First1280 = story(
  'first',
  'Met een cel die op een telefoon voor de hoofdinhoud staat, 1280 pixels',
  'w1280',
)

export const Equal = story('equal', 'Met twee gelijke kolommen')
export const Equal320 = story('equal', 'Met twee gelijke kolommen, 320 pixels', 'w320')
export const Equal400 = story('equal', 'Met twee gelijke kolommen, 400 pixels', 'w400')
export const Equal560 = story('equal', 'Met twee gelijke kolommen, 560 pixels', 'w560')
export const Equal900 = story('equal', 'Met twee gelijke kolommen, 900 pixels', 'w900')
export const Equal1280 = story('equal', 'Met twee gelijke kolommen, 1280 pixels', 'w1280')

export const Start = story('start', 'Met een zijkolom links')
export const Start320 = story('start', 'Met een zijkolom links, 320 pixels', 'w320')
export const Start400 = story('start', 'Met een zijkolom links, 400 pixels', 'w400')
export const Start560 = story('start', 'Met een zijkolom links, 560 pixels', 'w560')
export const Start900 = story('start', 'Met een zijkolom links, 900 pixels', 'w900')
export const Start1280 = story('start', 'Met een zijkolom links, 1280 pixels', 'w1280')

export const Toolbar = story('toolbar', 'Met een werkbalk')
export const Toolbar320 = story('toolbar', 'Met een werkbalk, 320 pixels', 'w320')
export const Toolbar400 = story('toolbar', 'Met een werkbalk, 400 pixels', 'w400')
export const Toolbar560 = story('toolbar', 'Met een werkbalk, 560 pixels', 'w560')
export const Toolbar900 = story('toolbar', 'Met een werkbalk, 900 pixels', 'w900')
export const Toolbar1280 = story('toolbar', 'Met een werkbalk, 1280 pixels', 'w1280')
