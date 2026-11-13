import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Field } from '../field/Field'
import { Textarea } from './Textarea'

const meta = preview.meta({
  args: { rows: 4 },
  argTypes: {
    rows: { control: 'number', description: 'Hoeveel regels het veld in het begin heeft.' },
  },
  component: Textarea,
  parameters: {
    docs: {
      description: {
        component: [
          'Een veld voor tekst van meer dan één regel, zoals een toelichting. Zet het altijd in een `Field`, dat het zijn label geeft.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Textarea',
})

export const Default = meta.story({
  name: 'Tekstvak',
  render: (args) => (
    <Field hint="Schrijf erbij waarom het bericht weg moet." id="toelichting" label="Toelichting" required={false}>
      <Textarea name="toelichting" {...args} />
    </Field>
  ),
})
