import { type MouseEvent, useState } from 'react'
import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { sizes } from '../size'
import { SegmentedLinks } from './SegmentedLinks'

const options = [
  { href: '#alle-wedstrijden', label: 'Alle wedstrijden', value: 'all' },
  { href: '#eredivisie', label: 'Eredivisie', value: 'league' },
] as const

// The type of the props as the table of controls shows it: the compiler gives
// `unknown[number]` for the lists.
const union = (values: readonly string[]) => ({ type: { summary: values.map((value) => `'${value}'`).join(' | ') } })

const meta = preview.meta({
  argTypes: {
    size: {
      control: 'radio',
      description: 'De maat van de schakelaar.',
      options: sizes,
      table: union(sizes),
    },
  },
  component: SegmentedLinks,
  parameters: {
    docs: {
      description: {
        component: [
          'Dezelfde baan met een knop als SegmentedControl, voor een keuze die een adres is, zoals de wedstrijden die een pagina telt.',
          'Je kiest hem als de keuze in het adres moet staan en ook zonder JavaScript moet werken.',
          '',
          'Elke optie is een link, en de optie die de pagina nu toont heeft `aria-current="page"` en dikkere letters.',
          'De pagina wordt opnieuw geladen, dus de knop schuift alleen als de browser een overgang tussen pagina’s kent; anders springt hij naar de nieuwe keuze.',
          'Zet niet twee van deze schakelaars op één pagina.',
          'Het component bewaart niets: de pagina geeft de waarde en de adressen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/SegmentedLinks',
})

export const Default = meta.story({
  args: { label: 'Welke wedstrijden', options, size: 'default', value: 'all' },
  name: 'Een keuze in het adres',
})

export const TwoOptionsSmall = meta.story({
  args: { label: 'Welke wedstrijden', options, size: 'small', value: 'league' },
  name: 'Twee keuzes in de kleine maat, zoals op Statistieken',
})

export const LongLabels = meta.story({
  args: {
    label: 'Welke wedstrijden',
    options: [
      { href: '#alle-wedstrijden', label: 'Alle wedstrijden van het seizoen', value: 'all' },
      { href: '#eredivisie', label: 'Alleen de competitiewedstrijden', value: 'league' },
    ],
    size: 'default',
    value: 'all',
  },
  globals: { viewport: { value: 'mobile1' } },
  name: 'Lange labels op een smal scherm',
})

// Pressing a link in the story does not load a page: the story takes over the value, so the
// thumb slides as it does when a script changes the choice.
const Sliding = () => {
  const [value, setValue] = useState('all')
  const choose = (event: MouseEvent<HTMLDivElement>) => {
    const link = (event.target as HTMLElement).closest('a')
    const chosen = options.find((option) => option.href === link?.getAttribute('href'))

    if (chosen) {
      event.preventDefault()
      setValue(chosen.value)
    }
  }

  return <SegmentedLinks label="Welke wedstrijden" onClick={choose} options={options} value={value} />
}

export const Moving = meta.story({
  name: 'De knop schuift naar een andere keuze',
  parameters: {
    docs: {
      description: {
        story:
          'In de pagina’s van de site laadt een link een nieuwe pagina. Hier neemt het verhaal de waarde over, zodat je de beweging ziet.',
      },
    },
  },
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Welke wedstrijden' })

    await expect(group).toHaveStyle('--hf-segmented-index: 0')
    await userEvent.click(canvas.getByRole('link', { name: 'Eredivisie' }))
    await expect(canvas.getByRole('link', { name: 'Eredivisie' })).toHaveAttribute('aria-current', 'page')
    await expect(group).toHaveStyle('--hf-segmented-index: 1')
  },
  render: () => <Sliding />,
})
