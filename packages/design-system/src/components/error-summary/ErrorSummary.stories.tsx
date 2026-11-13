import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { ErrorSummary } from './ErrorSummary'

const meta = preview.meta({
  args: { errors: [], level: 2 },
  argTypes: {
    errors: { description: 'De fouten: de `id` van het veld en de melding, dezelfde als bij het veld zelf.' },
    level: { control: 'radio', description: 'Het niveau van de kop in de structuur van de pagina.', options: [2, 3] },
    title: { control: 'text', description: 'De tekst van de kop.' },
  },
  component: ErrorSummary,
  parameters: {
    docs: {
      description: {
        component: [
          'Een blok bovenaan een formulier met een link naar elk veld met een fout, zodat de bezoeker meteen ziet wat er mis is en met één klik bij het veld komt.',
          'Zet het blok boven het formulier, buiten het `Form`. Zonder fouten laat het niets zien.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/ErrorSummary',
})

const errors = [
  { id: 'naam', message: 'Vul je naam in.' },
  { id: 'e-mail', message: 'Vul een e-mailadres in, zoals naam@voorbeeld.nl.' },
]

export const Default = meta.story({ args: { errors, level: 2 }, name: 'Twee fouten' })
