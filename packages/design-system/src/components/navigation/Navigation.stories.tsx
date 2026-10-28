import { expect, userEvent, waitFor } from 'storybook/test'

import preview from '#.storybook/preview'

import {
  exampleLongMenu,
  type ExampleLongMenuPage,
  exampleMenu,
  exampleMenuAt,
  type ExampleMenuPage,
  exampleMenuWithSubpages,
} from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Navigation } from './Navigation'

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
          'Buiten de header is de huidige pagina ook te zien zonder kleur: de link is 200 zwaarder, met een dikkere onderstreping.',
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
          'Ze staat als een balk over de volle breedte onder de rij van het menu, in een tint van de header, in gewone letters, met de huidige subpagina zwaarder en met de rode streep.',
          'Een lange rij scrolt zijwaarts, met een vervaging aan de rand, en begint zo gescrold dat de huidige subpagina in beeld is.',
          'Op een heel smal scherm, of bij sterk inzoomen, loopt de rij om.',
          '',
          'Is de huidige pagina een onderdeel van het menu, dan heeft dat onderdeel `aria-current="page"`.',
          'Is het een subpagina, dan heeft de subpagina `aria-current="page"` en het onderdeel `aria-current="true"`.',
          'Het onderdeel blijft dan even vet en houdt de rode streep.',
          '',
          'De volgorde in de code is de volgorde van de focus: een link, dan zijn subpagina’s, dan de volgende link.',
          'Een toetsenbordgebruiker komt dus uit de balk terug bij de links die erboven staan.',
          '',
          'Heeft het hoofdmenu zes of meer onderdelen, en krijgt `Navigation` een `moreLabel` zoals "Meer", dan passen ze niet op een telefoon.',
          'Op een smal scherm staan dan het eerste onderdeel, de knop en het laatste onderdeel (het forum) in de rij.',
          'De onderdelen ertussen staan in een lijst onder de knop, die opengaat in de pagina en de rest naar beneden duwt.',
          'Op een breed scherm staat alles in de rij, en bij vijf onderdelen of minder verandert er niets.',
          'De knop opent en sluit zonder JavaScript.',
          'Met JavaScript sluit de lijst ook met Escape, met een klik op een link of ernaast, en bij een andere pagina.',
          'Staat de huidige pagina achter de knop, dan komt hij naar voren in de rij, met zijn subpagina’s eronder.',
          'Past hij daar niet, dan blijft hij in de lijst en krijgt de knop de rode streep.',
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

const withSubpages = (current: Parameters<typeof exampleMenuWithSubpages>[0], count?: number) => () => (
  <Navigation appearance="header" items={exampleMenuWithSubpages(current, count)} label="Hoofdmenu" />
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
        'De bezoeker is op de subpagina Uitslagen. Die is zwaarder dan de andere subpagina’s, met een rode streep en heeft `aria-current="page"`; Wedstrijden in het menu heeft `aria-current="true"` en houdt zijn gewicht en zijn streep.',
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

const longMenu = (current: ExampleLongMenuPage) => () => (
  <Navigation appearance="header" items={exampleLongMenu(current)} label="Hoofdmenu" moreLabel="Meer" />
)

// The menu of eight items needs the button on a phone, so these are on the canvas only, with
// Storybook's viewport setting; on the docs page they would show the same width as the others.
const mobile = (viewport: 'mobile1' | 'mobile2') => ({
  ...phone,
  globals: { theme: 'light', viewport: { value: viewport } },
})

const closeStory = (story: string) => ({ ...fullscreen, docs: { description: { story } } })

export const MoreWide = meta.story({
  globals: { theme: 'light' },
  name: 'Meer: breed scherm, alles in de rij',
  parameters: closeStory('Acht onderdelen op een breed scherm staan alle in de rij, en de knop “Meer” is er niet.'),
  render: longMenu('Nieuws'),
})

export const MoreClosed = meta.story({
  ...mobile('mobile2'),
  name: 'Meer: dicht',
  parameters: closeStory(
    'Op een telefoon: het eerste onderdeel, de knop “Meer” met een pijltje omlaag, en het forum rechts.',
  ),
  render: longMenu('Nieuws'),
})

export const MoreClosedDark = meta.story({
  ...mobile('mobile2'),
  globals: { theme: 'dark', viewport: { value: 'mobile2' } },
  name: 'Meer: dicht, donker',
  parameters: closeStory('De knop in het donkere thema.'),
  render: longMenu('Nieuws'),
})

const opened = async ({ canvas }: { canvas: { getByText: (text: string) => HTMLElement } }) => {
  await userEvent.click(canvas.getByText('Meer'))
}

export const MoreOpen = meta.story({
  ...mobile('mobile2'),
  name: 'Meer: open',
  parameters: closeStory(
    'De lijst staat onder de rij, begint onder de tekst van “Meer” en duwt de pagina naar beneden. Het pijltje wijst omhoog.',
  ),
  play: opened,
  render: longMenu('Nieuws'),
})

export const MoreOpenDark = meta.story({
  ...mobile('mobile2'),
  globals: { theme: 'dark', viewport: { value: 'mobile2' } },
  name: 'Meer: open, donker',
  parameters: closeStory('De open lijst in het donkere thema.'),
  play: opened,
  render: longMenu('Nieuws'),
})

export const MoreCurrentInRow = meta.story({
  ...mobile('mobile2'),
  name: 'Meer: de huidige pagina staat in de rij',
  parameters: closeStory(
    'De bezoeker is op Spelers, dat achter “Meer” staat. Spelers komt naar voren in de rij, met de rode streep, en staat niet meer in de lijst.',
  ),
  play: opened,
  render: longMenu('Spelers'),
})

export const MoreCurrentWithSubpages = meta.story({
  ...mobile('mobile2'),
  name: 'Meer: de huidige pagina heeft subpagina’s',
  parameters: closeStory(
    'De bezoeker is op de subpagina Uitslagen van Wedstrijden, dat achter “Meer” staat. Wedstrijden komt naar voren in de rij (aria-current="true") met zijn balk eronder, en Uitslagen heeft aria-current="page". Een schermlezer ziet de balk één keer.',
  ),
  // The stylesheet shows one copy of the page behind the button: a screen reader meets it once.
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('link', { name: 'Wedstrijden' })).toHaveLength(1)
    await expect(canvas.getAllByRole('link', { name: 'Uitslagen' })).toHaveLength(1)
    await expect(canvas.getAllByRole('link', { current: 'page' })).toHaveLength(1)
    await expect(canvas.getByRole('link', { name: 'Wedstrijden' })).toHaveAttribute('aria-current', 'true')
  },
  render: longMenu('Uitslagen'),
})

export const MoreCurrentWithSubpagesDark = meta.story({
  ...mobile('mobile2'),
  globals: { theme: 'dark', viewport: { value: 'mobile2' } },
  name: 'Meer: de huidige pagina heeft subpagina’s, donker',
  parameters: closeStory('Hetzelfde in het donkere thema.'),
  play: opened,
  render: longMenu('Uitslagen'),
})

export const MoreCurrentInList = meta.story({
  ...mobile('mobile1'),
  name: 'Meer: de huidige pagina past niet in de rij',
  parameters: closeStory(
    'Op een heel smal scherm past de huidige pagina niet naast “Meer”. Hij blijft in de lijst en “Meer” krijgt de rode streep. De balk met subpagina’s blijft zichtbaar.',
  ),
  play: async (context) => {
    await opened(context)
    await expect(context.canvas.getAllByRole('link', { name: 'Wedstrijden' })).toHaveLength(1)
    await expect(context.canvas.getAllByRole('link', { name: 'Uitslagen' })).toHaveLength(1)
  },
  render: longMenu('Uitslagen'),
})

export const MoreEscape = meta.story({
  ...mobile('mobile2'),
  name: 'Meer: Escape sluit de lijst',
  parameters: closeStory(
    'Escape sluit de open lijst, en de focus staat dan op de knop. Enter of spatie op de knop opent hem zonder JavaScript.',
  ),
  play: async ({ canvas }) => {
    const button = canvas.getByText('Meer').closest('summary')!

    await userEvent.click(button)
    await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'true'))
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(button).toHaveAttribute('aria-expanded', 'false'))
    await expect(button).toHaveFocus()
  },
  render: longMenu('Nieuws'),
})
