import { expect } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Tile, tileLevels } from './Tile'

// The type of the props as the table of controls shows it: the compiler gives `unknown[number]`
// for the lists.
const union = (values: readonly (number | string)[]) => ({
  type: { summary: values.map((value) => (typeof value === 'number' ? value : `'${value}'`)).join(' | ') },
})

const icons = ['ball', 'chart', 'document', 'speech'] as const

const meta = preview.meta({
  argTypes: {
    children: { control: 'text', description: 'De beschrijving: één regel in gewone woorden.' },
    href: { control: 'text', description: 'Waar de tegel heen gaat. De hele tegel is de link.' },
    icon: {
      control: 'select',
      description: 'Een pictogram vóór de kop. Het is er alleen voor het oog en kan ontbreken.',
      options: [undefined, ...icons],
    },
    level: {
      control: 'radio',
      description: 'Het niveau van de kop in de opbouw van de pagina.',
      options: tileLevels,
      table: union(tileLevels),
    },
    title: { control: 'text', description: 'De naam van de plek. Het is de kop en de tekst van de link.' },
  },
  component: Tile,
  parameters: {
    docs: {
      description: {
        component: [
          'Een tegel is een kaart die één link is, naar een plek op de site: een kop met de naam van de plek, een regel beschrijving en eventueel een pictogram.',
          'Kies hem voor een startpagina waar de bezoeker een plek kiest, zoals de startpagina van het beheer; een kaart met inhoud blijft een `Card`.',
          'De kop is de tekst van de link, dus de tegel heeft zijn naam, en de hele tegel is aan te klikken, met één focusrand eromheen.',
          'Zet de tegels in een `Tile.Grid`: dat is de lijst, met de tegels naast elkaar waar ze passen en onder elkaar op een smal scherm.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Tile',
})

export const Default = meta.story({
  args: {
    children: 'Vul wedstrijden in of verbeter ze.',
    href: '#wedstrijden',
    icon: 'ball',
    level: 2,
    title: 'Wedstrijden',
  },
  name: 'Tegel',
  render: (args) => (
    <Tile.Grid aria-label="Voorbeeld" style={{ maxInlineSize: '20rem' }}>
      <Tile {...args} />
    </Tile.Grid>
  ),
})

export const WithoutIcon = meta.story({
  args: {
    children: 'Verberg berichten die niet op de site horen.',
    href: '#berichten',
    level: 2,
    title: 'Berichten',
  },
  name: 'Zonder pictogram',
  render: (args) => (
    <Tile.Grid aria-label="Voorbeeld" style={{ maxInlineSize: '20rem' }}>
      <Tile {...args} />
    </Tile.Grid>
  ),
})

export const Grid = meta.story({
  name: 'Raster van tegels',
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4)
    await expect(canvas.getByRole('link', { name: 'Bezoek' })).toHaveAttribute('href', '#bezoek')
  },
  render: () => (
    <Tile.Grid aria-label="De schermen van het beheer">
      <Tile href="#berichten" icon="speech" level={2} title="Berichten">
        Verberg berichten die niet op de site horen.
      </Tile>
      <Tile href="#artikelen" icon="document" level={2} title="Artikelen">
        Schrijf en publiceer artikelen van de redactie.
      </Tile>
      <Tile href="#wedstrijden" icon="ball" level={2} title="Wedstrijden">
        Vul wedstrijden in of verbeter ze.
      </Tile>
      <Tile href="#bezoek" icon="chart" level={2} title="Bezoek">
        Bekijk de cijfers over het bezoek aan de site.
      </Tile>
    </Tile.Grid>
  ),
})
