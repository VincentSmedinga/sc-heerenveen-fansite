import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { buttonAppearances } from '../button/Button'
import { sizes } from '../size'
import { IconButton, iconButtonIcons } from './IconButton'

const meta = preview.meta({
  argTypes: {
    appearance: {
      control: 'radio',
      description: 'De uitvoering van de knop, zoals bij `Button`. Zonder `appearance` is hij zacht.',
      options: buttonAppearances,
    },
    icon: {
      control: 'radio',
      description: 'Het pictogram, het enige wat de knop laat zien.',
      options: iconButtonIcons,
    },
    label: {
      description:
        'Wat de knop doet, met waarvoor: "Doelpunt 2 weghalen". Het is zijn naam voor een schermlezer en de tekst die verschijnt als je er met de muis op blijft staan. Verplicht.',
    },
    size: {
      control: 'radio',
      description: 'De maat van de knop.',
      options: sizes,
    },
  },
  component: IconButton,
  parameters: {
    docs: {
      description: {
        component: [
          'Een knop met alleen een pictogram, zoals een prullenbak om één rij uit een lijst te halen. Kies hem waar het pictogram iedereen bekend is; voor een hoofdactie blijft een `Button` met tekst de keuze.',
          'De `label` is de naam van de knop voor een schermlezer en verschijnt als tekst bij aanwijzen, dus geef hem altijd, met waarvoor de knop is.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/IconButton',
})

export const Default = meta.story({
  args: { icon: 'trash', label: 'Doelpunt 2 weghalen', type: 'button' },
  name: 'Knop met alleen een pictogram',
})

export const Danger = meta.story({
  args: { appearance: 'danger', icon: 'trash', label: 'Doelpunt 2 weghalen', type: 'button' },
  name: 'Gevaarlijke knop',
})

export const Small = meta.story({
  args: { icon: 'trash', label: 'Doelpunt 2 weghalen', size: 'small', type: 'button' },
  name: 'Kleine knop',
})
