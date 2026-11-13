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
          'Een ronde knop als laatste in de `Page.Footer` die de bezoeker terugbrengt naar de bovenkant van de pagina.',
          'Je kiest hem voor een lange pagina; hij is er alleen als hij nuttig is, en werkt ook zonder JavaScript.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Page.TopLink label="Naar boven" />`,
        language: 'tsx',
        type: 'code',
      },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.TopLink',
})

// A short page can't scroll, so the link would stay hidden there. This lifts the rule, so the
// link shows on a short page. It is outside the layers, so it wins over top-link.css.
const showAlways = <style>{'.hf-page-top-link { animation: none; visibility: visible; }'}</style>

const renderOnShortPage = (_args: unknown, { globals }: { globals: Record<string, unknown> }) => (
  <Page>
    {showAlways}
    <ExampleHeader dark={globals['theme'] === 'dark'} />
    <Page.Body>
      <Page.Main>
        <Page.Cell>
          <Heading level={1}>Een korte pagina</Heading>
          <Text>
            De regel is hier opgeheven, zodat de knop in de footer te zien is. Op een echte korte pagina is hij er niet.
          </Text>
        </Page.Cell>
      </Page.Main>
    </Page.Body>
    <ExampleFooter topLink />
  </Page>
)

const shortPageParameters = {
  docs: { story: { iframeHeight: '30rem', inline: false } },
}

export const Default = meta.story({
  name: 'Op een korte pagina',
  parameters: shortPageParameters,
  render: renderOnShortPage,
})

const renderOnLongPage = (_args: unknown, { globals }: { globals: Record<string, unknown> }) => (
  <Page>
    <ExampleHeader dark={globals['theme'] === 'dark'} />
    <Page.Body>
      <Page.Main>
        <Page.Cell>
          <Heading level={1}>Een lange pagina</Heading>
          <Text>
            Scrol naar beneden. De knop in de footer verschijnt zodra de pagina verder is gescrold dan de hoogte van het
            venster.
          </Text>
        </Page.Cell>
        <div style={{ blockSize: '250vh' }} />
      </Page.Main>
    </Page.Body>
    <ExampleFooter topLink />
  </Page>
)

export const LongPage = meta.story({
  globals: { theme: 'light' },
  name: 'Een lange pagina: de regel werkt',
  parameters: {
    docs: {
      description: {
        story:
          'Hier is de regel niet opgeheven. Bovenaan is de knop er niet, en niet bereikbaar met Tab. Onderaan de pagina is hij er wel.',
      },
      story: { iframeHeight: '30rem', inline: false },
    },
  },
  render: renderOnLongPage,
})
