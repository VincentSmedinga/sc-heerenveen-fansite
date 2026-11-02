import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Field } from '../field/Field'
import { Form } from '../form/Form'
import { Input } from '../input/Input'
import { FieldGroup, type FieldGroupProps } from './FieldGroup'

const meta = preview.meta({
  args: { children: null, legend: 'Aftrap' },
  argTypes: {
    children: {
      description: 'De velden van de groep, twee tot vier `Field`s.',
      table: { type: { summary: 'ReactNode' } },
    },
    hint: {
      description: 'Hulptekst onder de legenda, in gewone tekst.',
      table: { type: { summary: 'string' } },
    },
    legend: {
      description: 'De naam van de groep. Een schermlezer leest hem voor het label van elk veld.',
      table: { type: { summary: 'ReactNode' } },
    },
    separator: {
      description:
        'Een teken tussen de eerste twee velden, zoals een streepje in een stand. Een schermlezer slaat het over.',
      table: { type: { summary: 'string' } },
    },
  },
  component: FieldGroup,
  parameters: {
    docs: {
      description: {
        component: [
          'Een groep van twee tot vier velden die bij elkaar horen, in een `fieldset` met een legenda.',
          'De velden staan naast elkaar waar ze passen en onder elkaar waar niet, zoals op een telefoon.',
          'Een schermlezer leest de legenda voor het label van elk veld, dus de labels kunnen kort zijn: "Datum" en "Tijd" onder "Aftrap".',
          'Kies hem voor datum en tijd, voor een stand met een streepje tussen twee velden (de teamnamen zijn de labels) en voor een groep zoals "Stand na 90 minuten".',
          'Een groep met een streepje houdt de twee velden ook op een telefoon naast elkaar.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/FieldGroup',
})

const render = (args: FieldGroupProps) => (
  <Form onSubmit={(event) => event.preventDefault()}>
    <FieldGroup {...args}>
      <Field id="datum" label="Datum">
        <Input name="datum" placeholder="jjjj-mm-dd" />
      </Field>
      <Field id="tijd" label="Tijd" required={false}>
        <Input name="tijd" />
      </Field>
    </FieldGroup>
  </Form>
)

export const Default = meta.story({ name: 'Datum en tijd', render })

export const Score = meta.story({
  args: {
    hint: 'Met verlenging erbij, zonder strafschoppen.',
    legend: 'Eindstand',
    separator: '–',
  },
  name: 'Stand met een streepje',
  render: (args) => (
    <Form onSubmit={(event) => event.preventDefault()}>
      <FieldGroup {...args}>
        <Field id="stand-thuis" label="Testclub">
          <Input inputMode="numeric" name="stand-thuis" />
        </Field>
        <Field error="Vul de stand van FC Voorbeeld in." id="stand-uit" label="FC Voorbeeld">
          <Input inputMode="numeric" name="stand-uit" />
        </Field>
      </FieldGroup>
    </Form>
  ),
})
