import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card, cardSurfaces } from '../card/Card'
import { Button, buttonAppearances, buttonTypes } from './Button'

// The type of the props as the table of controls shows it: the compiler gives `unknown[number]` for the lists.
const union = (values: readonly string[]) => ({ type: { summary: values.map((value) => `'${value}'`).join(' | ') } })

const meta = preview.meta({
  argTypes: {
    appearance: {
      control: 'radio',
      description: 'De uitvoering van de knop.',
      options: buttonAppearances,
      table: union(buttonAppearances),
    },
    type: {
      control: 'radio',
      description: 'Wat de knop doet. Verplicht.',
      options: buttonTypes,
      table: union(buttonTypes),
    },
  },
  component: Button,
  parameters: {
    docs: {
      description: {
        component: [
          'Een knop. De tekst zegt wat de knop doet, zoals "Versturen", ook als je alleen de knop hoort.',
          '',
          'Met `type` kies je wat de knop doet. Je moet het altijd kiezen:',
          '',
          '- `submit`: verstuurt het formulier.',
          '- `button`: doet niets in het formulier. Hij is voor een actie met JavaScript.',
          '- `reset`: zet het formulier terug.',
          '',
          'Met `appearance` kies je hoe opvallend de knop is:',
          '',
          '- `default`: de gevulde knop, voor de hoofdactie van een formulier of pagina, zoals "Versturen" of "Inloggen". Zonder `appearance` krijg je deze.',
          '- `soft`: de zachte knop, voor wat daarnaast kan, zoals "Laad 5 meer". Is de knop niet de hoofdactie, gebruik dan deze.',
          '',
          'Zet niet twee gevulde knoppen naast elkaar: dan weet niemand welke de hoofdactie is.',
          'De zachte knop is even groot en even goed te raken als de gevulde. Zijn rand zorgt dat hij op elke kaart te zien is.',
          'In de modus met geforceerde kleuren van het besturingssysteem krijgen beide de rand van het systeem.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Button',
})

export const Default = meta.story({
  args: { appearance: 'default', children: 'Versturen', type: 'button' },
  name: 'Knop',
})

const surfaceLabels = { default: 'Vlak', soft: 'Zacht vlak', strong: 'Sterk vlak', warm: 'Warm vlak' } as const

const render = () => (
  <div style={{ display: 'grid', gap: '1rem', maxInlineSize: '40rem' }}>
    {cardSurfaces.map((surface) => (
      <Card aria-label={surfaceLabels[surface]} key={surface} surface={surface}>
        <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
          <Button type="button">Versturen</Button>
          <Button appearance="soft" type="button">
            Laad 5 meer
          </Button>
        </div>
      </Card>
    ))}
  </div>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Gevuld en zacht, licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Gevuld en zacht, donker', render })
