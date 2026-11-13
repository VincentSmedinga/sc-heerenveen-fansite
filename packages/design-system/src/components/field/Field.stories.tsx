import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Input } from '../input/Input'
import { Field } from './Field'

const meta = preview.meta({
  args: {
    children: <Input autoComplete="name" name="naam" />,
    id: 'naam',
    label: 'Naam',
  },
  argTypes: {
    error: { control: 'text', description: 'De foutmelding, in gewone tekst. Het veld krijgt dan ook `aria-invalid`.' },
    hideOptional: {
      control: 'boolean',
      description: 'Laat "(niet verplicht)" weg uit het label, voor een formulier waarin de meeste velden dat zijn.',
    },
    hint: { control: 'text', description: 'Hulptekst onder het label, in gewone tekst.' },
    id: {
      control: 'text',
      description: 'De `id` van het veld. `Field` zet hem op het kind en koppelt het label eraan.',
    },
    label: { control: 'text', description: 'Wat de bezoeker invult. Een placeholder is geen label.' },
    required: {
      control: 'boolean',
      description: 'Of het veld verplicht is. Standaard wel: we vragen alleen wat we nodig hebben.',
    },
  },
  component: Field,
  parameters: {
    docs: {
      description: {
        component: [
          'Een veld met zijn label, zijn hulptekst en zijn foutmelding. `Field` zet ze in de goede volgorde en koppelt ze aan het veld, zodat een schermlezer ze bij het veld voorleest.',
          'Het veld zelf is het kind: een `Input`, een `Textarea` of een `Select`. Een fout staat in tekst, een rode rand is nooit het enige teken.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Field',
})

export const Default = meta.story({
  name: 'Veld',
})

export const WithHint = meta.story({
  args: {
    children: <Input autoComplete="email" name="e-mail" type="email" />,
    hint: 'Alleen als je antwoord wilt. We bewaren het niet langer dan nodig is.',
    id: 'e-mail',
    label: 'E-mailadres',
    required: false,
  },
  name: 'Met hulptekst',
})

export const WithError = meta.story({
  args: {
    children: <Input autoComplete="email" defaultValue="jelle" name="e-mail" type="email" />,
    error: 'Vul een e-mailadres in, zoals naam@voorbeeld.nl.',
    id: 'e-mail',
    label: 'E-mailadres',
  },
  name: 'Met fout',
})

export const HiddenOptional = meta.story({
  args: {
    children: <Input name="tijd" type="time" />,
    hideOptional: true,
    id: 'tijd',
    label: 'Tijd',
    required: false,
  },
  name: 'Zonder "niet verplicht"',
})
