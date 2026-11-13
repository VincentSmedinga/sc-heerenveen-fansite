import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { sizes } from '../size'
import { Button, buttonAppearances, buttonIcons, buttonTypes } from './Button'

const meta = preview.meta({
  argTypes: {
    appearance: {
      control: 'radio',
      description: 'De uitvoering van de knop.',
      options: buttonAppearances,
    },
    icon: {
      control: 'radio',
      description: 'Een pictogram vóór de tekst.',
      options: buttonIcons,
    },
    size: {
      control: 'radio',
      description: 'De maat van de knop.',
      options: sizes,
    },
    type: {
      control: 'radio',
      description: 'Wat de knop doet. Verplicht.',
      options: buttonTypes,
    },
  },
  component: Button,
  parameters: {
    docs: {
      description: {
        component: [
          'Een knop laat de bezoeker iets doen, zoals een formulier versturen. De tekst zegt wat de knop doet, ook voor wie alleen de knop hoort.',
          'Kies de gevulde knop voor de hoofdactie, de zachte knop voor wat daarnaast kan, en de rode knop alleen voor wat je weghaalt. Zet niet twee gevulde knoppen naast elkaar.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Button',
})

export const Default = meta.story({
  args: { appearance: 'default', children: 'Versturen', type: 'button' },
  name: 'Knop',
})

export const Soft = meta.story({
  args: { appearance: 'soft', children: 'Laad 5 meer', type: 'button' },
  name: 'Zachte knop',
})

export const Danger = meta.story({
  args: { appearance: 'danger', children: 'Invoer weghalen', type: 'button' },
  name: 'Gevaarlijke knop',
})

export const WithIcon = meta.story({
  args: { children: 'Opslaan', icon: 'save', type: 'button' },
  name: 'Met pictogram',
})

export const Small = meta.story({
  args: { children: 'Versturen', size: 'small', type: 'button' },
  name: 'Kleine knop',
})
