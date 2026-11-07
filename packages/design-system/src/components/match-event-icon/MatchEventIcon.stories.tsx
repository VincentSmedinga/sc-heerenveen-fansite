import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { MatchEventIcon, type MatchEventIconKind, matchEventIconKinds } from './MatchEventIcon'

const meta = preview.meta({
  argTypes: {
    kind: { control: 'select', description: 'De soort gebeurtenis.', options: matchEventIconKinds },
    label: {
      description:
        'Een naam voor het pictogram, zoals "Gele kaart". Laat hem weg als de pagina het woord naast het pictogram zet: het pictogram is dan verborgen voor schermlezers.',
    },
    size: {
      control: 'radio',
      description: 'De maat bij gewone tekst, of een grotere.',
      options: ['text', 'large'],
    },
  },
  component: MatchEventIcon,
  parameters: {
    docs: {
      description: {
        component: [
          'Het pictogram van een gebeurtenis in een wedstrijd: een doelpunt, een kaart, een wissel of een gemiste strafschop.',
          'Elke soort heeft een eigen vorm, dus wie geen kleuren ziet, houdt ze toch uit elkaar.',
          'Zet het woord er altijd naast, zoals "Gele kaart": het pictogram is dan verborgen voor schermlezers.',
          'Staat er geen tekst naast, geef het dan een `label`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Wedstrijdpictogram',
})

const words: Record<MatchEventIconKind, string> = {
  goal: 'Doelpunt',
  in: 'Erin',
  out: 'Eruit',
  'own-goal': 'Eigen doelpunt',
  'penalty-missed': 'Gemiste of gestopte strafschop',
  'red-card': 'Rode kaart',
  substitution: 'Wissel',
  'yellow-card': 'Gele kaart',
  'yellow-red-card': 'Geel-rode kaart',
}

export const Default = meta.story({
  args: { kind: 'yellow-card', size: 'text' },
  name: 'Eén pictogram',
  render: (args) => (
    <p>
      <MatchEventIcon {...args} /> Gele kaart
    </p>
  ),
})

export const AllKinds = meta.story({
  name: 'Alle soorten naast hun woord',
  render: () => (
    <ul style={{ display: 'grid', gap: '0.75rem', listStyle: 'none', margin: 0, padding: 0 }}>
      {matchEventIconKinds.map((kind) => (
        <li key={kind}>
          <MatchEventIcon kind={kind} /> {words[kind]}
        </li>
      ))}
    </ul>
  ),
})

export const Large = meta.story({
  name: 'De grotere maat',
  render: () => (
    <ul style={{ alignItems: 'center', display: 'flex', gap: '0.75rem', listStyle: 'none', margin: 0, padding: 0 }}>
      <li>
        <MatchEventIcon kind="goal" label="Raak" size="large" />
      </li>
      <li>
        <MatchEventIcon kind="penalty-missed" label="Naast" size="large" />
      </li>
    </ul>
  ),
})
