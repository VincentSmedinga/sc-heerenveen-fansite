import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { buttonAppearances } from '../button/Button'
import { sizes } from '../size'
import { IconButton, iconButtonIcons } from './IconButton'

// The type of the props as the table of controls shows it: the compiler gives `unknown[number]`
// for the lists.
const union = (values: readonly string[]) => ({ type: { summary: values.map((value) => `'${value}'`).join(' | ') } })

const meta = preview.meta({
  argTypes: {
    appearance: {
      control: 'radio',
      description: 'De uitvoering van de knop, zoals bij `Button`. Zonder `appearance` is hij zacht.',
      options: buttonAppearances,
      table: union(buttonAppearances),
    },
    icon: {
      control: 'radio',
      description: 'Het pictogram, het enige wat de knop laat zien.',
      options: iconButtonIcons,
      table: union(iconButtonIcons),
    },
    label: {
      description:
        'Wat de knop doet, met waarvoor: "Doelpunt 2 weghalen". Het is zijn naam voor een schermlezer en de tekst die verschijnt als je er met de muis op blijft staan. Verplicht.',
    },
    size: {
      control: 'radio',
      description: 'De maat van de knop.',
      options: sizes,
      table: union(sizes),
    },
  },
  component: IconButton,
  parameters: {
    docs: {
      description: {
        component: [
          'Een knop met alleen een pictogram, zoals een prullenbak om één rij uit een lijst te halen.',
          'Je kiest hem waar het pictogram iedereen bekend is en een rij knoppen met woorden onrustig zou worden; voor een hoofdactie blijft een `Button` met tekst de keuze.',
          'De `label` is de naam van de knop voor een schermlezer en verschijnt als tekst bij aanwijzen, dus geef hem altijd, met waarvoor de knop is.',
          'De knop is even groot en even goed te raken als een gewone knop.',
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

const variants = () => (
  <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
    {buttonAppearances.map((appearance) => (
      <IconButton appearance={appearance} icon="trash" key={appearance} label="Doelpunt 2 weghalen" type="button" />
    ))}
    <IconButton icon="trash" label="Doelpunt 2 weghalen" size="small" type="button" />
  </div>
)

export const Variants = meta.story({ name: 'Zacht, gevuld en gevaarlijk, en klein', render: variants })
