import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { CardLink } from './CardLink'

const meta = preview.meta({
  argTypes: {
    children: { control: 'text', description: 'De tekst van de link. Hij zegt waar de link heen gaat.' },
    href: {
      control: 'text',
      description:
        'Waar de link heen gaat. Een pad blijft op de site; een adres met `https://` verlaat de site en krijgt het pictogram voor een externe link.',
    },
  },
  component: CardLink,
  parameters: {
    docs: {
      description: {
        component: [
          'De link op een eigen regel onderaan een kaart, zoals "Spelregels" of "Alle wedstrijden". Hij kiest zijn pictogram zelf, zodat geen kaart het vergeet: een pijltje, of het pictogram voor een externe link als hij de site verlaat.',
          'Het pictogram is versiering. Een link naar een andere site zegt dat ook in tekst voor een schermlezer, en het pictogram blijft bij het laatste woord.',
          'Een link in een zin, een link terug en een link in de navigatie blijven een `Link`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/CardLink',
})

export const Default = meta.story({
  args: { children: 'Alle wedstrijden', href: '#alle-wedstrijden' },
  name: 'Link met een pijltje',
})

export const External = meta.story({
  args: { children: 'Naar het forum', href: 'https://forum.heerenveen.org' },
  name: 'Externe link',
})

export const LongText = meta.story({
  args: {
    children: 'Alle voorspellingen van de wedstrijden van sc Heerenveen dit seizoen',
    href: '#alle-voorspellingen',
  },
  name: 'Lange tekst',
  parameters: {
    docs: {
      description: {
        story: 'Een lange tekst breekt over twee regels, en het pictogram blijft bij het laatste woord.',
      },
    },
  },
  render: (args) => (
    <div className="hf-flow" style={{ maxInlineSize: '16rem' }}>
      <CardLink {...args} />
    </div>
  ),
})

export const InCard = meta.story({
  name: 'Op een kaart',
  render: () => (
    <Card aria-labelledby="card-link-kop">
      <Heading appearance={3} id="card-link-kop" level={2}>
        Prognose
      </Heading>
      <Text>Voorspel de uitslag van de volgende wedstrijd.</Text>
      <CardLink href="#spelregels">Spelregels</CardLink>
      <CardLink href="https://forum.heerenveen.org">Praat mee op het forum</CardLink>
    </Card>
  ),
})
