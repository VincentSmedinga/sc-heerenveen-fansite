import { type ReactNode } from 'react'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
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
          'De werkbalk staat op een telefoon onder de kop. Op een breed scherm staat hij in de tweede kolom, in de rij van de kop en op één lijn met de bovenkant van de paginanaam, ook als de inhoud eronder over beide kolommen loopt. Met de kop in de eerste kolom en de werkbalk in de tweede blijft de volgorde van lezen en van de tab-toets de kop eerst. Passen de bedieningselementen niet naast elkaar, dan staan ze onder elkaar. De terugkeerlink van een pagina staat in een gebied van zijn eigen, boven de kop, en neemt de hele breedte.',
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

const Head = ({
  intro = 'De kop met de inleiding staat bovenaan, over de hele breedte.',
  title = 'Een pagina met gebieden',
}: {
  intro?: string
  title?: string
}) => (
  <Page.Cell area="head">
    <Heading level={1}>{title}</Heading>
    <Text>{intro}</Text>
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

const ToolbarRow = ({ single = false }: { single?: boolean }) => (
  <Page.Toolbar>
    <SeasonPicker
      action="/kies"
      onSubmit={(event) => event.preventDefault()}
      options={options}
      size="small"
      value="2025-26"
    />
    {single ? null : <Switch label="Alleen de Eredivisie" />}
  </Page.Toolbar>
)

const layouts = {
  back: {
    areas: {
      narrow: ['back', 'head', 'toolbar', 'main', 'side'],
      wide: ['back back', 'head toolbar', 'main side'],
    },
    render: () => (
      <>
        <Page.Back>
          <Text>
            <Link href="#terug" icon="arrow-left">
              Terug
            </Link>
          </Text>
        </Page.Back>
        <Head />
        <ToolbarRow />
        <MainCell />
        <Page.Section area="side" aria-labelledby="back-side-title">
          <Card id="back-side-title" title="Zijkolom" />
        </Page.Section>
      </>
    ),
  },
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
      wide: ['head toolbar', 'main summary', 'main side'],
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
      wide: ['head toolbar', 'main side'],
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
  toolbarFull: {
    areas: {
      narrow: ['head', 'toolbar', 'main'],
      wide: ['head toolbar', 'main main'],
    },
    columns: 'equal',
    render: () => (
      <>
        <Head />
        <ToolbarRow />
        <MainCell />
      </>
    ),
  },
  toolbarSingle: {
    areas: {
      narrow: ['head', 'toolbar', 'main', 'side'],
      wide: ['head toolbar', 'main side'],
    },
    render: () => (
      <>
        <Head />
        <ToolbarRow single />
        <MainCell />
        <Page.Section area="side" aria-labelledby="toolbar-single-side-title">
          <Card id="toolbar-single-side-title" title="Zijkolom" />
        </Page.Section>
      </>
    ),
  },
  toolbarTwoLines: {
    areas: {
      narrow: ['head', 'toolbar', 'main', 'side'],
      wide: ['head toolbar', 'main side'],
    },
    render: () => (
      <>
        <Head
          intro="De werkbalk blijft bovenaan staan, ook als de kop op twee regels staat."
          title="Een pagina met een kop die op een breed scherm op twee regels staat"
        />
        <ToolbarRow />
        <MainCell />
        <Page.Section area="side" aria-labelledby="toolbar-two-lines-side-title">
          <Card id="toolbar-two-lines-side-title" title="Zijkolom" />
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
export const ToolbarOnly = meta.story({
  name: 'Met een werkbalk naast de kop, met twee bedieningselementen',
  render: () => page(layouts.toolbar),
})
export const ToolbarSingle = meta.story({
  name: 'Met een werkbalk naast de kop, met één bedieningselement',
  render: () => page(layouts.toolbarSingle),
})
export const ToolbarTwoLines = meta.story({
  name: 'Met een werkbalk naast een kop op twee regels',
  render: () => page(layouts.toolbarTwoLines),
})
export const ToolbarFullWidth = meta.story({
  name: 'Met een werkbalk boven inhoud over beide kolommen',
  render: () => page(layouts.toolbarFull),
})
export const BackLink = meta.story({ name: 'Met een terugkeerlink boven de kop', render: () => page(layouts.back) })
