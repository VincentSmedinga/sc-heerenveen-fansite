import preview from '#.storybook/preview'

import { Heading } from '../heading/Heading'
import { SeasonPicker } from '../season-picker/SeasonPicker'
import { SegmentedLinks } from '../segmented-control/SegmentedLinks'
import { Page } from './Page'

const options = [
  { label: '2026/27', value: '2026-27' },
  { label: '2025/26', value: '2025-26' },
  { label: '2024/25', value: '2024-25' },
]

const meta = preview.meta({
  component: Page.Title,
  parameters: {
    docs: {
      description: {
        component: [
          'De titelrij van een pagina: de kop met een bediening die bij de hele pagina hoort, zoals de `SeasonPicker`, of met twee, zoals `SegmentedLinks` en de `SeasonPicker`.',
          'Je zet hem in de `intro` van de `Page.Main`.',
          '',
          'De bediening staat rechts naast de kop, aan het einde van de kolom.',
          'Passen ze niet naast elkaar, dan staat de bediening onder de kop, ook rechts.',
          'Twee bedieningen blijven bij elkaar aan het einde.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Title',
})

const render = () => (
  <Page.Title>
    <Heading level={1}>Wedstrijden</Heading>
    <SeasonPicker
      action="/wedstrijden/kies"
      onSubmit={(event) => {
        event.preventDefault()
      }}
      options={options}
      value="2025-26"
    />
  </Page.Title>
)

export const Default = meta.story({ name: 'Kop met een seizoenskiezer', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

export const Narrow = meta.story({
  globals: { viewport: { value: 'mobile1' } },
  name: 'Smal (320 pixels)',
  render,
})

export const WithSwitch = meta.story({
  name: 'Kop met een schakelaar en een seizoenskiezer',
  render: () => (
    <Page.Title>
      <Heading level={1}>Statistieken</Heading>
      <SegmentedLinks
        label="Welke wedstrijden"
        options={[
          { href: '#alle-wedstrijden', label: 'Alle wedstrijden', value: 'all' },
          { href: '#eredivisie', label: 'Eredivisie', value: 'league' },
        ]}
        value="all"
      />
      <SeasonPicker
        action="/statistieken/kies"
        onSubmit={(event) => {
          event.preventDefault()
        }}
        options={options}
        value="2025-26"
      />
    </Page.Title>
  ),
})
