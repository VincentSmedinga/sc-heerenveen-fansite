import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Cup } from './Cup'

const meta = preview.meta({
  component: Cup,
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijntekening van de Denneappel, de beker van de KNVB Beker, voor de kaart van een gewonnen beker.',
          'De tekening is versiering: een schermlezer slaat hem over. Hij staat in het midden van zijn kaart en heeft een lichte vulling.',
          'De lijnen nemen de kleur van de tekst eromheen en de vulling die van een lichte vlakte, in licht en in donker.',
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
