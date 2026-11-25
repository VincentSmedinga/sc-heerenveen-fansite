import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { type OpenGameCardItem, OpenGameCards } from './OpenGameCards'

const prognose: OpenGameCardItem = {
  game: 'prognose',
  href: '/fans/prognose',
  link: 'Voorspel de uitslag',
  linkName: 'Voorspel de uitslag van sc Heerenveen – FC Twente',
  name: 'Prognose',
}

const games: OpenGameCardItem[] = [
  prognose,
  {
    game: 'uitblinker',
    href: '/fans/uitblinker',
    link: 'Geef de spelers een cijfer',
    linkName: 'Geef de spelers een cijfer voor FC Utrecht – sc Heerenveen',
    name: 'Uitblinker',
  },
  {
    game: 'fjouwer',
    href: '/fans/fjouwer',
    link: 'Kies jouw fjouwer',
    linkName: 'Kies jouw fjouwer voor sc Heerenveen – FC Twente',
    name: 'Fjouwer',
  },
  {
    game: 'fantest',
    href: '/fans/fantest',
    link: 'Doe de test van november',
    linkName: 'Doe de test van november',
    name: 'Fantest',
  },
]

const meta = preview.meta({
  args: { items: games },
  argTypes: {
    items: { description: 'Een kaart per spel dat nu open is.' },
  },
  component: OpenGameCards,
  parameters: {
    docs: {
      description: {
        component:
          'De spellen die nu open zijn, als kleine kaarten naast elkaar, voor de voorpagina: de naam van het spel en een link die zegt wat je kunt doen.',
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/OpenGameCards',
})

export const Default = meta.story({ name: 'Vier spellen' })

export const OneGame = meta.story({ args: { items: [prognose] }, name: 'Eén spel' })

export const NarrowColumn = meta.story({
  decorators: [
    (Story) => (
      <div style={{ maxInlineSize: '16rem' }}>
        <Story />
      </div>
    ),
  ],
  name: 'In een smalle kolom',
})
