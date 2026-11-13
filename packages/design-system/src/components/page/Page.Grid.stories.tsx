import { type ReactNode } from 'react'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
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
          'Een `Page.Main` met `areas` is een raster met benoemde gebieden: de pagina zegt welke gebieden ze heeft op een smal en op een breed scherm, en elke cel noemt zijn gebied met `area`.',
          'Je kiest het voor een pagina met meer dan één kolom, zodat een cel op een telefoon vóór de hoofdinhoud kan staan zonder dat de volgorde van de code verandert.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
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
export const SideOnly = meta.story({ name: 'Met een zijkolom', render: () => page(layouts.side) })
export const FirstOnly = meta.story({
  name: 'Met een cel die op een telefoon voor de hoofdinhoud staat',
  render: () => page(layouts.first),
})
export const EqualOnly = meta.story({ name: 'Met twee gelijke kolommen', render: () => page(layouts.equal) })
export const StartOnly = meta.story({ name: 'Met een zijkolom links', render: () => page(layouts.start) })
export const ToolbarOnly = meta.story({ name: 'Met een werkbalk', render: () => page(layouts.toolbar) })
