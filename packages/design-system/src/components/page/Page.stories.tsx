import preview from '#.storybook/preview'

import { ExamplePage, ExamplePageWithSidebar } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De pagina: zo breed als het venster, met de inhoud in een gecentreerde kolom met een maximale breedte, en een marge aan beide kanten.',
          'Een `Page` bevat een `Page.Header`, een `Page.Body` en een `Page.Footer`, in die volgorde.',
          'De achtergrond van de `Page.Header` loopt van rand tot rand; het logo en de navigatie, de `Page.Body` en de `Page.Footer` staan in de kolom.',
          '',
          'De breedte en de marge komen uit twee tokens: `--hf-page-max-width` (75 rem) en `--hf-page-margin` (1 rem).',
          'De `Page.Body` is het raster tussen de header en de footer, met een `Page.Main` en, op een pagina die er een heeft, een `Page.Sidebar`: zie de `Page.Body`.',
          'Het token `--hf-page-inset` is de ruimte aan de zijkanten die daaruit volgt, voor alles wat zo breed is als zijn ouder, ook buiten een `Page`.',
          'De pagina is minstens zo hoog als het scherm, zodat de footer onderaan blijft staan als er weinig inhoud is.',
          '',
          'De `Page` heeft geen eigen element met een rol.',
          'De `main` is de `Page.Main`, in de `Page.Body`, nooit in de `Page` zelf.',
          'Een `Page` hoort in een `Body`; de stories hieronder staan in een eigen venster, dat de hoogte van het scherm nabootst.',
          'De verhalen voor een smal en een breed scherm staan alleen in het canvas, met de instelling Viewport van de werkbalk.',
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

const renderWithSidebar = () => <ExamplePageWithSidebar />

// Storybook's viewport setting: the width of the window is what the page follows, not the width of a container.
const narrow = { value: 'mobile1' }
const wide = { value: 'wide' }

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

export const WithSidebarLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met zijbalk, licht',
  parameters: {
    docs: {
      description: {
        story:
          'Een pagina met een zijbalk: de hoofdkolom en de zijbalk naast elkaar, en de cellen in elke kolom onder elkaar.',
      },
    },
  },
  render: renderWithSidebar,
})

export const WithSidebarDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met zijbalk, donker',
  render: renderWithSidebar,
})

// Only on the canvas: on the docs page they would show the same as the stories above, because the docs page can't resize the window.
const screens = { tags: ['!autodocs'] }

const narrowDescription = 'Op een smal scherm gebruikt de inhoud de hele breedte, tussen de marges van 1 rem.'

const wideDescription =
  'Op een breed scherm staat de inhoud in de hoofdkolom, van 48 rem, in lijn met het logo. De rest van de kolom van de pagina blijft leeg, of is voor een zijbalk van 24 rem. De header en de footer lopen over de hele kolom.'

export const NarrowLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: narrow },
  name: 'Smal scherm, licht',
  parameters: { docs: { description: { story: narrowDescription } } },
  render,
})

export const NarrowDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: narrow },
  name: 'Smal scherm, donker',
  parameters: { docs: { description: { story: narrowDescription } } },
  render,
})

export const WideLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: wide },
  name: 'Breed scherm, licht',
  parameters: { docs: { description: { story: wideDescription } } },
  render,
})

export const WideDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: wide },
  name: 'Breed scherm, donker',
  parameters: { docs: { description: { story: wideDescription } } },
  render,
})
