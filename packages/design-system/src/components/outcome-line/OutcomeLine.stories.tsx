import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { OutcomeLine } from './OutcomeLine'

const meta = preview.meta({
  args: {
    children: '9 gewonnen · 15 gelijk · 52 verloren · doelpunten 89–218',
    draws: 15,
    losses: 52,
    wins: 9,
  },
  argTypes: {
    children: { description: 'De tekst. Hij zegt hetzelfde als de balk en draagt de betekenis.' },
    draws: { description: 'Het aantal gelijke spelen.' },
    losses: { description: 'Het aantal verloren wedstrijden.' },
    wins: { description: 'Het aantal gewonnen wedstrijden.' },
  },
  component: OutcomeLine,
  parameters: {
    docs: {
      description: {
        component: [
          'Eén regel met de uitslagen van een lijst wedstrijden: een smalle balk in de kleuren van winst, gelijkspel en verlies, en de tekst ernaast.',
          'De balk is versiering en voor een schermlezer verborgen; de tekst draagt de betekenis.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/OutcomeLine',
})

export const Default = meta.story({ name: 'De uitslagen in één regel' })
