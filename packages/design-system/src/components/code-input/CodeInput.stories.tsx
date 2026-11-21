import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Field } from '../field/Field'
import { CodeInput } from './CodeInput'

const hint = 'Zoek de mail met de code. Vul dan de 6 cijfers in. Plakken kan ook.'

const meta = preview.meta({
  component: CodeInput,
  parameters: {
    docs: {
      description: {
        component: [
          'Het veld voor de zes cijfers van een code uit een mail, getekend als zes vakjes. Het is één veld met één label: een screenreader hoort één veld, plakken en de code die het toetsenbord voorstelt vullen alle vakjes, en zonder JavaScript is het nog steeds een veld voor de code.',
          'Zet het in een `Field`, dat het label, de hint en de foutmelding geeft.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/CodeInput',
})

export const Default = meta.story({
  name: 'Leeg veld',
  render: (args) => (
    <Field hint={hint} id="code" label="Code uit de mail">
      <CodeInput name="code" {...args} />
    </Field>
  ),
})

export const Filled = meta.story({
  args: { defaultValue: '482190' },
  name: 'Ingevuld',
  render: (args) => (
    <Field hint={hint} id="code" label="Code uit de mail">
      <CodeInput name="code" {...args} />
    </Field>
  ),
})

export const WithError = meta.story({
  args: { defaultValue: '482190' },
  name: 'Met een fout',
  render: (args) => (
    <Field
      error="Die code klopt niet. Kijk of je de 6 cijfers uit de laatste mail hebt."
      hint={hint}
      id="code"
      label="Code uit de mail"
    >
      <CodeInput name="code" {...args} />
    </Field>
  ),
})
