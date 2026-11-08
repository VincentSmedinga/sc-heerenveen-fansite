import preview from '#.storybook/preview'

import { ExampleInputTable } from '../../docs/ExampleInputTable'
import { ExampleMain, ExampleSidebar } from '../../docs/ExamplePage'
import { Card } from '../card/Card'
import { Form } from '../form/Form'
import { Heading } from '../heading/Heading'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De hoofdkolom van de pagina: een `main`.',
          'Elke pagina heeft er één en zet haar inhoud erin.',
          '',
          '- De hoofdkolom heeft de lijst of tabel waar de pagina voor bestaat, op een wit vlak. Staat er een schakelaar die cijfers kiest, dan is dat de eerste cel. Cijfers is de uitzondering: daar hebben twee even brede kolommen allebei cijfers.',
          '- Elk kind van de kolom is een cel, zoals een kop, een tekst of een kaart. De cellen staan onder elkaar.',
          '- Zet wat bij elkaar hoort, zoals een kop met een inleiding, in een `Page.Cell`.',
          '- De ruimte tussen de cellen komt van de `Page.Body`.',
          '- Met `wide` is de pagina breder dan andere pagina’s, en de hoofdkolom breder, voor een pagina met een tabel met velden erin, zoals de beheerschermen voor een wedstrijd. De zijbalk houdt zijn breedte. Op een smal scherm is er geen verschil. De `Page.Body` hoef je er niets voor te geven: de hoofdkolom zegt het zelf. De kop, het menu en de voet houden de breedte van andere pagina’s. Kies er niet `wide` of `narrow` van de zijbalk bij.',
          '- Met de eigenschap `intro` zet je de inleiding van de pagina, zoals de kop met een tekst, bovenaan. De kinderen zijn dan de cellen eronder, en op een breed scherm begint de zijbalk onder de inleiding. Zie `Page.Body`.',
        ].join('\n'),
      },
      source: {
        code: `<Page.Main intro={<Heading level={1}>Nieuws over sc Heerenveen</Heading>}>
  <Text>Een cel in de hoofdkolom.</Text>
  <Page.Cell>…</Page.Cell>
</Page.Main>`,
        language: 'tsx',
        type: 'code',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Main',
})

const render = () => (
  <Page.Body>
    <ExampleMain />
  </Page.Body>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Licht',
  parameters: {
    docs: {
      description: {
        story: 'Drie cellen: een kop met een inleiding, een tekst, en een lijst onder een kop.',
      },
    },
  },
  render,
})

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

const wideRender = () => (
  <Page.Body>
    <Page.Main
      intro={
        <Page.Title>
          <Heading level={1}>Wedstrijd invullen</Heading>
        </Page.Title>
      }
      wide
    >
      <Card aria-labelledby="doelpunten-kop">
        <Heading appearance={3} id="doelpunten-kop" level={2}>
          Doelpunten
        </Heading>
        <Form onSubmit={(event) => event.preventDefault()}>
          <ExampleInputTable />
        </Form>
      </Card>
    </Page.Main>
    <ExampleSidebar />
  </Page.Body>
)

// Only on the canvas, with Storybook's viewport setting: the breakpoints follow the window.
const screen = { parameters: { layout: 'fullscreen' as const }, tags: ['!autodocs'] }

export const WideLight = meta.story({
  ...screen,
  globals: { theme: 'light', viewport: { value: 'wide' } },
  name: 'Brede pagina, breed scherm, licht',
  parameters: {
    ...screen.parameters,
    docs: {
      description: {
        story:
          'Met `wide` is de hoofdkolom breder en past een tabel met velden in één stuk naast de zijbalk. De kop, het menu en de voet horen bij de pagina, die hier niet in beeld komen.',
      },
    },
  },
  render: wideRender,
})

export const WideDark = meta.story({
  ...screen,
  globals: { theme: 'dark', viewport: { value: 'wide' } },
  name: 'Brede pagina, breed scherm, donker',
  render: wideRender,
})

export const WidePhone = meta.story({
  ...screen,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Brede pagina, telefoon, licht',
  parameters: {
    ...screen.parameters,
    docs: {
      description: {
        story: 'Op een telefoon is er geen verschil met een gewone pagina, en de tabel wordt een blok per rij.',
      },
    },
  },
  render: wideRender,
})
