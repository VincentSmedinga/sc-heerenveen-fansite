import preview from '#.storybook/preview'

import { exampleMenu } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { PageHeader } from '../page/PageHeader'
import { Navigation } from './Navigation'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een navigatie: een `nav` met een lijst met links.',
          '',
          '- `label` is verplicht: de naam voor schermlezers, zoals "Hoofdmenu".',
          '  Heeft een pagina meer dan één navigatie, dan krijgt elke een andere naam.',
          '- `items` is de lijst met links.',
          '  Elk item heeft een `href` en een `label`, de tekst van de link.',
          '- `current` op een item zet `aria-current="page"` op die link.',
          '  De huidige pagina is ook te zien zonder kleur: de link is vetter, met een dikkere onderstreping.',
          '',
          'In de header krijgen de links de kleuren van de header.',
          'De links zijn 44 pixels hoog en lopen op een smal scherm door op een tweede regel.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigation',
})

const render = () => <Navigation items={exampleMenu} label="Hoofdmenu" />

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

export const InHeader = meta.story({
  name: 'In de header',
  render: () => (
    <PageHeader>
      <Navigation items={exampleMenu} label="Hoofdmenu" />
    </PageHeader>
  ),
})
