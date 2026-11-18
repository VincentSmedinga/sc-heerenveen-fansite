import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { tableColumns } from '../table-columns'
import { TableColumnIcon, tableColumnIconNames } from './TableColumnIcon'

const meta = preview.meta({
  argTypes: {
    name: { control: 'select', description: 'Het pictogram van een kolom.', options: tableColumnIconNames },
  },
  component: TableColumnIcon,
  parameters: {
    docs: {
      description: {
        component: [
          'Het pictogram van een kolom van een tabel, in plaats van een letter. De kolommen staan in `tableColumns`, en `DataTable` en de legenda tekenen het pictogram zelf.',
          'Het veld is de wedstrijd en de bal is het doelpunt. Een grote ronde badge zegt de uitkomst of het teken, een klein veld erover zegt "per wedstrijd", en een doel met iets eronder is een strafschop (de stip) of een nul. Het shirt van de basis heeft blauw-witte strepen en twee pompeblêden.',
          'Kleur herhaalt altijd een vorm (een vinkje, een kruis, een min) en vervangt hem nooit. Het pictogram is verborgen voor schermlezers: de kop en de legenda schrijven het hele woord.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Kolompictogram',
})

export const Default = meta.story({
  args: { name: 'goals' },
  name: 'Eén pictogram',
  render: (args) => (
    <p>
      <TableColumnIcon {...args} /> doelpunten
    </p>
  ),
})

export const AllIcons = meta.story({
  name: 'Alle pictogrammen naast hun woord',
  render: () => (
    <ul style={{ display: 'grid', gap: '0.75rem', listStyle: 'none', margin: 0, padding: 0 }}>
      {Object.values(tableColumns).map(({ icon, name }) => (
        <li key={icon}>
          <TableColumnIcon name={icon} /> {name}
        </li>
      ))}
    </ul>
  ),
})

export const Large = meta.story({
  name: 'Groter, om de tekening te zien',
  render: () => (
    <ul
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        fontSize: '2.5rem',
        gap: '1rem',
        listStyle: 'none',
        margin: 0,
        padding: 0,
      }}
    >
      {Object.values(tableColumns).map(({ icon, name }) => (
        <li key={icon} title={name}>
          <TableColumnIcon name={icon} />
        </li>
      ))}
    </ul>
  ),
})

export const Shirt = meta.story({
  args: { name: 'started' },
  name: 'Het shirt, groot en op ware grootte',
  render: (args) => (
    <p style={{ alignItems: 'center', display: 'flex', gap: '1.5rem' }}>
      <span style={{ fontSize: '6rem', lineHeight: 1 }}>
        <TableColumnIcon {...args} />
      </span>
      <span>
        <TableColumnIcon {...args} /> basis
      </span>
    </p>
  ),
})
