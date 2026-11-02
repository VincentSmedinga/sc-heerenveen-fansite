import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { exampleMenuAt } from '../../docs/ExamplePage'
import { Navigation } from './Navigation'
import { SectionBar, type SectionBarProps } from './SectionBar'

const meta = preview.meta({
  argTypes: {
    items: {
      description: 'De schermen van het onderdeel, elk met een `href`, een `label` en `current`.',
      table: { type: { summary: 'SectionBarItem[]' } },
    },
    label: {
      description: 'De naam van de navigatie voor schermlezers. Ze verschilt van die van het hoofdmenu.',
    },
  },
  component: SectionBar,
  parameters: {
    docs: {
      description: {
        component: [
          'Een balk met de schermen van een onderdeel van de site dat er meer dan één heeft, zoals het beheer.',
          'Hij staat direct onder het hoofdmenu, buiten de `Page.Body`, en ziet eruit als de balk met subpagina’s van het hoofdmenu, maar hoort bij het onderdeel en niet bij een onderdeel van het menu.',
          'Op een telefoon scrolt de rij met links zijwaarts, en de huidige pagina staat in beeld.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/SectionBar',
})

const items = [
  { href: '#beheer', label: 'Beheer' },
  { href: '#berichten', label: 'Berichten' },
  { current: true, href: '#artikelen', label: 'Artikelen' },
  { href: '#wedstrijden', label: 'Wedstrijden' },
  { href: '#bezoek', label: 'Bezoek' },
]

// The bar goes under the main menu, so the stories show it there.
const render = (args: SectionBarProps) => (
  <>
    <Navigation appearance="header" items={exampleMenuAt('Forum')} label="Hoofdmenu" />
    <SectionBar {...args} />
  </>
)

export const Beheerder = meta.story({
  args: { items, label: 'Beheer' },
  name: 'Vijf schermen',
  render,
})

export const Moderator = meta.story({
  args: { items: [items[1]!], label: 'Beheer' },
  name: 'Eén scherm',
  render,
})

export const Donker = meta.story({
  args: { items, label: 'Beheer' },
  globals: { theme: 'dark' },
  name: 'Donker',
  render,
})
