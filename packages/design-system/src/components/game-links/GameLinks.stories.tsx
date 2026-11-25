import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Match } from '../match/Match'
import { type GameLinkItem, GameLinks } from './GameLinks'

const match = 'sc Heerenveen – FC Twente'

const upcoming: GameLinkItem[] = [
  { game: 'prognose', href: '/fans/prognose', match, text: 'Wat denk je dat het wordt?' },
  { game: 'fjouwer', href: '/fans/fjouwer', match, text: 'Welke fjouwer stel jij op?' },
]

const meta = preview.meta({
  args: { items: upcoming },
  argTypes: {
    items: { description: 'Een link per spel dat voor de wedstrijd open is.' },
  },
  component: GameLinks,
  decorators: [
    (Story) => (
      <>
        <Match
          competition="Eredivisie"
          dateTime="2026-11-28T15:45:00Z"
          home
          opponent="FC Twente"
          round="Speelronde 14"
          status="scheduled"
          time="za 28 nov 16:45"
        />
        <Story />
      </>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: 'De links naar de spellen die open zijn voor een wedstrijd, direct onder die wedstrijd.',
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/GameLinks',
})

export const Default = meta.story({ name: 'Voor de komende wedstrijd' })

export const LastMatch = meta.story({
  args: { items: [{ game: 'uitblinker', href: '/fans/uitblinker', match, text: 'Wie vond jij de besten?' }] },
  name: 'Na de laatste wedstrijd',
})
