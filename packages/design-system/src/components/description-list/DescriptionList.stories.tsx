import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { DescriptionList } from './DescriptionList'

const meta = preview.meta({
  component: DescriptionList,
  parameters: {
    docs: {
      description: {
        component: [
          'Een beschrijvingslijst zet een paar korte feiten naast elkaar als paren van een term en een omschrijving, zoals de competitie en het stadion van een wedstrijd.',
          'Kies hem voor feiten die elk een naam hebben; een rij dingen zonder naam is een `List`, en cijfers in kolommen zijn een `DataTable`.',
          'Elk paar is een `DescriptionList.Item`, dat alleen in een beschrijvingslijst werkt.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/DescriptionList',
})

export const Default = meta.story({
  name: 'Beschrijvingslijst',
  render: (args) => (
    <DescriptionList {...args}>
      <DescriptionList.Item term="Competitie">Eredivisie</DescriptionList.Item>
      <DescriptionList.Item term="Ronde">Speelronde 1</DescriptionList.Item>
      <DescriptionList.Item term="Stadion">Stadion Proeflaan</DescriptionList.Item>
    </DescriptionList>
  ),
})

export const TwoFacts = meta.story({
  name: 'Twee feiten met een langere omschrijving',
  render: () => (
    <DescriptionList>
      <DescriptionList.Item term="Hoogste">plek 2, ronde 6–7 en 10–14</DescriptionList.Item>
      <DescriptionList.Item term="Laagste">plek 11, ronde 20</DescriptionList.Item>
    </DescriptionList>
  ),
})
