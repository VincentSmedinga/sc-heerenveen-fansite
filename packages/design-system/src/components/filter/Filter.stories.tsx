import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Filter } from './Filter'

const meta = preview.meta({
  argTypes: {
    items: { description: 'De keuzes. Elk item heeft een `href` en een `label`, en de gekozen heeft `current`.' },
    label: { control: 'text', description: 'De naam voor schermlezers, zoals "Podcasts filteren".' },
  },
  component: Filter,
  parameters: {
    docs: {
      description: {
        component: [
          'Een filter: een rij links die elk dezelfde lijst tonen, beperkt tot één soort. Kies hem boven een lijst die je op één eigenschap kunt beperken, zoals de podcasts van één programma.',
          'Het is een `nav` met een lijst met links, zoals `Navigation`. Elke keuze is een adres, dus het filter werkt zonder JavaScript, en de gekozen link is ook zonder kleur te herkennen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Filter
  items={[
    { href: '/podcasts', label: 'Alle podcasts' },
    { current: true, href: '/podcasts?podcast=omroep-abe', label: 'Omroep Abe' },
  ]}
  label="Podcasts filteren"
/>`,
        language: 'tsx',
        type: 'code',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/Filter',
})

const choices = [
  { href: '/podcasts', label: 'Alle podcasts' },
  { href: '/podcasts?podcast=omroep-abe', label: 'Omroep Abe' },
  { href: '/podcasts?podcast=radio-camataru', label: 'Radio Camataru' },
]

const withChoice = (label: string) => choices.map((item) => (item.label === label ? { ...item, current: true } : item))

export const Default = meta.story({
  args: { items: withChoice('Omroep Abe'), label: 'Podcasts filteren' },
  name: 'Een podcast gekozen',
})

export const All = meta.story({
  args: { items: withChoice('Alle podcasts'), label: 'Podcasts filteren' },
  name: 'Alle podcasts',
})
