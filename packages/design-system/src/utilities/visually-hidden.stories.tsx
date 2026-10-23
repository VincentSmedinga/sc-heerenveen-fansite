import preview from '#.storybook/preview'

import { Card } from '../components/card/Card'
import { Heading } from '../components/heading/Heading'
import { Text } from '../components/text/Text'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Wat de klasse `hf-visually-hidden` heeft, zie je niet, maar een schermlezer leest het wel voor.',
          'Het element blijft in de HTML en in de toegankelijkheidsboom, en neemt geen ruimte in.',
          'Gebruik de klasse voor tekst die de pagina al op een andere manier laat zien.',
          'Zo heeft de homepage een `h1` "sc Heerenveen Fansite" met deze klasse, want het logo erboven zegt dat al.',
          'Een component neemt de klasse over met `className`: `<Heading className="hf-visually-hidden" level={1}>`.',
          'Wil je iets voor iedereen verbergen, ook voor een schermlezer, gebruik dan het attribuut `hidden`.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Hulpklassen/Alleen voor schermlezers',
})

export const HiddenHeading = meta.story({
  name: 'Een kop die je niet ziet',
  parameters: {
    docs: {
      description: {
        story:
          'Boven de kaart staat de `h1` "sc Heerenveen Fansite". Je ziet hem niet, maar een schermlezer noemt hem als eerste kop.',
      },
    },
  },
  render: () => (
    <>
      <Heading className="hf-visually-hidden" level={1}>
        sc Heerenveen Fansite
      </Heading>
      <Card aria-labelledby="verborgen-kop-nieuws">
        <Heading id="verborgen-kop-nieuws" level={2}>
          Laatste nieuws
        </Heading>
        <Text>Hier staat het nieuws uit de media.</Text>
      </Card>
    </>
  ),
})
