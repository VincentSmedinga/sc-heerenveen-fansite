import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Heading } from '../heading/Heading'
import { SeasonPicker } from '../season-picker/SeasonPicker'
import { Text } from '../text/Text'
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
          'De titelrij van een pagina: de kop met één bediening die bij de hele pagina hoort, zoals de `SeasonPicker`.',
          'Je zet hem in de `intro` van de `Page.Main`; met `wrapped="start"` staat een regel tekst bij de naam links onder de kop.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Title',
})

export const Default = meta.story({
  name: 'Kop met een seizoenskiezer',
  render: () => (
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
  ),
})

export const Wrapped = meta.story({
  name: 'Regel onder de naam',
  render: () => (
    <Page.Title wrapped="start">
      <Heading level={1}>Voornaam Achternaam</Heading>
      <Text appearance="meta">Aanvaller · Nederland · Emmen, 1974 · 52 jaar</Text>
    </Page.Title>
  ),
})
