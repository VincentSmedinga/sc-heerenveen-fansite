import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { exampleColumns, exampleGoals } from '../../docs/ExampleInputTable'
import { Form } from '../form/Form'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { InputTable, type InputTableProps } from './InputTable'

const meta = preview.meta({
  args: {
    add: { label: 'Doelpunt toevoegen', name: 'actie', value: 'toevoegen' },
    caption: 'Doelpunten',
    columns: exampleColumns,
    rows: exampleGoals(),
  },
  argTypes: {
    add: {
      description:
        'De knop onder de tabel die een rij toevoegt, een verzendknop. `label` is zijn tekst, `name` en `value` zeggen de server dat hij is ingedrukt.',
      table: { type: { summary: '{ label: string; name: string; value?: string }' } },
    },
    columns: {
      description: 'De kolommen van links naar rechts. `width: "narrow"` is voor een kort antwoord, zoals een minuut.',
      table: { type: { summary: '{ name: string; width?: "default" | "narrow" }[]' } },
    },
    empty: {
      description: 'Wat er staat als er nog geen rijen zijn, zoals een regel tekst. De knop om toe te voegen blijft.',
      table: { type: { summary: 'ReactNode' } },
    },
    removeLabel: {
      description: 'De tekst van de knop die een rij weghaalt. Een schermlezer hoort er de naam van de rij achter.',
      table: { type: { summary: 'string' } },
    },
    rows: {
      description:
        'De rijen van boven naar beneden. Elke rij heeft een `header` (de naam van de rij), `fields` (één veld per kolom) en `remove` (de verzendknop om haar weg te halen).',
      table: { type: { summary: 'InputTableRow[]' } },
    },
  },
  component: InputTable,
  parameters: {
    docs: {
      description: {
        component: [
          'Een tabel om in te vullen, voor een lijst waarin de redacteur steeds hetzelfde invult, zoals de doelpunten van een wedstrijd.',
          'De koppen van de kolommen zijn de labels die je ziet.',
          'Elk veld heeft ook een label voor een schermlezer, met de rij erin: "Minuut, doelpunt 2".',
          'Elke rij heeft een knop om haar weg te halen en onder de tabel staat een knop om een rij toe te voegen.',
          'Beide zijn verzendknoppen, dus het werkt ook zonder JavaScript: de server antwoordt met het formulier, met de rij erbij of eraf.',
          'Zet de tabel in een `Form`, onder een kop die zegt wat erin staat. Dat formulier is dan even breed als zijn ouder.',
          '',
          'Waar de tabel niet past, zoals op een telefoon, wordt elke rij een blok met alle labels in beeld, zodat er niets zijwaarts schuift.',
          'Op een brede pagina (`Page.Main` met `wide`) blijft de tabel in één stuk.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/InputTable',
})

const render = (args: InputTableProps) => (
  <Form onSubmit={(event) => event.preventDefault()}>
    <Heading appearance={3} level={2}>
      Doelpunten
    </Heading>
    <InputTable {...args} />
  </Form>
)

export const Default = meta.story({
  name: 'Tabel om in te vullen',
  parameters: { layout: 'padded' },
  render,
})

export const WithErrors = meta.story({
  args: { rows: exampleGoals(true) },
  name: 'Met een fout',
  parameters: {
    docs: {
      description: {
        story:
          'Een veld met een fout laat zijn melding zien boven het veld, en de velden van de rij blijven op één lijn.',
      },
    },
    layout: 'padded',
  },
  render,
})

export const Empty = meta.story({
  args: { empty: <Text>Er zijn nog geen doelpunten.</Text>, rows: [] },
  name: 'Zonder rijen',
  parameters: { layout: 'padded' },
  render,
})

// Only on the canvas, with Storybook's viewport setting: the docs page can't resize the window.
export const Phone = meta.story({
  globals: { viewport: { value: 'mobile2' } },
  name: 'Op een telefoon',
  parameters: {
    docs: {
      description: {
        story:
          'Op een telefoon is elke rij een blok met alle labels in beeld, in plaats van een tabel die zijwaarts schuift.',
      },
    },
    layout: 'fullscreen',
  },
  render,
  tags: ['!autodocs'],
})
