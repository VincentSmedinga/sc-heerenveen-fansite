import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { exampleMenuAt } from '../../docs/ExamplePage'
import { Navigation } from './Navigation'
import { SectionBar, type SectionBarProps } from './SectionBar'

const meta = preview.meta({
  argTypes: {
    end: {
      description:
        'Eén knop die geen scherm is, zoals Uitloggen, met een `label` en een `action` voor het formulier. Hij is het laatste item van de rij.',
      table: { type: { summary: 'SectionBarEnd' } },
    },
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
          'Een knop die geen scherm is, zoals Uitloggen, staat achteraan in de rij: op een bureaublad aan het rechteruiteinde van de balk, op een telefoon aan het eind van wat zijwaarts scrolt.',
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

// A function as the action keeps the story on the page; the site passes a server action.
const logOut = () => undefined

export const MetKnop = meta.story({
  args: { end: { action: logOut, label: 'Uitloggen' }, items, label: 'Beheer' },
  name: 'Met een knop aan het eind',
  render,
})

export const MetKnopModerator = meta.story({
  args: { end: { action: logOut, label: 'Uitloggen' }, items: [items[1]!], label: 'Beheer' },
  name: 'Eén scherm met een knop',
  render,
})

export const Donker = meta.story({
  args: { end: { action: logOut, label: 'Uitloggen' }, items, label: 'Beheer' },
  globals: { theme: 'dark' },
  name: 'Donker',
  render,
})
