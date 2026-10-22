import preview from '#.storybook/preview'

import { ExamplePage } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De pagina: een gecentreerde kolom met een maximale breedte, en op een smal scherm een marge aan beide kanten.',
          'Een `Page` bevat een `Page.Header`, een `Page.Body` en een `Page.Footer`, in die volgorde.',
          '',
          'De breedte en de marge komen uit twee tokens: `--hf-page-max-width` (75 rem) en `--hf-page-margin` (1 rem).',
          'De pagina is minstens zo hoog als het scherm, zodat de footer onderaan blijft staan als er weinig inhoud is.',
          '',
          'De `Page` heeft geen eigen element met een rol.',
          'De `main` zit in de `Page.Body` of dieper, nooit in de `Page` zelf.',
          'Een `Page` hoort in een `Body`; de stories hieronder staan in een eigen venster, dat de hoogte van het scherm nabootst.',
        ].join('\n'),
      },
      source: exampleSource,
      story: { iframeHeight: '30rem', inline: false },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Page',
})

const render = () => <ExamplePage />

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
