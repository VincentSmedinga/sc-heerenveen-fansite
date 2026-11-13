import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Text } from '../text/Text'
import { Honeypot } from './Honeypot'

const meta = preview.meta({
  argTypes: {
    label: { control: 'text', description: 'De tekst voor een hulpmiddel dat het veld toch laat zien.' },
    name: { control: 'text', description: 'De naam van het veld. Kies er een die niets verklapt.' },
  },
  component: Honeypot,
  parameters: {
    docs: {
      description: {
        component: [
          'Een val tegen spam: een tekstveld dat niemand ziet. Een robot die elk veld invult, vult dit veld ook in, en de site weigert dan het formulier.',
          'Een mens komt er niet bij: het is verborgen, niet met Tab te bereiken, wordt niet voorgelezen en de browser vult het niet in. Geef het een `name` die geen veld van het formulier verklapt, zoals `website`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Honeypot',
})

export const Default = meta.story({
  args: { name: 'website' },
  name: 'Honeypot',
  parameters: {
    docs: {
      description: {
        story: 'In de kaart staat een `Honeypot`. Je ziet hem niet, hoort hem niet en bereikt hem niet met Tab.',
      },
    },
  },
  render: (args) => (
    <Card aria-label="Voorbeeld" surface="soft">
      <Text>Onder deze tekst staat een veld dat je niet ziet.</Text>
      <Honeypot {...args} />
    </Card>
  ),
})
