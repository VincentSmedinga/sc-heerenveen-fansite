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
