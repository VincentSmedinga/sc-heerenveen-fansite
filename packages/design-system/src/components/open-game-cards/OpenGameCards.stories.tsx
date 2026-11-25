import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { type OpenGameCardItem, OpenGameCards } from './OpenGameCards'

const prognose: OpenGameCardItem = {
  game: 'prognose',
  href: '/fans/prognose',
  link: 'Voorspel',
  linkName: 'Voorspel sc Heerenveen – FC Twente',
  name: 'Prognose',
  tag: 'Open tot za 16.45',
}

const games: OpenGameCardItem[] = [
  prognose,
  {
    game: 'uitblinker',
    href: '/fans/uitblinker',
    link: 'Geef cijfers',
    linkName: 'Geef cijfers voor FC Utrecht – sc Heerenveen',
    name: 'Uitblinker',
    tag: 'Open tot do 20.00',
  },
  {
    game: 'fjouwer',
    href: '/fans/fjouwer',
    link: 'Kies je vier',
    linkName: 'Kies je vier voor sc Heerenveen – FC Twente',
    name: 'Fjouwer',
    tag: 'Open tot za 16.45',
  },
  {
    game: 'fantest',
    href: '/fans/fantest',
    link: 'Doe de test',
    linkName: 'Doe de test van november',
    name: 'Fantest',
    tag: 'Open tot ma 30 nov 23.59',
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
          'De spellen die nu open zijn, als kleine kaarten naast elkaar, voor de voorpagina: de naam van het spel, tot wanneer het open is en een korte link.',
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
