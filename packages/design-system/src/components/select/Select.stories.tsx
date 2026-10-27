import preview from '#.storybook/preview'

import { Field } from '../field/Field'
import { Select } from './Select'

const meta = preview.meta({
  component: Select,
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst om één antwoord uit te kiezen. Zet het altijd in een `Field`, dat het zijn label geeft.',
          'Elke keuze is een `Select.Option`: het `option`-element, dat alleen in een `Select` werkt.',
          'De waarde van de gekozen keuze gaat mee met het formulier.',
          '',
          'Met `defaultValue` kies je het antwoord dat in het begin gekozen is.',
          'Wil je dat de bezoeker zelf kiest, zet dan als eerste een keuze zoals "Kies een onderwerp" met een lege `value`, en maak het veld verplicht.',
          '',
          'Het veld is hoog genoeg om met een vinger te raken, en zijn rand is goed te zien tegen de achtergrond.',
          'Heeft het veld een fout (`aria-invalid`), dan is de rand dikker en heeft hij de kleur van fouten.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Select',
})

const render = () => (
  <Field id="onderwerp" label="Onderwerp">
    <Select defaultValue="verwijderen" name="onderwerp">
      <Select.Option value="verwijderen">Een bericht laten verwijderen</Select.Option>
      <Select.Option value="fout">Een fout in een bericht</Select.Option>
      <Select.Option value="bron">Een bron voorstellen</Select.Option>
      <Select.Option value="anders">Iets anders</Select.Option>
    </Select>
  </Field>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
