import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { Text } from '../text/Text'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een `Page.Cell` zet wat bij elkaar hoort, zoals een kop met een inleiding, in één cel van de pagina.',
          'Je kiest hem als meer dan één ding samen één plek op de pagina moet krijgen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Page.Cell>
  <Heading appearance={3} level={2}>
    Zo lees je de site
  </Heading>
  <Text>Wat bij elkaar hoort, staat in één cel.</Text>
</Page.Cell>`,
        language: 'tsx',
        type: 'code',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Cell',
})

// The dashed lines show the cells. They are only in these stories.
const outline = '.hf-page-main > * { outline: 1px dashed var(--hf-colour-border-input); }'

export const Default = meta.story({
  name: 'Cellen',
  render: () => (
    <Page.Body>
      <style>{outline}</style>
      <Page.Main>
        <Page.Cell>
          <Heading level={1}>Een kop met een inleiding</Heading>
          <Text>De kop en deze tekst zijn samen één cel.</Text>
        </Page.Cell>
        <Text>Deze tekst is een cel op zich.</Text>
        <Page.Cell>
          <Heading appearance={3} level={2}>
            Een lijst onder een kop
          </Heading>
          <List>
            <List.Item>Ook een kop met een lijst is één cel.</List.Item>
            <List.Item>De lijst heeft geen ruimte onder zich.</List.Item>
          </List>
        </Page.Cell>
      </Page.Main>
    </Page.Body>
  ),
})
