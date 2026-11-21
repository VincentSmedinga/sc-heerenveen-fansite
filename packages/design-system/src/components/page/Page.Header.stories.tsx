import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { ExampleBanner } from '../../docs/ExamplePage'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De bovenkant van de pagina: een `header` met het logo als link naar de homepage en de `ThemeButton`.',
          'Je kiest hem voor elke pagina; alles erin krijgt zelf de kleuren die bij de donkere achtergrond horen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Page.Header>
  <Link href="#home">
    <Logo />
  </Link>
  <ThemeButton label="Donker" />
</Page.Header>`,
        language: 'tsx',
        type: 'code',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Header',
})

const render = (_args: unknown, { globals }: { globals: Record<string, unknown> }) => (
  <ExampleBanner dark={globals['theme'] === 'dark'} />
)

export const Default = meta.story({ name: 'Header', render })

/** The header at a given width, which is what a phone gets. */
const bannerAt = (width: number) => (
  <div style={{ inlineSize: `${width}px`, maxInlineSize: '100%' }}>
    <ExampleBanner />
  </div>
)

const widthParameters = (width: number) => ({
  docs: { description: { story: `De kop op ${width} pixels breed. Het woordmerk blijft op één regel.` } },
  layout: 'fullscreen' as const,
})

export const Width360 = meta.story({
  name: 'Op 360 pixels',
  parameters: widthParameters(360),
  render: () => bannerAt(360),
})

export const Width390 = meta.story({
  name: 'Op 390 pixels',
  parameters: widthParameters(390),
  render: () => bannerAt(390),
})

export const Width600 = meta.story({
  name: 'Op 600 pixels, met "sinds 1997" ernaast',
  parameters: widthParameters(600),
  render: () => bannerAt(600),
})
