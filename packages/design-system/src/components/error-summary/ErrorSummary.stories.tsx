import preview from '#.storybook/preview'

import { ErrorSummary } from './ErrorSummary'

const meta = preview.meta({
  component: ErrorSummary,
  parameters: {
    docs: {
      description: {
        component: [
          'Een blok bovenaan een formulier met een kop en een link naar elk veld met een fout.',
          'Zo ziet iemand meteen wat er mis is, en komt hij met één klik bij het veld.',
          'De link gaat naar de `id` van het veld, dezelfde als die van de `Field`.',
          'Elke fout staat ook bij het veld zelf, in dezelfde woorden.',
          '',
          'Het blok is een gebied met de kop als naam.',
          'Met `level` kies je het niveau van de kop in de structuur van de pagina, met `title` de tekst.',
          'Zonder fouten laat het blok niets zien.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/ErrorSummary',
})

const errors = [
  { id: 'naam', message: 'Vul je naam in.' },
  { id: 'e-mail', message: 'Vul een e-mailadres in, zoals naam@voorbeeld.nl.' },
]

const render = () => <ErrorSummary errors={errors} level={2} />

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Twee fouten, licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Twee fouten, donker', render })
