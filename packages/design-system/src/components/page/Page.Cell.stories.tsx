import preview from '#.storybook/preview'

import { exampleSource } from '../../docs/exampleSource'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { Text } from '../text/Text'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Zet wat bij elkaar hoort in één cel van een kolom, zoals een kop met een inleiding.',
          'Het is een `div` zonder rol.',
          '',
          '- Elk kind van een `Page.Main` of een `Page.Sidebar` is al een cel. Een `Page.Cell` maakt van meer dingen één cel.',
          '- Wat erin staat houdt de ruimte die het zelf heeft, zoals tussen een kop en de tekst eronder, en heeft geen marge naar buiten.',
          '- De ruimte tussen de cellen komt van de `Page.Body`.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Page.Cell',
})

// The dashed lines show the cells. They are only in these stories.
const outline = '.hf-page-main > *, .hf-page-sidebar > * { outline: 1px dashed var(--hf-colour-border-input); }'

const render = () => (
  <Page.Body>
    <style>{outline}</style>
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Een kop met een inleiding</Heading>
        <Text>De kop en deze tekst zijn samen één cel, dus de ruimte ertussen is die van de tekst zelf.</Text>
      </Page.Cell>
      <Text>Deze tekst is een cel op zich. De ruimte tussen de cellen is overal even groot.</Text>
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
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
