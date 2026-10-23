import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Text } from '../text/Text'
import { Honeypot } from './Honeypot'

const meta = preview.meta({
  component: Honeypot,
  parameters: {
    docs: {
      description: {
        component: [
          'Een val tegen spam: een tekstveld dat niemand ziet.',
          'Een robot die elk veld invult, vult dit veld ook in, en de site weet dan dat het formulier niet van een mens komt.',
          'De site weigert een formulier waarin het veld niet leeg is.',
          '',
          'Een mens komt er niet bij:',
          '',
          '- Je ziet het niet, want het is verborgen met de klasse `hf-visually-hidden`.',
          '  Het staat bewust niet op `display: none`, want dat herkennen robots.',
          '- Je bereikt het niet met Tab, want het is `inert` en heeft `tabIndex={-1}`.',
          '- Een schermlezer leest het niet voor, want het is `inert` en `aria-hidden`.',
          '- De browser en een wachtwoordmanager vullen het niet in, want het heeft `autoComplete="off"`.',
          '',
          'Zet het ergens in het formulier en geef het een `name` die geen veld van het formulier verklapt, zoals `website`.',
          'Het label staat er voor een hulpmiddel dat het veld toch laat zien; met `label` pas je de tekst aan.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Honeypot',
})

export const Default = meta.story({
  name: 'Honeypot',
  parameters: {
    docs: {
      description: {
        story: 'In de kaart staat een `Honeypot`. Je ziet hem niet, hoort hem niet en bereikt hem niet met Tab.',
      },
    },
  },
  render: () => (
    <Card aria-label="Voorbeeld" surface="soft">
      <Text>Onder deze tekst staat een veld dat je niet ziet.</Text>
      <Honeypot name="website" />
    </Card>
  ),
})
