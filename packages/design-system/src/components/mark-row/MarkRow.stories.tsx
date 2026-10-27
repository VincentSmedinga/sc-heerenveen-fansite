import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { MarkRow } from './MarkRow'

const meta = preview.meta({
  argTypes: {
    empty: { description: 'De tekst als er nog geen tekens zijn.' },
    marks: {
      description:
        'De tekens, het oudste eerst, elk met een teken van één tot drie letters, een toon en een woord voor de schermlezer.',
    },
    title: { description: 'Het woord voor de tekens, zoals `Vorm`.' },
  },
  component: MarkRow,
  parameters: {
    docs: {
      description: {
        component: [
          'Een regel met een titel en een rij gekleurde tekens, zoals de vorm van een team: `Vorm W V G G W`.',
          'Het onderdeel weet niets van voetbal: de tekens, de tonen en de woorden komen van de pagina.',
          'De tekens zijn verborgen voor een schermlezer, die een zin in woorden krijgt: "Vorm: winst, verlies, gelijkspel".',
          'De kleur is nooit het enige teken, want de letter zegt hetzelfde.',
          'Zonder tekens staat er de tekst van `empty`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/MarkRow',
})

export const Default = meta.story({
  args: {
    marks: [
      { label: 'winst', mark: 'W', tone: 'positive' },
      { label: 'verlies', mark: 'V', tone: 'negative' },
      { label: 'gelijkspel', mark: 'G', tone: 'neutral' },
      { label: 'gelijkspel', mark: 'G', tone: 'neutral' },
      { label: 'winst', mark: 'W', tone: 'positive' },
    ],
    title: 'Vorm',
  },
  name: 'Vijf tekens, met besturing',
})

export const DefaultDark = meta.story({
  args: Default.input.args,
  globals: { theme: 'dark' },
  name: 'Vijf tekens, donker',
})

export const Empty = meta.story({
  args: { empty: 'Nog geen wedstrijden gespeeld.', marks: [], title: 'Vorm' },
  name: 'Nog geen tekens',
})
