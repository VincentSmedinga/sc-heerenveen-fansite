import preview from '#.storybook/preview'

import { exampleMenu, exampleMenuAt, type ExampleMenuPage } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Page } from '../page/Page'
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
          'Buiten de header is de huidige pagina ook te zien zonder kleur: de link is vetter, met een dikkere onderstreping.',
          'Zo ziet het menu in de footer eruit.',
          '',
          'In de header staat het menu in een eigen rij onder het logo.',
          'Alle links hebben de lichtste kleur van de header, in gewicht 500 en niet onderstreept, tot je er met de muis op staat.',
          'De letters groeien mee met het venster: 16 pixels op een scherm van 320 pixels breed, oplopend tot 20 pixels vanaf 900 pixels.',
          'De huidige pagina heeft een rode streep eronder.',
          'Die streep heeft de kleur `--hf-colour-accent-on-header`.',
          'Zo is de huidige pagina ook zonder kleur te herkennen.',
          'De laatste link, die naar het forum, staat rechts, ook als hij op een smal scherm op een tweede rij komt.',
          '',
          'De links zijn 44 pixels hoog en lopen op een smal scherm door op een tweede regel.',
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

const inHeader = (current: ExampleMenuPage) => () => (
  <Page.Header>
    <Navigation items={exampleMenuAt(current)} label="Hoofdmenu" />
  </Page.Header>
)

export const NewsInHeaderLight = meta.story({
  globals: { theme: 'light' },
  name: 'In de header: Nieuws, licht',
  render: inHeader('Nieuws'),
})

export const NewsInHeaderDark = meta.story({
  globals: { theme: 'dark' },
  name: 'In de header: Nieuws, donker',
  render: inHeader('Nieuws'),
})

export const ForumInHeaderLight = meta.story({
  globals: { theme: 'light' },
  name: 'In de header: Forum, licht',
  render: inHeader('Forum'),
})

export const ForumInHeaderDark = meta.story({
  globals: { theme: 'dark' },
  name: 'In de header: Forum, donker',
  render: inHeader('Forum'),
})
