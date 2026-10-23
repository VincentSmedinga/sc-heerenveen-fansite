import preview from '#.storybook/preview'

import { Input } from '../input/Input'
import { Field } from './Field'

const meta = preview.meta({
  component: Field,
  parameters: {
    docs: {
      description: {
        component: [
          'Een veld met zijn label, zijn hulptekst en zijn foutmelding. `Field` zet ze in de goede volgorde en koppelt ze aan het veld.',
          'Het veld zelf is het kind: een `Input`, een `Textarea` of een `Select`.',
          '',
          '- Het label hoort bij het veld met `for` en `id`. De `id` geef je aan `Field`; die zet hem op het veld.',
          '- De hulptekst en de foutmelding horen bij het veld met `aria-describedby`. Een schermlezer leest ze voor bij het veld.',
          '- Heeft het veld een fout, dan krijgt het ook `aria-invalid`, en een dikkere rand in de kleur van fouten.',
          '  De fout staat in tekst en begint voor een schermlezer met "Fout:". Een rode rand is nooit het enige teken.',
          '- Het label zegt in woorden of het veld verplicht is: "(verplicht)" of "(niet verplicht)". Je kiest dat met `required`, en het veld krijgt het attribuut ook.',
          '',
          'Een placeholder is geen label: een veld zonder label bestaat niet.',
          'Zet voor een veld met persoonsgegevens `autoComplete` op het veld, zoals `name` of `email`, zodat de browser het kan invullen.',
          'Een `ErrorSummary` bovenaan het formulier linkt naar de `id` van elk veld met een fout.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Field',
})

const renderEmpty = () => (
  <Field id="naam" label="Naam" required>
    <Input autoComplete="name" name="naam" />
  </Field>
)

const renderFilled = () => (
  <Field id="naam" label="Naam" required>
    <Input autoComplete="name" defaultValue="Jelle de Vries" name="naam" />
  </Field>
)

const renderHint = () => (
  <Field
    hint="Alleen als je antwoord wilt. We bewaren het niet langer dan nodig is."
    id="e-mail"
    label="E-mailadres"
    required={false}
  >
    <Input autoComplete="email" name="e-mail" type="email" />
  </Field>
)

const renderError = () => (
  <Field error="Vul een e-mailadres in, zoals naam@voorbeeld.nl." id="e-mail" label="E-mailadres" required>
    <Input autoComplete="email" defaultValue="jelle" name="e-mail" type="email" />
  </Field>
)

export const EmptyLight = meta.story({ globals: { theme: 'light' }, name: 'Leeg, licht', render: renderEmpty })

export const EmptyDark = meta.story({ globals: { theme: 'dark' }, name: 'Leeg, donker', render: renderEmpty })

export const FilledLight = meta.story({ globals: { theme: 'light' }, name: 'Ingevuld, licht', render: renderFilled })

export const FilledDark = meta.story({ globals: { theme: 'dark' }, name: 'Ingevuld, donker', render: renderFilled })

export const HintLight = meta.story({ globals: { theme: 'light' }, name: 'Met hulptekst, licht', render: renderHint })

export const HintDark = meta.story({ globals: { theme: 'dark' }, name: 'Met hulptekst, donker', render: renderHint })

export const ErrorLight = meta.story({ globals: { theme: 'light' }, name: 'Met fout, licht', render: renderError })

export const ErrorDark = meta.story({ globals: { theme: 'dark' }, name: 'Met fout, donker', render: renderError })
