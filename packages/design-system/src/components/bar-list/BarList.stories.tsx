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
          'Staat er een eenheid achter het getal, zoals een procent, geef die dan mee met `unit`; de balken blijven even lang als de getallen.',
          'De balken zijn dik, groen en staan op een spoor: groen is hier een aantal, dezelfde kleur als in een tabel en een staafdiagram.',
          'Moet één regel opvallen, markeer die dan met `highlight`, en zeg ook in de naam waarom.',
          'Heeft de lijst weinig ruimte, zoals met grote tekst op een telefoon, dan staat de balk onder de naam en het getal.',
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

export const Percentages = meta.story({
  args: {
    rows: [
      { label: 'Vente', value: 71 },
      { label: 'Noppert', value: 44 },
      { label: 'Proper', value: 39 },
    ],
    unit: '%',
    wide: true,
  },
  name: 'Met een eenheid achter het getal',
  render: (args) => (
    <div style={{ maxInlineSize: '24rem' }}>
      <Card aria-labelledby="balken-procent">
        <Heading id="balken-procent" level={2}>
          Het vaakst gekozen
        </Heading>
        <BarList {...args} />
      </Card>
    </div>
  ),
})

export const MarkedRow = meta.story({
  args: {
    rows: [
      {
        highlight: true,
        label: (
          <>
            <strong>2–1</strong> (uitslag)
          </>
        ),
        value: 14,
      },
      { label: '1–0', value: 11 },
      { label: '1–1', value: 8 },
      { label: 'anders', value: 15 },
    ],
  },
  name: 'Met een gemarkeerde regel',
  render: (args) => (
    <div style={{ maxInlineSize: '24rem' }}>
      <Card aria-labelledby="balken-gemarkeerd">
        <Heading id="balken-gemarkeerd" level={2}>
          Meest voorspelde eindstanden
        </Heading>
        <BarList {...args} />
      </Card>
    </div>
  ),
})

export const LittleRoom = meta.story({
  args: {
    rows: [
      { highlight: true, label: <Link href="#">Verenigd Koninkrijk</Link>, value: 1170 },
      { label: 'Nederland', value: 640 },
      { label: 'Denemarken', value: 90 },
    ],
    unit: ' min',
    wide: true,
  },
  name: 'Met weinig ruimte',
  render: (args) => (
    <div style={{ maxInlineSize: '13rem' }}>
      <Card aria-labelledby="balken-smal">
        <Heading id="balken-smal" level={2}>
          Minuten per land
        </Heading>
        <BarList {...args} />
      </Card>
    </div>
  ),
})
