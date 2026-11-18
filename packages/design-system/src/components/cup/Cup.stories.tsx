import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Cup } from './Cup'

const meta = preview.meta({
  component: Cup,
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijntekening van een beker, voor de kaart van een gewonnen beker.',
          'De tekening is versiering: een schermlezer slaat hem over, dus de tekst ernaast zegt waar hij voor staat.',
          'De lijnen nemen de kleur van de tekst eromheen, in licht en in donker.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Cup',
})

export const Default = meta.story({
  name: 'De beker',
  render: () => <Cup />,
})
