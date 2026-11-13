import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { ExampleMain } from '../../docs/ExamplePage'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De hoofdkolom van de pagina: een `main`, met de inhoud als cellen onder elkaar.',
          'Elke pagina heeft er één; kies `areas` als de pagina meer dan één kolom nodig heeft (zie Page.Main met gebieden).',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Page.Main>
  <Page.Cell>…</Page.Cell>
  <Text>Een cel in de hoofdkolom.</Text>
</Page.Main>`,
        language: 'tsx',
        type: 'code',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Main',
})

export const Default = meta.story({
  name: 'Hoofdkolom',
  parameters: {
    docs: {
      description: {
        story: 'Drie cellen: een kop met een inleiding, een tekst, en een lijst onder een kop.',
      },
    },
  },
  render: () => (
    <Page.Body>
      <ExampleMain />
    </Page.Body>
  ),
})
