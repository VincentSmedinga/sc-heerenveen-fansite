import preview from '#.storybook/preview'

import { Field } from '../field/Field'
import { Input } from './Input'

const meta = preview.meta({
  component: Input,
  parameters: {
    docs: {
      description: {
        component: [
          'Een veld voor tekst van één regel. Zet het altijd in een `Field`, dat het zijn label geeft.',
          '',
          'Met `type` kies je het soort veld, zoals `email`, `url`, `tel` of `password`.',
          'Zonder `type` is het een gewoon tekstveld.',
          'Een vinkje, een keuzerondje en een bestandsveld zijn andere onderdelen en komen later.',
          '',
          'Een veld met persoonsgegevens krijgt `autoComplete`, zoals `name`, `email` of `current-password`.',
          'De browser kan het dan invullen, en niemand hoeft iets twee keer te typen.',
          '',
          'Het veld is hoog genoeg om met een vinger te raken, en zijn rand is goed te zien tegen de achtergrond.',
          'Heeft het veld een fout (`aria-invalid`), dan is de rand dikker en heeft hij de kleur van fouten.',
          '`Field` zet dat attribuut; de foutmelding zelf staat in tekst.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Input',
})

const render = () => (
  <>
    <Field id="naam" label="Naam" required>
      <Input autoComplete="name" name="naam" />
    </Field>
    <Field id="e-mail" label="E-mailadres" required>
      <Input autoComplete="email" name="e-mail" type="email" />
    </Field>
    <Field id="link" label="Link naar het bericht" required={false}>
      <Input name="link" type="url" />
    </Field>
  </>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
