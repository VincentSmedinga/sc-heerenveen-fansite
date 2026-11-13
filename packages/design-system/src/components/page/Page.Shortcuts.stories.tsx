import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { ExampleHeader, ExampleMain } from '../../docs/ExamplePage'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een balk direct onder het hoofdmenu met een label en een rij links naar de kaarten van de pagina.',
          'Je kiest hem voor een pagina waarvan de cellen op een telefoon onder elkaar staan; op een breed scherm is hij er niet, dus de verhalen staan alleen in het canvas, met een smal scherm bij Viewport.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Page.Shortcuts
  items={[
    { href: '#programma', label: 'Programma' },
    { href: '#uitslagen', label: 'Uitslagen' },
  ]}
  label="Op deze pagina:"
/>`,
        language: 'tsx',
        type: 'code',
      },
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

export const Default = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Snelkoppelingen',
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
          'Op een heel smal scherm, of bij sterk inzoomen, scrolt de rij niet meer maar loopt om. Zo valt er niets buiten beeld en scrolt de pagina niet zijwaarts. De balk volgt de lettergrootte van de bezoeker: met grotere tekst loopt de rij eerder om.',
      },
    },
  },
  render,
})

const sections = [
  { id: 'programma', title: 'Programma' },
  { id: 'uitslagen', title: 'Uitslagen' },
  { id: 'stand', title: 'Stand' },
  { id: 'doelpuntenmakers', title: 'Doelpuntenmakers' },
  { id: 'de-nul-gehouden', title: 'De nul gehouden' },
  { id: 'doelpunten-per-kwartier', title: 'Doelpunten per kwartier' },
]

const followParameters = {
  docs: {
    description: {
      story:
        'Een lange pagina van zes kaarten. Scrol de pagina: de link naar de kaart waar je bent staat vooraan in de rij, met een rode streep eronder. Hier is de pagina al tot de kop van Stand gescrold.',
    },
  },
}

// The page scrolls to a heading, as after a click on its link, so the bar has a current link.
const scrollToStand = () => {
  document.getElementById('stand')?.scrollIntoView({ behavior: 'instant', block: 'start' })
}

const renderLongPage = (_args: unknown, { globals }: { globals: Record<string, unknown> }) => (
  <>
    <ExampleHeader dark={globals['theme'] === 'dark'} />
    <Page.Shortcuts
      items={sections.map(({ id, title }) => ({ href: `#${id}`, label: title }))}
      label="Op deze pagina:"
    />
    <Page.Body>
      <Page.Main>
        {sections.map(({ id, title }) => (
          <Page.Cell key={id}>
            <Heading anchor id={id} level={2}>
              {title}
            </Heading>
            <Text>Hier staat wat bij {title.toLowerCase()} hoort. De kaart is lang genoeg om langs te scrollen.</Text>
            <Text>
              De balk onder de header blijft staan en laat zien in welk deel van de pagina je bent. De link naar dit
              deel staat dan vooraan in de rij.
            </Text>
            <Text>
              Een kaart kan lang zijn, zodat de kop van de volgende kaart pas na een tijd langs de balk komt. Tot dan
              blijft de link naar deze kaart de huidige.
            </Text>
          </Page.Cell>
        ))}
      </Page.Main>
    </Page.Body>
  </>
)

export const Follows = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Volgt de pagina',
  parameters: followParameters,
  play: scrollToStand,
  render: renderLongPage,
})
