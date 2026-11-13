import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { ExampleContent, ExampleMainWithSide } from '../../docs/ExamplePage'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De ruimte van de pagina tussen de header en de footer, met de `Page.Main` erin.',
          'Je kiest hem voor elke pagina, zodat de footer onderaan blijft staan als er weinig inhoud is.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Page.Body>
  <Page.Main>…</Page.Main>
</Page.Body>`,
        language: 'tsx',
        type: 'code',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Body',
})

const onlyMain = () => (
  <Page.Body>
    <Page.Main>
      <Page.Cell>
        <ExampleContent />
      </Page.Cell>
    </Page.Main>
  </Page.Body>
)

const withSidebar = () => (
  <Page.Body>
    <ExampleMainWithSide />
  </Page.Body>
)

export const Default = meta.story({
  name: 'Alleen een hoofdkolom',
  parameters: {
    docs: {
      description: { story: 'Alleen een hoofdkolom, met de hele inhoud in één cel.' },
    },
  },
  render: onlyMain,
})

export const WithSidebar = meta.story({
  name: 'Met zijbalk',
  parameters: {
    docs: {
      description: { story: 'Een pagina met gebieden: de kop bovenaan, en de hoofdinhoud met een zijkolom ernaast.' },
    },
  },
  render: withSidebar,
})
