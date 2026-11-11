import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { FigureList } from './FigureList'

const meta = preview.meta({
  component: FigureList,
  parameters: {
    docs: {
      description: {
        component: [
          'Een cijferlijst zet een paar namen onder elkaar, elk met een getal aan het eind van de regel.',
          'Kies hem voor een klein blok in een zijkolom, zoals de doelpunten van een speler per competitie. Cijfers in kolommen zijn een `DataTable`.',
          'Elke regel is een `FigureList.Item`, dat alleen in een cijferlijst werkt.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/FigureList',
})

export const Default = meta.story({
  name: 'Cijferlijst',
  render: (args) => (
    <Card surface="soft">
      <Heading level={2}>Doelpunten per competitie</Heading>
      <FigureList {...args}>
        <FigureList.Item figure={12}>Eredivisie</FigureList.Item>
        <FigureList.Item figure={3}>Europa League</FigureList.Item>
        <FigureList.Item figure={1}>KNVB Beker</FigureList.Item>
      </FigureList>
    </Card>
  ),
})

export const Ranked = meta.story({
  name: 'Genummerd, met links',
  render: () => (
    <Card surface="soft">
      <Heading level={2}>Vaakst raak tegen</Heading>
      <FigureList as="ol">
        <FigureList.Item figure={6}>
          <Link href="#">FC Utrecht</Link>
        </FigureList.Item>
        <FigureList.Item figure={3}>
          <Link href="#">Koninklijke Voetbalvereniging Sint-Truidense Voetbalvereniging</Link>
        </FigureList.Item>
      </FigureList>
    </Card>
  ),
})
