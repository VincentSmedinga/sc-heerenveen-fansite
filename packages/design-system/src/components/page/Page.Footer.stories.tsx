import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { ExampleFooter, ExampleHeader } from '../../docs/ExamplePage'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De onderkant van de pagina: een `footer` met twee regels tekst en de links over de site, in een `Navigation`.',
          'Je kiest hem voor elke pagina; de strepen van de Friese vlag horen erbij, dus je hoeft er niets voor te doen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Page.Footer>
  <Text appearance="meta">Alles over onze club op één plek.</Text>
  <Navigation items={[{ href: '#over-ons', label: 'Over ons' }]} label="Over de site" />
</Page.Footer>`,
        language: 'tsx',
        type: 'code',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Footer',
})

const render = () => <ExampleFooter />

// A short page, so the stripes above the footer are in view.
// The footer alone would show only the part over it.
const renderOnShortPage = () => (
  <Page>
    <ExampleHeader />
    <Page.Body>
      <Page.Main>
        <Page.Cell>
          <Heading level={1}>Een korte pagina</Heading>
          <Text>Met weinig inhoud, zodat de strepen boven de footer helemaal te zien zijn.</Text>
        </Page.Cell>
      </Page.Main>
    </Page.Body>
    <ExampleFooter />
  </Page>
)

export const Default = meta.story({ name: 'Footer', render })

const shortPageParameters = {
  docs: {
    description: {
      story:
        'Op een korte pagina zijn de strepen helemaal te zien: over de footer, en daarboven naar boven vervagend, achter de inhoud.',
    },
    story: { iframeHeight: '30rem', inline: false },
  },
}

export const ShortPage = meta.story({
  name: 'Strepen op een korte pagina',
  parameters: shortPageParameters,
  render: renderOnShortPage,
})
