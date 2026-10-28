import preview from '#.storybook/preview'

import { ExampleMain, exampleMenu, exampleMenuAt, type ExampleMenuPage } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Heading } from '../heading/Heading'
import { Page } from '../page/Page'
import { Text } from '../text/Text'
import { Navigation, type NavigationItem } from './Navigation'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een navigatie: een `nav` met een lijst met links.',
          '',
          '- `label` is verplicht: de naam voor schermlezers, zoals "Hoofdmenu".',
          '  Heeft een pagina meer dan één navigatie, dan krijgt elke een andere naam.',
          '- `items` is de lijst met links.',
          '  Elk item heeft een `href` en een `label`, de tekst van de link.',
          '- `current` op een item zet `aria-current="page"` op die link.',
          '- `external` op een item zegt dat de link naar een andere site gaat.',
          '  De link krijgt dan achter zijn tekst hetzelfde pictogram als de kop van een nieuwsregel.',
          '  Het pictogram is voor het oog: een schermlezer hoort alleen de tekst van de link.',
          '',
          'Buiten de header is de huidige pagina ook te zien zonder kleur: de link is vetter, met een dikkere onderstreping.',
          'Zo ziet het menu in de footer eruit.',
          '',
          'Het hoofdmenu van de site is een `Navigation` met `appearance="header"`.',
          'Hij staat direct na de `Page.Header`, op hetzelfde blauw, zodat de twee één vlak lijken, in een eigen rij onder het logo met een dunne lijn erboven.',
          'Alle links hebben de lichtste kleur van de header en zijn niet onderstreept, tot je er met de muis op staat.',
          'De letters groeien mee met het venster en zijn vet, zodat het menu boven een submenu met lichtere letters uitkomt.',
          'De huidige pagina is nog vetter en heeft een rode streep eronder.',
          'Die streep heeft de kleur `--hf-colour-accent-on-header`.',
          'Zo is de huidige pagina ook zonder kleur te herkennen.',
          'De laatste link, die naar het forum, staat rechts, ook als hij op een smal scherm op een tweede rij komt.',
          '',
          'De links zijn groot genoeg om op een telefoon aan te raken en lopen op een smal scherm door op een tweede regel.',
          '',
          'Een item van het hoofdmenu kan `subitems` hebben: de subpagina’s van dat onderdeel, elk met een `href`, een `label` en `current`.',
          'Ze staan in een geneste lijst in het `li` van hun onderdeel, dus het menu is één `nav` met één naam, en een schermlezer leest de lijst met de lijst erin.',
          'De lijst is er alleen bij het onderdeel waar de bezoeker is, of waarvan hij een subpagina bekijkt.',
          'Andere onderdelen, en een pagina zonder subpagina’s, hebben geen geneste lijst.',
          'Ze staat als een balk over de volle breedte onder de rij van het menu, in een tint van de header, in gewone letters, met de huidige subpagina vet en met de rode streep.',
          'Een lange rij scrolt zijwaarts, met een vervaging aan de rand, en begint zo gescrold dat de huidige subpagina in beeld is.',
          'Op een heel smal scherm, of bij sterk inzoomen, loopt de rij om.',
          '',
          'Is de huidige pagina een onderdeel van het menu, dan heeft dat onderdeel `aria-current="page"`.',
          'Is het een subpagina, dan heeft de subpagina `aria-current="page"` en het onderdeel `aria-current="true"`.',
          'Het onderdeel blijft dan even vet en houdt de rode streep.',
          '',
          'De volgorde in de code is de volgorde van de focus: een link, dan zijn subpagina’s, dan de volgende link.',
          'Een toetsenbordgebruiker komt dus uit de balk terug bij de links die erboven staan.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Navigatie/Navigation',
})

const render = () => <Navigation items={exampleMenu} label="Hoofdmenu" />

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

// The main menu is the top of a page, so it runs from edge to edge of the window.
const fullscreen = { layout: 'fullscreen' } as const

const mainMenu = (current: ExampleMenuPage) => () => (
  <Navigation appearance="header" items={exampleMenuAt(current)} label="Hoofdmenu" />
)

export const NewsMainLight = meta.story({
  globals: { theme: 'light' },
  name: 'Hoofdmenu: Nieuws, licht',
  parameters: fullscreen,
  render: mainMenu('Nieuws'),
})

export const NewsMainDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Hoofdmenu: Nieuws, donker',
  parameters: fullscreen,
  render: mainMenu('Nieuws'),
})

export const ForumMainLight = meta.story({
  globals: { theme: 'light' },
  name: 'Hoofdmenu: Forum, licht',
  parameters: fullscreen,
  render: mainMenu('Forum'),
})

export const ForumMainDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Hoofdmenu: Forum, donker',
  parameters: fullscreen,
  render: mainMenu('Forum'),
})

const matchPages = [
  { href: '#programma', label: 'Programma' },
  { href: '#uitslagen', label: 'Uitslagen' },
  { href: '#stand', label: 'Stand' },
  { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
  { href: '#de-nul-gehouden', label: 'De nul gehouden' },
  { href: '#doelpunten-per-kwartier', label: 'Doelpunten per kwartier' },
]

/** The menu with Wedstrijden as the item that has sub-pages, and the page the visitor is on. */
const menuAt = (current: 'Nieuws' | 'Wedstrijden' | (typeof matchPages)[number]['label'], count = 3) => {
  const subitems = matchPages.slice(0, count).map((page) => ({ ...page, current: page.label === current }))
  const items: NavigationItem[] = [
    { current: current === 'Nieuws', href: '#nieuws', label: 'Nieuws' },
    { current: current === 'Wedstrijden', href: '#wedstrijden', label: 'Wedstrijden', subitems },
    { external: true, href: '#forum', label: 'Forum' },
  ]

  return items
}

const withSubpages = (current: Parameters<typeof menuAt>[0], count?: number) => () => (
  <>
    <Navigation appearance="header" items={menuAt(current, count)} label="Hoofdmenu" />
    <Page.Body>
      <ExampleMain />
    </Page.Body>
  </>
)

const noSubpagesStory = {
  docs: {
    description: {
      story:
        'Een pagina in het menu zonder subpagina’s, zoals Nieuws: de rij is zoals hij was en er is geen geneste lijst, ook al heeft een ander onderdeel er wel.',
    },
  },
}

export const WithoutSubpagesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Zonder subpagina’s',
  parameters: { ...fullscreen, ...noSubpagesStory },
  render: withSubpages('Nieuws'),
})

export const WithoutSubpagesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Zonder subpagina’s, donker',
  parameters: { ...fullscreen, ...noSubpagesStory },
  render: withSubpages('Nieuws'),
})

const onSectionStory = {
  docs: {
    description: {
      story:
        'De bezoeker is op Wedstrijden zelf. Het onderdeel heeft `aria-current="page"`, de balk met de subpagina’s staat eronder en geen subpagina is de huidige.',
    },
  },
}

export const SectionLight = meta.story({
  globals: { theme: 'light' },
  name: 'Onderdeel met subpagina’s',
  parameters: { ...fullscreen, ...onSectionStory },
  render: withSubpages('Wedstrijden'),
})

export const SectionDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Onderdeel met subpagina’s, donker',
  parameters: { ...fullscreen, ...onSectionStory },
  render: withSubpages('Wedstrijden'),
})

const onSubpageStory = {
  docs: {
    description: {
      story:
        'De bezoeker is op de subpagina Uitslagen. Die is vet met een rode streep en heeft `aria-current="page"`; Wedstrijden in het menu heeft `aria-current="true"` en houdt zijn gewicht en zijn streep.',
    },
  },
}

export const SubpageLight = meta.story({
  globals: { theme: 'light' },
  name: 'Subpagina als huidige',
  parameters: { ...fullscreen, ...onSubpageStory },
  render: withSubpages('Uitslagen'),
})

export const SubpageDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Subpagina als huidige, donker',
  parameters: { ...fullscreen, ...onSubpageStory },
  render: withSubpages('Uitslagen'),
})

// Only on the canvas, with Storybook's viewport setting: on the docs page they would show the
// same as the stories above.
const phone = { tags: ['!autodocs'] }

export const Scrolls = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Zes subpagina’s: de rij scrolt',
  parameters: {
    ...fullscreen,
    docs: {
      description: {
        story:
          'Zes subpagina’s passen niet op een telefoon. De rij scrolt zijwaarts, zonder schuifbalk, met een vervaging aan de rand. De huidige subpagina, Doelpuntenmakers, staat in beeld.',
      },
    },
  },
  render: withSubpages('Doelpuntenmakers', 6),
})

export const Wrapped = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile1' } },
  name: 'Smal scherm: de rij loopt om',
  parameters: {
    ...fullscreen,
    docs: {
      description: {
        story:
          'Op een heel smal scherm, of bij sterk inzoomen, scrolt de rij niet meer maar loopt om. Zo scrolt de pagina niet zijwaarts.',
      },
    },
  },
  render: withSubpages('Stand', 6),
})

const statesParameters = {
  docs: {
    description: {
      story:
        'De toestanden van een link in de balk, nagebootst met de add-on Pseudo States: de eerste onder de muis, de tweede ingedrukt, de derde met de focus. De huidige subpagina behoudt zijn streep onder de muis.',
    },
  },
  pseudo: {
    active: ['.hf-navigation-bar li:nth-child(2) a'],
    focusVisible: ['.hf-navigation-bar li:nth-child(3) a'],
    hover: ['.hf-navigation-bar li:nth-child(1) a'],
  },
}

export const StatesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Toestanden van de balk',
  parameters: { ...fullscreen, ...statesParameters },
  render: withSubpages('Programma'),
})

export const StatesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Toestanden van de balk, donker',
  parameters: { ...fullscreen, ...statesParameters },
  render: withSubpages('Programma'),
})

const sections = [
  { id: 'programma', title: 'Programma' },
  { id: 'uitslagen', title: 'Uitslagen' },
  { id: 'stand', title: 'Stand' },
]

const threeBarsParameters = {
  ...fullscreen,
  docs: {
    description: {
      story:
        'Een pagina met subpagina’s en ankers: het hoofdmenu met zijn subpagina’s en de balk met ankers, in die volgorde in de code en op het scherm. Alleen de balk met ankers plakt.',
    },
  },
}

const renderMenuAndAnchors = () => (
  <>
    <Navigation appearance="header" items={menuAt('Programma')} label="Hoofdmenu" />
    <Page.Shortcuts
      items={sections.map(({ id, title }) => ({ href: `#${id}`, label: title }))}
      label="Op deze pagina:"
    />
    <Page.Body>
      <Page.Main>
        {sections.map(({ id, title }) => (
          <Page.Cell key={id}>
            <Heading anchor id={id} level={2}>
              {title}
            </Heading>
            <Text>Hier staat wat bij {title.toLowerCase()} hoort. De kaart is lang genoeg om langs te scrollen.</Text>
            <Text>
              Boven deze kaart staan twee balken. Als je scrolt, gaat het menu met de subpagina’s weg, en blijft alleen
              de balk met ankers staan.
            </Text>
            <Text>
              Een kaart kan lang zijn, zodat de kop van de volgende kaart pas na een tijd langs de balk komt. Tot dan
              blijft de link naar deze kaart de huidige.
            </Text>
          </Page.Cell>
        ))}
      </Page.Main>
    </Page.Body>
  </>
)

export const MenuAndAnchors = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Menu, subpagina’s en ankers',
  parameters: threeBarsParameters,
  render: renderMenuAndAnchors,
})

export const MenuAndAnchorsDark = meta.story({
  ...phone,
  globals: { theme: 'dark', viewport: { value: 'mobile2' } },
  name: 'Menu, subpagina’s en ankers, donker',
  parameters: threeBarsParameters,
  render: renderMenuAndAnchors,
})

// The page scrolls to a heading, as after a click on its link: only the anchors are left.
const scrollToStand = () => {
  document.getElementById('stand')?.scrollIntoView({ behavior: 'instant', block: 'start' })
}

export const MenuAndAnchorsScrolled = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Menu, subpagina’s en ankers, gescrold',
  parameters: {
    ...fullscreen,
    docs: {
      description: {
        story:
          'De pagina is tot de kop van Stand gescrold. Het menu met de subpagina’s is weg, de balk met ankers blijft, en de kop komt er niet onder.',
      },
    },
  },
  play: scrollToStand,
  render: renderMenuAndAnchors,
})
