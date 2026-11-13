import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Field } from '../field/Field'
import { sizes } from '../size'
import { Input, inputTypes, inputWidths } from './Input'

const meta = preview.meta({
  argTypes: {
    size: { control: 'radio', description: 'De maat van het veld.', options: sizes },
    type: {
      control: 'select',
      description: 'Het soort veld. Zonder `type` is het een gewoon tekstveld.',
      options: inputTypes,
    },
    width: {
      control: 'radio',
      description: 'De breedte: de regel, een paar tekens, of die van een datum of tijd.',
      options: inputWidths,
    },
  },
  component: Input,
  parameters: {
    docs: {
      description: {
        component: [
          'Een veld voor tekst van één regel. Zet het altijd in een `Field`, dat het zijn label geeft.',
          'Met `type` kies je het soort veld, zoals `email`, `url` of `tel`, en een veld met persoonsgegevens krijgt `autoComplete`, zodat de browser het kan invullen. Een antwoord van een paar tekens, zoals een minuut, krijgt een smal veld.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Input',
})

export const Default = meta.story({
  name: 'Tekstveld',
  render: (args) => (
    <Field id="naam" label="Naam">
      <Input autoComplete="name" name="naam" {...args} />
    </Field>
  ),
})

export const Email = meta.story({
  args: { type: 'email' },
  name: 'E-mailadres',
  render: (args) => (
    <Field id="e-mail" label="E-mailadres">
      <Input autoComplete="email" name="e-mail" {...args} />
    </Field>
  ),
})

export const Small = meta.story({
  args: { size: 'small', type: 'search' },
  name: 'Kleine maat',
  render: (args) => (
    <Field id="zoeken" label="Zoeken">
      <Input name="zoeken" {...args} />
    </Field>
  ),
})

export const Narrow = meta.story({
  args: { inputMode: 'numeric', width: 'narrow' },
  name: 'Smal, voor een paar tekens',
  render: (args) => (
    <Field id="minuut" label="Minuut">
      <Input name="minuut" {...args} />
    </Field>
  ),
})

export const Natural = meta.story({
  args: { type: 'date', width: 'natural' },
  name: 'Datum',
  render: (args) => (
    <Field id="datum" label="Datum">
      <Input name="datum" {...args} />
    </Field>
  ),
})
