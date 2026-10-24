import preview from '#.storybook/preview'

import { exampleSource } from '../../docs/exampleSource'
import { Filter } from './Filter'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een filter: een rij links die elk dezelfde lijst tonen, beperkt tot één soort.',
          'Het is een `nav` met een lijst met links, zoals `Navigation`, met een klasse van zichzelf.',
          '',
          '- `label` is verplicht: de naam voor schermlezers, zoals "Podcasts filteren".',
          '- `items` is de lijst met keuzes.',
          '  Elk item heeft een `href` en een `label`.',
          '  De eerste keuze is meestal "alles", zoals "Alle podcasts".',
          '- `current` op een item zet `aria-current="page"` op die link.',
          '  De gekozen link is vetter, met een dikkere onderstreping, dus niet alleen te zien aan kleur.',
          '',
          'Elke keuze is een adres, dus het filter werkt zonder JavaScript.',
          'De links zijn 44 pixels hoog en lopen op een smal scherm door op een tweede regel.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Filter',
})

const choices = [
  { href: '/podcasts', label: 'Alle podcasts' },
  { href: '/podcasts?podcast=omroep-abe', label: 'Omroep Abe' },
  { href: '/podcasts?podcast=radio-camataru', label: 'Radio Camataru' },
]

const withChoice = (label: string) => choices.map((item) => (item.label === label ? { ...item, current: true } : item))

export const ChosenLight = meta.story({
  globals: { theme: 'light' },
  name: 'Een podcast gekozen, licht',
  render: () => <Filter items={withChoice('Omroep Abe')} label="Podcasts filteren" />,
})

export const ChosenDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Een podcast gekozen, donker',
  render: () => <Filter items={withChoice('Omroep Abe')} label="Podcasts filteren" />,
})

export const AllLight = meta.story({
  globals: { theme: 'light' },
  name: 'Alle podcasts, licht',
  render: () => <Filter items={withChoice('Alle podcasts')} label="Podcasts filteren" />,
})

export const AllDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Alle podcasts, donker',
  render: () => <Filter items={withChoice('Alle podcasts')} label="Podcasts filteren" />,
})

// Only on the canvas, with Storybook's viewport setting: on the docs page they would show the same as the stories above.
const screens = { tags: ['!autodocs'] }

export const NarrowLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: { value: 'mobile1' } },
  name: 'Bij 320 pixels, licht',
  render: () => <Filter items={withChoice('Radio Camataru')} label="Podcasts filteren" />,
})

export const NarrowDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: { value: 'mobile1' } },
  name: 'Bij 320 pixels, donker',
  render: () => <Filter items={withChoice('Radio Camataru')} label="Podcasts filteren" />,
})
