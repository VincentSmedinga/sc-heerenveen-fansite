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
      description:
        'De kolommen van links naar rechts. `line: 2` zet de velden van een kolom op de tweede regel van de rij. `width` is `"narrow"` voor een kort antwoord, zoals een minuut, `"natural"` voor een antwoord van een paar woorden en anders `"default"`. `required: false` is voor een kolom die niet verplicht is, en `hideOptional` laat dan "niet verplicht" weg.',
      table: {
        type: {
          summary:
            '{ hideOptional?: boolean; line?: 1 | 2; name: string; required?: boolean; width?: "default" | "narrow" | "natural" }[]',
        },
      },
    },
    empty: {
      description: 'Wat er staat als er nog geen rijen zijn, zoals een regel tekst. De knop om toe te voegen blijft.',
      table: { type: { summary: 'ReactNode' } },
    },
    moveLabels: {
      description:
        'Wat de knoppen zeggen die een rij verplaatsen, voor een schermlezer en als tekst bij aanwijzen: de naam van de rij en dan dit, zoals "Speler 2 omhoog". Zonder zijn ze `Omhoog` en `Omlaag`.',
      table: { type: { summary: '{ down: string; up: string }' } },
    },
    removeLabel: {
      description:
        'Wat de knop zegt die een rij weghaalt, voor een schermlezer en als tekst bij aanwijzen: de naam van de rij en dan dit, zoals "Doelpunt 2 weghalen". De knop zelf is een prullenbak.',
      table: { type: { summary: 'string' } },
    },
    rows: {
      description:
        'De rijen van boven naar beneden. Elke rij heeft een `header` (de naam van de rij), een `mark` (wat je ziet als rijkop, zoals het nummer), `fields` (één veld per kolom) en `remove` (de verzendknop om haar weg te halen). Een veld heeft een `control` in een `Field`, of een `group` zoals een `RadioGroup`, en kan `hidden` zijn.',
      table: { type: { summary: 'InputTableRow[]' } },
    },
  },
  component: InputTable,
  parameters: {
    docs: {
      description: {
        component: [
          'Een tabel om in te vullen, voor een lijst waarin de redacteur steeds hetzelfde invult, zoals de doelpunten van een wedstrijd. Elk veld heeft zijn eigen label, met de rij erin voor een schermlezer.',
          'Het werkt ook zonder JavaScript: de knoppen om een rij toe te voegen, weg te halen of te verplaatsen zijn verzendknoppen. Zet de tabel in een `Form`, onder een kop die zegt wat erin staat.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/InputTable',
})

const render = (args: InputTableProps) => (
  <Form className="hf-flow" onSubmit={(event) => event.preventDefault()}>
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

export const Movable = meta.story({
  args: {
    moveLabels: { down: 'Omlaag', up: 'Omhoog' },
    rows: exampleGoals(false).map((row, index, all) => ({
      ...row,
      move: {
        ...(index > 0 ? { up: { id: `omhoog-${index + 1}`, name: 'actie', value: `omhoog-${index + 1}` } } : {}),
        ...(index < all.length - 1
          ? { down: { id: `omlaag-${index + 1}`, name: 'actie', value: `omlaag-${index + 1}` } }
          : {}),
      },
    })),
  },
  name: 'Met knoppen om een rij te verplaatsen',
  parameters: { layout: 'padded' },
  render,
})

export const Empty = meta.story({
  args: { empty: <Text>Er zijn nog geen doelpunten.</Text>, rows: [] },
  name: 'Zonder rijen',
  parameters: { layout: 'padded' },
  render,
})

export const WithHiddenField = meta.story({
  args: {
    rows: exampleGoals().map((row, index) => ({
      ...row,
      fields: row.fields.map((field, position) => ({ ...field, hidden: index === 0 && position === 4 })),
    })),
  },
  name: 'Met een veld dat niet past',
  parameters: {
    docs: {
      description: {
        story: 'Bij het eerste doelpunt past het veld voor de speler niet: het is niet te zien en gaat niet mee.',
      },
    },
    layout: 'padded',
  },
  render,
})
