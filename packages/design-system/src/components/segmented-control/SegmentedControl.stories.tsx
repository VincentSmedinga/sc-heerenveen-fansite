import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { SegmentedControl } from './SegmentedControl'

const options = [
  { icon: 'sun', label: 'Licht', value: 'light' },
  { icon: 'moon', label: 'Donker', value: 'dark' },
] as const

type Choice = (typeof options)[number]['value']

const meta = preview.meta({
  component: SegmentedControl,
  parameters: {
    docs: {
      description: {
        component: [
          'Een rij knoppen, waarvan er precies één is ingedrukt, zoals Licht en Donker.',
          'Je kiest hem voor een keuze uit een paar opties die meteen werkt, zonder een knop om te bevestigen.',
          '',
          'De groep heeft een naam voor een schermlezer, en elke knop zegt met `aria-pressed` of hij is ingedrukt.',
          'De ingedrukte knop is gevuld en de andere zijn een omlijning, dus je ziet het ook zonder kleur.',
          'Een optie kan een `icon` hebben, vóór de tekst: een zon of een maan.',
          'Op de ingedrukte knop is het pictogram gevuld en op de andere alleen een lijn.',
          'Dat is een tweede aanwijzing; de ingedrukte knop is ook gevuld en heeft `aria-pressed`, dus wie het pictogram niet ziet, mist niets.',
          'Het pictogram heeft de kleur van de tekst, ook in geforceerde kleuren.',
          'Het component bewaart niets: de pagina geeft de waarde en handelt de wijziging af.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/SegmentedControl',
})

const Example = ({ start }: { start: Choice }) => {
  const [value, setValue] = useState<Choice>(start)

  return <SegmentedControl label="Thema" onChange={setValue} options={options} value={value} />
}

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Licht',
  render: () => <Example start="light" />,
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Donker',
  render: () => <Example start="dark" />,
})

export const Choosing = meta.story({
  globals: { theme: 'light' },
  name: 'Een andere kiezen',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Donker' }))
    await expect(canvas.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: 'Licht' })).toHaveAttribute('aria-pressed', 'false')
  },
  render: () => <Example start="light" />,
})

export const FocusLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met focus, licht',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Licht' })).toHaveFocus()
  },
  render: () => <Example start="light" />,
})

export const FocusDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met focus, donker',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Licht' })).toHaveFocus()
  },
  render: () => <Example start="dark" />,
})

export const Narrow = meta.story({
  globals: { theme: 'light', viewport: { value: 'mobile1' } },
  name: 'Smal (320 pixels)',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Example start="light" />
    </div>
  ),
})
