import preview from '#.storybook/preview'

import { SegmentedLinks } from './SegmentedLinks'

const options = [
  { href: '#alle-wedstrijden', label: 'Alle wedstrijden', value: 'all' },
  { href: '#eredivisie', label: 'Eredivisie', value: 'league' },
] as const

const meta = preview.meta({
  component: SegmentedLinks,
  parameters: {
    docs: {
      description: {
        component: [
          'Dezelfde keuze als SegmentedControl, voor een keuze die een adres is, zoals de wedstrijden die een pagina telt.',
          'Je kiest hem als de keuze in het adres moet staan en ook zonder JavaScript moet werken.',
          '',
          'Elke optie is een link, en de optie die de pagina nu toont heeft `aria-current="page"`.',
          'Die optie is gevuld en de andere zijn een omlijning, dus je ziet het ook zonder kleur.',
          'Het component bewaart niets: de pagina geeft de waarde en de adressen.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/SegmentedLinks',
})

export const Default = meta.story({
  args: { label: 'Welke wedstrijden', options, value: 'all' },
  name: 'Een keuze in het adres',
})

export const OtherChoice = meta.story({
  args: { label: 'Welke wedstrijden', options, value: 'league' },
  name: 'De tweede optie gekozen',
})

export const Narrow = meta.story({
  args: { label: 'Welke wedstrijden', options, value: 'all' },
  globals: { viewport: { value: 'mobile1' } },
  name: 'Smal (320 pixels)',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <SegmentedLinks {...args} />
    </div>
  ),
})
