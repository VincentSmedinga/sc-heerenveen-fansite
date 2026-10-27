import preview from '#.storybook/preview'

import { Field } from '../field/Field'
import { Textarea } from './Textarea'

const meta = preview.meta({
  component: Textarea,
  parameters: {
    docs: {
      description: {
        component: [
          'Een veld voor tekst van meer dan één regel, zoals een toelichting. Zet het altijd in een `Field`, dat het zijn label geeft.',
          'Met `rows` kies je hoeveel regels het in het begin heeft.',
          'Een bezoeker kan het veld hoger maken.',
          '',
          'De rand van het veld is goed te zien tegen de achtergrond.',
          'Heeft het veld een fout (`aria-invalid`), dan is de rand dikker en heeft hij de kleur van fouten.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Textarea',
})

const render = () => (
  <Field hint="Schrijf erbij waarom het bericht weg moet." id="toelichting" label="Toelichting" required={false}>
    <Textarea name="toelichting" rows={4} />
  </Field>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
