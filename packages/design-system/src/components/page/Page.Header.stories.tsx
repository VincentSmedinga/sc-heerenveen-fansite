import preview from '#.storybook/preview'

import { ExampleHeader } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De bovenkant van de pagina: een `header`, dus de banner van de pagina.',
          'De achtergrond loopt van de linker- tot de rechterrand van het venster, op elke breedte.',
          'Wat erin staat, blijft in de kolom van de pagina, in lijn met de inhoud eronder.',
          'De verhalen voor een smal en een breed scherm staan alleen in het canvas, met de instelling Viewport van de werkbalk.',
          'De header is in licht en donker donkerblauw.',
          'Daarom krijgt alles erin andere kleuren voor tekst, links en de focusrand: licht op donker.',
          'Een component in de header hoeft daar niets voor te doen.',
          '',
          'De focusrand in de header heeft de kleur `--hf-colour-focus-on-header` (blauw-300).',
          'De gewone focusrand haalt het contrast op het donkere blauw in het lichte thema niet.',
          'Dit en de rest van de contrasten staan bij [Tokens › Kleur](?path=/docs/tokens-kleur--documentatie).',
          '',
          'De inhoud van de header zet je zelf neer: meestal het logo als link naar de homepage, met de `Navigation` ernaast.',
          'Ze staan naast elkaar en lopen op een smal scherm onder elkaar.',
        ].join('\n'),
      },
      source: exampleSource,
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Page.Header',
})

const render = () => <ExampleHeader />

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

// Only on the canvas, with Storybook's viewport setting: on the docs page they would show the same as the stories above.
const screens = { tags: ['!autodocs'] }

export const NarrowLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: { value: 'mobile1' } },
  name: 'Smal scherm, licht',
  render,
})

export const NarrowDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: { value: 'mobile1' } },
  name: 'Smal scherm, donker',
  render,
})

export const WideLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: { value: 'wide' } },
  name: 'Breed scherm, licht',
  render,
})

export const WideDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: { value: 'wide' } },
  name: 'Breed scherm, donker',
  render,
})

const focusParameters = {
  docs: {
    description: {
      story:
        'De focusrand op de link om het logo en op de link naar de huidige pagina, nagebootst met de add-on Pseudo States. Met de Tab-toets zie je de echte focusrand.',
    },
  },
  pseudo: { focusVisible: ['.hf-page-header > a', '.hf-navigation-link[aria-current="page"]'] },
}

export const FocusLight = meta.story({
  globals: { theme: 'light' },
  name: 'Focus in licht',
  parameters: focusParameters,
  render,
})

export const FocusDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Focus in donker',
  parameters: focusParameters,
  render,
})
