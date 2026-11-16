import { type MouseEvent, useState } from 'react'
import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Page } from '../page/Page'
import { sizes } from '../size'
import { SegmentedLinks } from './SegmentedLinks'

const options = [
  { href: '#alle-wedstrijden', label: 'Alle wedstrijden', value: 'all' },
  { href: '#eredivisie', label: 'Eredivisie', value: 'league' },
] as const

const meta = preview.meta({
  argTypes: {
    size: {
      control: 'radio',
      description: 'De maat van de schakelaar.',
      options: sizes,
    },
  },
  component: SegmentedLinks,
  parameters: {
    docs: {
      description: {
        component: [
          'Dezelfde baan met een knop als SegmentedControl, voor een keuze die een adres is, zoals de wedstrijden die een pagina telt. Je kiest hem als de keuze in het adres moet staan en ook zonder JavaScript moet werken.',
          'Elke keuze is zo breed als zijn tekst, dus een schakelaar met drie keuzes is korter dan een met vijf. Staat hij op een plek die smaller is dan hijzelf, zoals de werkbalk van een pagina, dan wordt hij strakker: iets kleinere letters en minder ruimte aan weerskanten. De plek beslist dat, de pagina niet.',
          'Geef de schakelaar met `place` een plek, zoals `stand`, dan schuift de knop als de volgende pagina dezelfde schakelaar met een andere keuze heeft.',
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
  name: 'Twee keuzes in de kleine maat, zoals op Cijfers',
})

export const FourOptionsCompact = meta.story({
  args: {
    compact: true,
    label: 'Welke wedstrijden',
    options: [
      { href: '#alles', label: 'Alles', value: 'all' },
      { href: '#eredivisie', label: 'Eredivisie', value: 'league' },
      { href: '#beker', label: 'Beker', value: 'cup' },
      { href: '#europa', label: 'Europa', value: 'europe' },
    ],
    value: 'all',
  },
  name: 'Vier keuzes, zoals de competitie op een telefoon',
})

export const FiveOptionsCompact = meta.story({
  args: {
    compact: true,
    label: 'Welke wedstrijden',
    options: [
      { href: '#alles', label: 'Alles', value: 'all' },
      { href: '#competitie', label: 'Competitie', value: 'league' },
      { href: '#play-offs', label: 'Play-offs', value: 'playoffs' },
      { href: '#beker', label: 'Beker', value: 'cup' },
      { href: '#europa', label: 'Europa', value: 'europe' },
    ],
    value: 'playoffs',
  },
  name: 'Vijf keuzes, zoals de competitie met play-offs op een telefoon',
})

const competitions = [
  { href: '#alles', label: 'Alles', value: 'all' },
  { href: '#competitie', label: 'Competitie', value: 'league' },
  { href: '#play-offs', label: 'Play-offs', value: 'playoffs' },
  { href: '#beker', label: 'Beker', value: 'cup' },
  { href: '#europa', label: 'Europa', value: 'europe' },
] as const

export const ShortAndLong = meta.story({
  name: 'Zo breed als de tekst: drie en vijf keuzes',
  parameters: {
    docs: {
      description: {
        story: 'De keuzes zijn zo breed als hun tekst, dus de schakelaar met drie keuzes is korter dan die met vijf.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <SegmentedLinks label="Drie keuzes" options={competitions.slice(0, 3)} size="small" value="all" />
      <SegmentedLinks label="Vijf keuzes" options={competitions} size="small" value="league" />
    </div>
  ),
})

export const NarrowPlace = meta.story({
  name: 'Op een smalle plek wordt hij strakker',
  parameters: {
    docs: {
      description: {
        story:
          'In een werkbalk die smaller is dan de schakelaar zelf neemt hij een strakke stap, zonder dat de pagina daar iets voor doet. Erboven staat dezelfde schakelaar op een plek waar hij past.',
      },
    },
  },
  render: () => (
    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <div style={{ inlineSize: '24rem', maxInlineSize: '100%' }}>
        <Page.Toolbar>
          <SegmentedLinks label="Op een ruime plek" options={competitions} size="small" value="league" />
        </Page.Toolbar>
      </div>
      <div style={{ inlineSize: '20rem', maxInlineSize: '100%' }}>
        <Page.Toolbar>
          <SegmentedLinks label="Op een smalle plek" options={competitions} size="small" value="league" />
        </Page.Toolbar>
      </div>
    </div>
  ),
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

    const thumbAt = () => Number.parseFloat(group.style.getPropertyValue('--hf-segmented-x'))

    await expect(thumbAt()).toBe(canvas.getByRole('link', { name: 'Alle wedstrijden' }).offsetLeft)
    await userEvent.click(canvas.getByRole('link', { name: 'Eredivisie' }))
    await expect(canvas.getByRole('link', { name: 'Eredivisie' })).toHaveAttribute('aria-current', 'page')
    await expect(thumbAt()).toBe(canvas.getByRole('link', { name: 'Eredivisie' }).offsetLeft)
  },
  render: () => <Sliding />,
})
