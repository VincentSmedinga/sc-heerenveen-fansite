import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import type { DataTableRow } from '../data-table/DataTable'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { tableColumns } from '../table-columns'
import { MoreRows } from './MoreRows'

// Made-up clubs, from a high average to a low one.
const names = [
  'Testclub',
  'FC Voorbeeld',
  'Proefstad SV',
  'Teststad Boys',
  'VV Maquette',
  'Oefendorp FC',
  'Fictief United',
  'Zonderland',
  'Ajax Test',
  'Nepclub ’s-Gravenvoorbeeld',
  'Elders Combinatie',
  'Álbum Rangers',
]
const rows: DataTableRow[] = names.map((header, index) => ({
  cells: [(2.4 - index * 0.15).toFixed(2).replace('.', ','), 10 + index],
  header,
  href: '#club',
  position: index + 1,
}))
const columns = ['Club', { ...tableColumns.pointsPerMatch, key: true }, tableColumns.played]

const meta = preview.meta({
  args: {
    caption: 'De eerste {shown} clubs waartegen sc Heerenveen de meeste punten per wedstrijd haalt',
    columns,
    name: 'Het makkelijkst',
    rows,
    unit: 'clubs',
  },
  component: MoreRows,
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst die langer kan zijn dan een kaart hoog is, zoals de clubs waartegen sc Heerenveen het makkelijkst of het moeilijkst heeft. De tabel toont eerst vijf rijen, en een knop zet er elke keer vijf bij. Aan het einde zet dezelfde knop de tabel terug naar de eerste vijf.',
          'Zonder JavaScript staan de eerste rijen er en is er geen knop, want een knop die niets doet is erger dan een kortere lijst. Na een druk blijft de focus op de knop, en een melding voor de schermlezer zegt wat er veranderde.',
          'Het bijschrift is een tekst met `{shown}` op de plaats van het aantal rijen. Het onderdeel toont kolommen niet achter een knop: daar is `DataTable.More` voor.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MoreRows',
})

const inCard = (children: React.ReactNode) => (
  <Card aria-labelledby="meer-rijen" style={{ maxInlineSize: '28rem' }}>
    <Heading id="meer-rijen" level={2}>
      Het makkelijkst
    </Heading>
    {children}
  </Card>
)

export const Default = meta.story({
  name: 'Aan het begin',
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('row')).toHaveLength(6)
    await expect(canvas.getByRole('button', { name: 'Toon 5 meer, Het makkelijkst' })).toBeVisible()
  },
  render: (args) => inCard(<MoreRows {...args} />),
})

export const Halfway = meta.story({
  name: 'Halverwege',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Toon 5 meer, Het makkelijkst' }))
    await expect(canvas.getAllByRole('row')).toHaveLength(11)
    await expect(canvas.getByRole('status')).toHaveTextContent('5 clubs meer getoond, nu 10')
    await expect(canvas.getByRole('button', { name: 'Toon 2 meer, Het makkelijkst' })).toHaveFocus()
  },
  render: (args) => inCard(<MoreRows {...args} />),
})

export const AtTheEnd = meta.story({
  name: 'Aan het einde',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Toon 5 meer, Het makkelijkst' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Toon 2 meer, Het makkelijkst' }))
    await expect(canvas.getAllByRole('row')).toHaveLength(13)

    const reset = canvas.getByRole('button', { name: 'Herstel naar top 5, Het makkelijkst' })

    await expect(reset).toHaveFocus()
    await userEvent.click(reset)
    await expect(canvas.getAllByRole('row')).toHaveLength(6)
    await expect(canvas.getByRole('status')).toHaveTextContent('Terug naar de top 5')
  },
  render: (args) => inCard(<MoreRows {...args} />),
})
