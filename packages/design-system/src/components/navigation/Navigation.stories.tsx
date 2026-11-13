import { expect, userEvent, waitFor } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import {
  exampleLongMenu,
  type ExampleLongMenuPage,
  exampleMenu,
  exampleMenuAt,
  exampleMenuWithSubpages,
} from '../../docs/ExamplePage'
import { Navigation } from './Navigation'
import { NavigationBar } from './NavigationBar'

const meta = preview.meta({
  args: { items: exampleMenu, label: 'Hoofdmenu' },
  argTypes: {
    appearance: {
      control: 'radio',
      description:
        'Een gewone rij links, of het hoofdmenu van de site in de header. Alleen het hoofdmenu toont subpagina’s.',
      options: ['default', 'header'],
    },
    items: {
      description:
        'De links. Elk item heeft een `href` en een `label`, en eventueel `current`, `external` en `subitems`.',
    },
    label: {
      control: 'text',
      description:
        'De naam voor schermlezers. Heeft een pagina meer dan één navigatie, dan krijgt elke een andere naam.',
    },
    moreLabel: {
      control: 'text',
      description:
        'De tekst van de knop die op een smal scherm de middelste onderdelen van een lang hoofdmenu bevat, zoals "Meer".',
    },
  },
  component: Navigation,
  parameters: {
    docs: {
      description: {
        component: [
          'Een navigatie: een `nav` met een lijst met links, om van de ene plek van de site naar de andere te gaan. De huidige pagina heeft `aria-current` en is ook zonder kleur te herkennen.',
          'Het hoofdmenu van de site is een `Navigation` met `appearance="header"`, direct na de `Page.Header`. Een onderdeel kan subpagina’s hebben die als balk onder het menu staan, en een lang menu zet op een smal scherm de middelste onderdelen achter een knop.',
          'Een onderdeel van de site dat niet in het menu staat, zoals het beheer, tekent zijn eigen balk met `NavigationBar`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
      source: {
        code: `<Navigation
  items={[
    { current: true, href: '#nieuws', label: 'Nieuws' },
    { external: true, href: '#forum', label: 'Forum' },
  ]}
  label="Hoofdmenu"
/>`,
        language: 'tsx',
        type: 'code',
      },
    },
  },
})

// The main menu is the top of a page, so it runs from edge to edge of the window.
const fullscreen = { layout: 'fullscreen' } as const

const story = (text: string) => ({ ...fullscreen, docs: { description: { story: text } } })

export const Default = meta.story({
  args: { items: exampleMenu, label: 'Menu in de footer' },
  name: 'Navigatie',
})

export const Header = meta.story({
  args: { appearance: 'header', items: exampleMenuAt('Nieuws'), label: 'Hoofdmenu' },
  name: 'Hoofdmenu',
  parameters: fullscreen,
})

export const Section = meta.story({
  args: { appearance: 'header', items: exampleMenuWithSubpages('Wedstrijden'), label: 'Hoofdmenu' },
  name: 'Onderdeel met subpagina’s',
  parameters: story(
    'De bezoeker is op Wedstrijden zelf. Het onderdeel heeft `aria-current="page"` en de balk met de subpagina’s staat eronder.',
  ),
})

export const Subpage = meta.story({
  args: { appearance: 'header', items: exampleMenuWithSubpages('Uitslagen'), label: 'Hoofdmenu' },
  name: 'Subpagina als huidige',
  parameters: story(
    'De subpagina heeft `aria-current="page"`, en het onderdeel `aria-current="true"` en houdt zijn gewicht en zijn streep.',
  ),
})

export const BarFromCaller = meta.story({
  name: 'Balk van de pagina zelf',
  parameters: story(
    'De pagina tekent de balk zelf met `NavigationBar` en geeft hem als `bar` aan het onderdeel, voor links die iets uit het adres van de pagina meenemen.',
  ),
  render: () => {
    const items = exampleMenuWithSubpages('Uitslagen').map((item) =>
      item.subitems === undefined
        ? item
        : {
            ...item,
            bar: (
              <NavigationBar
                subitems={item.subitems.map((subitem) => ({ ...subitem, href: `${subitem.href}-eredivisie` }))}
              />
            ),
          },
    )

    return <Navigation appearance="header" items={items} label="Hoofdmenu" />
  },
})

// The menu of eight items needs the button on a phone, so these two use Storybook's viewport
// setting: on a wide screen the button isn't there.
const longMenu = (current: ExampleLongMenuPage) => ({
  args: {
    appearance: 'header',
    items: exampleLongMenu(current),
    label: 'Hoofdmenu',
    moreLabel: 'Meer',
  } as const,
  globals: { viewport: { value: 'mobile2' } },
  parameters: story(
    'Op een smal scherm staan het eerste onderdeel, de knop en het forum in de rij, en de rest in een lijst onder de knop die de pagina naar beneden duwt. Staat de huidige pagina achter de knop, dan komt hij naar voren in de rij.',
  ),
})

export const More = meta.story({
  ...longMenu('Nieuws'),
  name: 'Lang menu met een knop',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByText('Meer'))
  },
})

export const MoreCurrentWithSubpages = meta.story({
  ...longMenu('Uitslagen'),
  name: 'Lang menu: de huidige pagina heeft subpagina’s',
  // The stylesheet shows one copy of the page behind the button: a screen reader meets it once.
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('link', { name: 'Wedstrijden' })).toHaveLength(1)
    await expect(canvas.getAllByRole('link', { name: 'Uitslagen' })).toHaveLength(1)
    await expect(canvas.getAllByRole('link', { current: 'page' })).toHaveLength(1)
    await expect(canvas.getByRole('link', { name: 'Wedstrijden' })).toHaveAttribute('aria-current', 'true')
  },
})

export const MoreEscape = meta.story({
  ...longMenu('Nieuws'),
  name: 'Lang menu: Escape sluit de lijst',
  parameters: story('Escape sluit de open lijst, en de focus staat dan op de knop.'),
  play: async ({ canvas }) => {
    const button = canvas.getByText('Meer').closest('summary')!

    await userEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'))
    await expect(button).toHaveFocus()
  },
})

const screens = [
  { href: '#beheer', label: 'Beheer' },
  { href: '#berichten', label: 'Berichten' },
  { current: true, href: '#artikelen', label: 'Artikelen' },
  { href: '#wedstrijden', label: 'Wedstrijden' },
  { href: '#bezoek', label: 'Bezoek' },
]

// A function as the action keeps the story on the page; the site passes a server action.
const logOut = () => undefined

// The bar on its own goes under the main menu, so the stories show it there.
const aloneBar = (subitems: typeof screens, button: boolean) => () => (
  <>
    <Navigation appearance="header" items={exampleMenuAt('Forum')} label="Hoofdmenu" />
    <NavigationBar
      {...(button ? { end: { action: logOut, label: 'Uitloggen' } } : {})}
      label="Beheer"
      subitems={subitems}
    />
  </>
)

export const Alone = meta.story({
  name: 'Losse balk',
  parameters: story(
    'De balk van een onderdeel op zichzelf, onder het hoofdmenu: een `nav` met de naam "Beheer". Een knop zoals Uitloggen staat met `end` achteraan in de rij.',
  ),
  render: aloneBar(screens, true),
})

export const AloneOne = meta.story({
  name: 'Losse balk: één scherm',
  parameters: story('Heeft het onderdeel één scherm voor deze rol, dan is de balk een rij van één link.'),
  render: aloneBar([screens[1]!], false),
})
