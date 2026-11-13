import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { BarList } from './BarList'

const meta = preview.meta({
  argTypes: {
    rows: { description: 'De regels van boven naar onder: de naam, bijvoorbeeld een link, en het getal.' },
  },
  component: BarList,
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst met liggende balken, één regel per naam, zoals de doelpunten van een speler per seizoen.',
          'De naam en het getal zijn de tekst van de lijst; de balk is versiering die een schermlezer overslaat. Zet de lijst in een `Card` onder een kop van niveau 2 die zegt wat de balken tellen.',
          'Hij is gebouwd uit `Bar`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/BarList',
})

export const Default = meta.story({
  args: {
    rows: [
      { label: <Link href="#">2002/03</Link>, value: 5 },
      { label: <Link href="#">2003/04</Link>, value: 19 },
      { label: <Link href="#">2007/08</Link>, value: 6 },
      { label: <Link href="#">2008/09</Link>, value: 0 },
    ],
  },
  name: 'Doelpunten per seizoen',
  render: (args) => (
    <div style={{ maxInlineSize: '24rem' }}>
      <Card aria-labelledby="balken-een">
        <Heading id="balken-een" level={2}>
          Doelpunten per seizoen
        </Heading>
        <BarList {...args} />
      </Card>
    </div>
  ),
})

export const OnSoftCard = meta.story({
  args: {
    rows: [
      { label: <Link href="#">2002/03</Link>, value: 5 },
      { label: <Link href="#">2003/04</Link>, value: 19 },
      { label: <Link href="#">2007/08</Link>, value: 6 },
    ],
  },
  name: 'Op een zacht vlak, in de zijkolom',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="balken-zacht" surface="soft">
        <Heading id="balken-zacht" level={2}>
          Doelpunten per seizoen
        </Heading>
        <BarList {...args} />
      </Card>
    </div>
  ),
})
