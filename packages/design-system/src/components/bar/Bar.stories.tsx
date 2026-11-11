import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { DataTable } from '../data-table/DataTable'
import { Heading } from '../heading/Heading'
import { Bar, BarPlace } from './Bar'

const meta = preview.meta({
  argTypes: {
    share: {
      control: { max: 100, min: 0, step: 5, type: 'range' },
      description: 'Hoe lang de balk is, van 0 tot 100.',
    },
  },
  component: Bar,
  parameters: {
    docs: {
      description: {
        component: [
          'Een korte balk naast een getal in een tabelcel, zo lang als het aandeel van dat getal in het grootste getal van de tabel (`sharesOf` rekent dat uit).',
          'De balk is versiering: hij heeft geen rol of tekst en een schermlezer slaat hem over, dus het getal blijft in de cel staan.',
          'Zet een tabel met balken in een `BarPlace`: de balken verdwijnen daar waar de plaats te smal voor ze is.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/Bar',
})

export const Default = meta.story({
  args: { share: 60 },
  name: 'Balk naast een getal',
  render: (args) => (
    <Card aria-labelledby="balk-kop" style={{ maxInlineSize: '24rem' }}>
      <Heading id="balk-kop" level={2}>
        Gewonnen
      </Heading>
      <BarPlace>
        <DataTable
          appearance="text"
          caption="Het aantal gewonnen wedstrijden van Testclub per seizoen"
          columns={['Seizoen', 'Gewonnen']}
          rows={[
            {
              cells: [
                <>
                  12
                  <Bar share={args.share} />
                </>,
              ],
              header: '2025/26',
            },
          ]}
        />
      </BarPlace>
    </Card>
  ),
})
