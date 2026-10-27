import preview from '#.storybook/preview'

import { ExampleHeader, ExampleMain } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een balk direct onder de header, met een label en een rij links die zijwaarts scrolt.',
          'Hij is er voor een pagina waarvan de cellen op een smal scherm onder elkaar staan: een lange cel verbergt dan de cellen erna, en de balk springt ernaartoe.',
          'Zet hem tussen de `Page.Header` en de `Page.Body`, buiten de `main`.',
          'Het label zegt wat de links zijn en is ook de naam van de navigatie.',
          'Het blijft staan als de rij scrolt.',
          'De laatste zichtbare link is half afgesneden en de rij vervaagt aan de rand, zodat je ziet dat er meer is.',
          'Op een breed scherm, waar de cellen naast elkaar staan, is de balk er niet, ook niet voor een schermlezer.',
          'Een link is niet de huidige pagina: de balk markeert er geen.',
          '',
          'De balk heeft alleen op een smal scherm iets te laten zien, dus de verhalen staan alleen in het canvas.',
          'Kies bij Viewport in de werkbalk een smal scherm.',
        ].join('\n'),
      },
      source: exampleSource,
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Shortcuts',
})

const cards = [
  { href: '#programma', label: 'Programma' },
  { href: '#uitslagen', label: 'Uitslagen' },
  { href: '#stand', label: 'Stand' },
  { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
  { href: '#de-nul-gehouden', label: 'De nul gehouden' },
  { href: '#doelpunten-per-kwartier', label: 'Doelpunten per kwartier' },
]

const renderWith =
  (items: readonly { href: string; label: string }[]) =>
  (_args: unknown, { globals }: { globals: Record<string, unknown> }) => (
    <>
      <ExampleHeader dark={globals['theme'] === 'dark'} />
      <Page.Shortcuts items={items} label="Op deze pagina:" />
      <Page.Body>
        <ExampleMain />
      </Page.Body>
    </>
  )

const render = renderWith(cards)

// Only on the canvas, with Storybook's viewport setting: the bar is gone from the width where
// the body has two columns, and the docs page is wider than that.
const phone = { tags: ['!autodocs'] }

export const Light = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Licht',
  render,
})

export const Dark = meta.story({
  ...phone,
  globals: { theme: 'dark', viewport: { value: 'mobile2' } },
  name: 'Donker',
  render,
})

export const FewLinks = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Weinig links',
  parameters: {
    docs: { description: { story: 'Met weinig links past de rij en scrolt er niets, dus er is ook geen vervaging.' } },
  },
  render: renderWith(cards.slice(0, 3)),
})

export const Wrapped = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile1' } },
  name: 'Smal scherm: de rij loopt om',
  parameters: {
    docs: {
      description: {
        story:
          'Op een scherm van 20em of smaller, of bij 400% zoom, scrolt de rij niet meer maar loopt om. Zo valt er niets buiten beeld en scrolt de pagina niet zijwaarts. De maat volgt de lettergrootte van de bezoeker.',
      },
    },
  },
  render,
})

export const WrappedDark = meta.story({
  ...phone,
  globals: { theme: 'dark', viewport: { value: 'mobile1' } },
  name: 'Smal scherm: de rij loopt om, donker',
  render,
})

const statesParameters = {
  docs: {
    description: {
      story:
        'De toestanden van een link, nagebootst met de add-on Pseudo States: de eerste onder de muis, de tweede ingedrukt, de derde met de focus. In rust heeft een link geen onderstreping.',
    },
  },
  pseudo: {
    active: ['.hf-page-shortcuts li:nth-child(2) a'],
    focusVisible: ['.hf-page-shortcuts li:nth-child(3) a'],
    hover: ['.hf-page-shortcuts li:nth-child(1) a'],
  },
}

export const StatesLight = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Toestanden',
  parameters: statesParameters,
  render,
})

export const StatesDark = meta.story({
  ...phone,
  globals: { theme: 'dark', viewport: { value: 'mobile2' } },
  name: 'Toestanden, donker',
  parameters: statesParameters,
  render,
})
