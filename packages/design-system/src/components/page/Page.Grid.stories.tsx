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
        <Page.Section area="side" aria-labelledby="first-side-title">
          <Card id="first-side-title" title="Zijkolom" />
          <Card id="first-side-more" title="Nog een kaart" />
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
        <Page.Section area="side" aria-labelledby="toolbar-side-title">
          <Card id="toolbar-side-title" title="Zijkolom" />
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

export const MainOnly = meta.story({ name: 'Alleen een hoofdkolom', render: () => page(layouts.main) })
export const Main320 = meta.story({
  globals: { viewport: { value: 'w320' } },
  name: 'Alleen een hoofdkolom, 320 pixels',
  render: () => page(layouts.main),
  tags: ['!autodocs'],
})
export const Main400 = meta.story({
  globals: { viewport: { value: 'w400' } },
  name: 'Alleen een hoofdkolom, 400 pixels',
  render: () => page(layouts.main),
  tags: ['!autodocs'],
})
export const Main560 = meta.story({
  globals: { viewport: { value: 'w560' } },
  name: 'Alleen een hoofdkolom, 560 pixels',
  render: () => page(layouts.main),
  tags: ['!autodocs'],
})
export const Main900 = meta.story({
  globals: { viewport: { value: 'w900' } },
  name: 'Alleen een hoofdkolom, 900 pixels',
  render: () => page(layouts.main),
  tags: ['!autodocs'],
})
export const Main1280 = meta.story({
  globals: { viewport: { value: 'w1280' } },
  name: 'Alleen een hoofdkolom, 1280 pixels',
  render: () => page(layouts.main),
  tags: ['!autodocs'],
})

export const SideOnly = meta.story({ name: 'Met een zijkolom', render: () => page(layouts.side) })
export const Side320 = meta.story({
  globals: { viewport: { value: 'w320' } },
  name: 'Met een zijkolom, 320 pixels',
  render: () => page(layouts.side),
  tags: ['!autodocs'],
})
export const Side400 = meta.story({
  globals: { viewport: { value: 'w400' } },
  name: 'Met een zijkolom, 400 pixels',
  render: () => page(layouts.side),
  tags: ['!autodocs'],
})
export const Side560 = meta.story({
  globals: { viewport: { value: 'w560' } },
  name: 'Met een zijkolom, 560 pixels',
  render: () => page(layouts.side),
  tags: ['!autodocs'],
})
export const Side900 = meta.story({
  globals: { viewport: { value: 'w900' } },
  name: 'Met een zijkolom, 900 pixels',
  render: () => page(layouts.side),
  tags: ['!autodocs'],
})
export const Side1280 = meta.story({
  globals: { viewport: { value: 'w1280' } },
  name: 'Met een zijkolom, 1280 pixels',
  render: () => page(layouts.side),
  tags: ['!autodocs'],
})

export const FirstOnly = meta.story({
  name: 'Met een cel die op een telefoon voor de hoofdinhoud staat',
  render: () => page(layouts.first),
})
export const First320 = meta.story({
  globals: { viewport: { value: 'w320' } },
  name: 'Met een cel die op een telefoon voor de hoofdinhoud staat, 320 pixels',
  render: () => page(layouts.first),
  tags: ['!autodocs'],
})
export const First400 = meta.story({
  globals: { viewport: { value: 'w400' } },
  name: 'Met een cel die op een telefoon voor de hoofdinhoud staat, 400 pixels',
  render: () => page(layouts.first),
  tags: ['!autodocs'],
})
export const First560 = meta.story({
  globals: { viewport: { value: 'w560' } },
  name: 'Met een cel die op een telefoon voor de hoofdinhoud staat, 560 pixels',
  render: () => page(layouts.first),
  tags: ['!autodocs'],
})
export const First900 = meta.story({
  globals: { viewport: { value: 'w900' } },
  name: 'Met een cel die op een telefoon voor de hoofdinhoud staat, 900 pixels',
  render: () => page(layouts.first),
  tags: ['!autodocs'],
})
export const First1280 = meta.story({
  globals: { viewport: { value: 'w1280' } },
  name: 'Met een cel die op een telefoon voor de hoofdinhoud staat, 1280 pixels',
  render: () => page(layouts.first),
  tags: ['!autodocs'],
})

export const EqualOnly = meta.story({ name: 'Met twee gelijke kolommen', render: () => page(layouts.equal) })
export const Equal320 = meta.story({
  globals: { viewport: { value: 'w320' } },
  name: 'Met twee gelijke kolommen, 320 pixels',
  render: () => page(layouts.equal),
  tags: ['!autodocs'],
})
export const Equal400 = meta.story({
  globals: { viewport: { value: 'w400' } },
  name: 'Met twee gelijke kolommen, 400 pixels',
  render: () => page(layouts.equal),
  tags: ['!autodocs'],
})
export const Equal560 = meta.story({
  globals: { viewport: { value: 'w560' } },
  name: 'Met twee gelijke kolommen, 560 pixels',
  render: () => page(layouts.equal),
  tags: ['!autodocs'],
})
export const Equal900 = meta.story({
  globals: { viewport: { value: 'w900' } },
  name: 'Met twee gelijke kolommen, 900 pixels',
  render: () => page(layouts.equal),
  tags: ['!autodocs'],
})
export const Equal1280 = meta.story({
  globals: { viewport: { value: 'w1280' } },
  name: 'Met twee gelijke kolommen, 1280 pixels',
  render: () => page(layouts.equal),
  tags: ['!autodocs'],
})

export const StartOnly = meta.story({ name: 'Met een zijkolom links', render: () => page(layouts.start) })
export const Start320 = meta.story({
  globals: { viewport: { value: 'w320' } },
  name: 'Met een zijkolom links, 320 pixels',
  render: () => page(layouts.start),
  tags: ['!autodocs'],
})
export const Start400 = meta.story({
  globals: { viewport: { value: 'w400' } },
  name: 'Met een zijkolom links, 400 pixels',
  render: () => page(layouts.start),
  tags: ['!autodocs'],
})
export const Start560 = meta.story({
  globals: { viewport: { value: 'w560' } },
  name: 'Met een zijkolom links, 560 pixels',
  render: () => page(layouts.start),
  tags: ['!autodocs'],
})
export const Start900 = meta.story({
  globals: { viewport: { value: 'w900' } },
  name: 'Met een zijkolom links, 900 pixels',
  render: () => page(layouts.start),
  tags: ['!autodocs'],
})
export const Start1280 = meta.story({
  globals: { viewport: { value: 'w1280' } },
  name: 'Met een zijkolom links, 1280 pixels',
  render: () => page(layouts.start),
  tags: ['!autodocs'],
})

export const ToolbarOnly = meta.story({ name: 'Met een werkbalk', render: () => page(layouts.toolbar) })
export const Toolbar320 = meta.story({
  globals: { viewport: { value: 'w320' } },
  name: 'Met een werkbalk, 320 pixels',
  render: () => page(layouts.toolbar),
  tags: ['!autodocs'],
})
export const Toolbar400 = meta.story({
  globals: { viewport: { value: 'w400' } },
  name: 'Met een werkbalk, 400 pixels',
  render: () => page(layouts.toolbar),
  tags: ['!autodocs'],
})
export const Toolbar560 = meta.story({
  globals: { viewport: { value: 'w560' } },
  name: 'Met een werkbalk, 560 pixels',
  render: () => page(layouts.toolbar),
  tags: ['!autodocs'],
})
export const Toolbar900 = meta.story({
  globals: { viewport: { value: 'w900' } },
  name: 'Met een werkbalk, 900 pixels',
  render: () => page(layouts.toolbar),
  tags: ['!autodocs'],
})
export const Toolbar1280 = meta.story({
  globals: { viewport: { value: 'w1280' } },
  name: 'Met een werkbalk, 1280 pixels',
  render: () => page(layouts.toolbar),
  tags: ['!autodocs'],
})
