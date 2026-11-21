import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Text } from '../text/Text'
import { GameHeading } from './GameHeading'

const meta = preview.meta({
  argTypes: {
    children: { description: 'De naam van het spel.' },
    id: { description: 'De `id` van de kop, voor de `aria-labelledby` van de kaart.' },
    level: { description: 'Het niveau van de kop.' },
    meta: { description: 'De kleine tekst naast de naam.' },
  },
  component: GameHeading,
  decorators: [
    (Story) => (
      <Card aria-labelledby="kop" game="prognose">
        <Story />
        <Text>48 supporters voorspelden deze wedstrijd.</Text>
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'De kop van de kaart van een spel, op een pagina die niet de pagina van het spel zelf is, zoals de pagina van een wedstrijd: de naam van het spel met "Van supporters" ernaast.',
          'Op een smalle kaart komt de kleine tekst onder de naam.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/GameHeading',
})

export const Default = meta.story({
  args: { children: 'Prognose', id: 'kop', level: 2, meta: 'Van supporters' },
  name: 'Naam met kleine tekst',
})
