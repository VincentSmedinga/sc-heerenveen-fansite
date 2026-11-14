import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { ExamplePage, ExamplePageWithSidebar } from '../../docs/ExamplePage'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De pagina is de bouwdoos van elke pagina van de site: een header, het hoofdmenu, een body en een footer, in die volgorde.',
          'Je kiest hem voor elke pagina; de inhoud zet je in de `Page.Main` in de `Page.Body`.',
          'Een pagina met veel kaarten, zoals Cijfers, deelt ze in groepen in (`CardGroup`): elke groep heeft een kop van niveau 2 onder een lijn, en de kaarten erin hebben een kop van niveau 3.',
          'De kaarten van een groep staan in twee kolommen als er plaats voor is. In een browser die CSS Grid Lanes kent, sluiten ze in een kolom op elkaar aan zonder gaten; elders staan ze in een raster. De volgorde van de bron is ook dan de volgorde voor het toetsenbord en een schermlezer.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Page>
  <Page.Header>…</Page.Header>
  <Navigation appearance="header" items={items} label="Hoofdmenu" />
  <Page.Body>
    <Page.Main>…</Page.Main>
  </Page.Body>
  <Page.Footer>…</Page.Footer>
</Page>`,
        language: 'tsx',
        type: 'code',
      },
      story: { iframeHeight: '30rem', inline: false },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page',
})

export const Default = meta.story({ name: 'Pagina', render: () => <ExamplePage /> })

export const WithSidebar = meta.story({
  name: 'Met zijbalk',
  parameters: {
    docs: {
      description: {
        story:
          'Een pagina met een zijbalk: de hoofdkolom en de zijbalk naast elkaar, en de cellen in elke kolom onder elkaar.',
      },
    },
  },
  render: () => <ExamplePageWithSidebar />,
})
