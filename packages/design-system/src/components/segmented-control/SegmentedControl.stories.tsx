import { useState } from 'react'
import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { type Size, sizes } from '../size'
import { SegmentedControl, type SegmentedControlOption } from './SegmentedControl'

const themes = [
  { icon: 'sun', label: 'Licht', value: 'light' },
  { icon: 'moon', label: 'Donker', value: 'dark' },
] as const satisfies readonly SegmentedControlOption<string>[]

const periods = [
  { label: 'Week', value: 'week' },
  { label: 'Maand', value: 'month' },
  { label: 'Seizoen', value: 'season' },
] as const satisfies readonly SegmentedControlOption<string>[]

const quarters = [
  { label: 'Eerste', value: 'first' },
  { label: 'Tweede', value: 'second' },
  { label: 'Derde', value: 'third' },
  { label: 'Vierde', value: 'fourth' },
] as const satisfies readonly SegmentedControlOption<string>[]

// The type of the props as the table of controls shows it: the compiler gives `unknown[number]`
// for the lists.
const union = (values: readonly string[]) => ({ type: { summary: values.map((value) => `'${value}'`).join(' | ') } })

const meta = preview.meta({
  argTypes: {
    options: {
      control: 'object',
      description: 'De keuzes, in volgorde: twee tot vier, elk met een tekst en eventueel een pictogram.',
    },
    size: {
      control: 'radio',
      description: 'De maat van de schakelaar.',
      options: sizes,
      table: union(sizes),
    },
    value: { control: 'text', description: 'De waarde van de gekozen keuze.' },
  },
  component: SegmentedControl,
  parameters: {
    docs: {
      description: {
        component: [
          'Een baan met een paar keuzes naast elkaar, waarvan er precies één gekozen is, zoals Licht en Donker.',
          'Je kiest hem voor een keuze uit een paar opties die meteen werkt, zonder een knop om te bevestigen.',
          'Is de keuze een adres, zodat ze ook zonder JavaScript moet werken, kies dan SegmentedLinks.',
          '',
          'Onder de gekozen keuze ligt een knop die naar een nieuwe keuze schuift.',
          'Met minder beweging springt hij.',
          'De gekozen keuze heeft ook dikkere letters en `aria-pressed`, dus wie de knop niet ziet, mist niets.',
          'Een optie kan een `icon` hebben, vóór de tekst; op de gekozen keuze is het pictogram gevuld en op de andere alleen een lijn.',
          'De kleine maat is voor een schakelaar naast de inhoud, zoals in een zijkolom of een werkbalk.',
          'Het component bewaart niets: de pagina geeft de waarde en handelt de wijziging af.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/SegmentedControl',
})

// The page holds the value; the story holds it here, and starts again when the controls
// change it.
const Example = ({
  label = 'Thema',
  options,
  size,
  start,
}: {
  label?: string
  options: readonly SegmentedControlOption<string>[]
  size: Size
  start: string
}) => {
  const [value, setValue] = useState(start)

  return <SegmentedControl key={start} label={label} onChange={setValue} options={options} size={size} value={value} />
}

export const Default = meta.story({
  args: { label: 'Thema', onChange: () => undefined, options: themes, size: 'default', value: 'light' },
  name: 'Schakelaar',
  render: ({ label, options, size = 'default', value }) => (
    <Example label={label} options={options} size={size} start={value} />
  ),
})

export const Small = meta.story({
  args: { label: 'Periode', onChange: () => undefined, options: periods, size: 'small', value: 'month' },
  name: 'Kleine maat',
  render: ({ label, options, size = 'default', value }) => (
    <Example label={label} options={options} size={size} start={value} />
  ),
})

export const FourOptions = meta.story({
  args: { label: 'Kwart', onChange: () => undefined, options: quarters, size: 'default', value: 'third' },
  name: 'Vier keuzes',
  render: ({ label, options, size = 'default', value }) => (
    <Example label={label} options={options} size={size} start={value} />
  ),
})

export const LongLabels = meta.story({
  args: {
    label: 'Wedstrijden',
    onChange: () => undefined,
    options: [
      { label: 'Alle wedstrijden van het seizoen', value: 'all' },
      { label: 'Alleen de competitiewedstrijden', value: 'league' },
    ],
    size: 'default',
    value: 'all',
  },
  globals: { viewport: { value: 'mobile1' } },
  name: 'Lange labels op een smal scherm',
  render: ({ label, options, size = 'default', value }) => (
    <Example label={label} options={options} size={size} start={value} />
  ),
})

export const Choosing = meta.story({
  args: { label: 'Thema', onChange: () => undefined, options: themes, size: 'default', value: 'light' },
  name: 'De knop schuift naar een andere keuze',
  parameters: {
    docs: {
      description: {
        story: 'Een klik op een andere keuze laat de knop erheen schuiven. Met minder beweging springt hij.',
      },
    },
  },
  play: async ({ canvas }) => {
    const group = canvas.getByRole('group', { name: 'Thema' })

    await expect(group).toHaveStyle('--hf-segmented-index: 0')
    await userEvent.click(canvas.getByRole('button', { name: 'Donker' }))
    await expect(canvas.getByRole('button', { name: 'Donker' })).toHaveAttribute('aria-pressed', 'true')
    await expect(canvas.getByRole('button', { name: 'Licht' })).toHaveAttribute('aria-pressed', 'false')
    await expect(group).toHaveStyle('--hf-segmented-index: 1')
  },
  render: ({ label, options, size = 'default', value }) => (
    <Example label={label} options={options} size={size} start={value} />
  ),
})

export const Focus = meta.story({
  args: { label: 'Thema', onChange: () => undefined, options: themes, size: 'default', value: 'light' },
  name: 'Met focus',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('button', { name: 'Licht' })).toHaveFocus()
  },
  render: ({ label, options, size = 'default', value }) => (
    <Example label={label} options={options} size={size} start={value} />
  ),
})
