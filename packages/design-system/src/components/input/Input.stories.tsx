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
          'Met `size="small"` is het veld lager, voor een veld naast de inhoud; in het hoofdstuk Maten van knoppen en velden staat wanneer je welke maat kiest.',
          'Heeft het veld een fout (`aria-invalid`), dan is de rand dikker en heeft hij de kleur van fouten.',
          '`Field` zet dat attribuut; de foutmelding zelf staat in tekst.',
          '',
          'Zonder `width` is het veld zo breed als de regel, tot een maximum.',
          'Met `width="narrow"` is het smal, voor een paar tekens zoals een score of een minuut, en met `width="natural"` heeft het de breedte die de browser aan een datum of een tijd geeft.',
          'Een naam of een zin houdt de standaardbreedte.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Input',
})

const render = () => (
  <>
    <Field id="naam" label="Naam">
      <Input autoComplete="name" name="naam" />
    </Field>
    <Field id="e-mail" label="E-mailadres">
      <Input autoComplete="email" name="e-mail" type="email" />
    </Field>
    <Field id="link" label="Link naar het bericht" required={false}>
      <Input name="link" type="url" />
    </Field>
  </>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

const small = () => (
  <Field id="zoeken" label="Zoeken">
    <Input name="zoeken" size="small" type="search" />
  </Field>
)

export const SmallLight = meta.story({ globals: { theme: 'light' }, name: 'Kleine maat, licht', render: small })

export const SmallDark = meta.story({ globals: { theme: 'dark' }, name: 'Kleine maat, donker', render: small })

const widths = () => (
  <>
    <Field id="minuut" label="Minuut">
      <Input inputMode="numeric" name="minuut" width="narrow" />
    </Field>
    <Field id="datum" label="Datum">
      <Input name="datum" type="date" width="natural" />
    </Field>
    <Field id="tijd" label="Tijd">
      <Input name="tijd" type="time" width="natural" />
    </Field>
    <Field id="naam-lang" label="Naam">
      <Input name="naam-lang" />
    </Field>
  </>
)

export const Widths = meta.story({ name: 'Breedtes die bij het antwoord passen', render: widths })
