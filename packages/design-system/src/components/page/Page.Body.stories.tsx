import preview from '#.storybook/preview'

import { ExampleContent } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Het deel van de pagina tussen de header en de footer.',
          'Het groeit mee met de hoogte van het scherm, zodat de footer onderaan blijft staan.',
          '',
          'De inhoud staat op een breed scherm in een smallere kolom, alsof er een zijbalk naast staat.',
          'Een regel lopende tekst telt daar hoogstens 80 tekens, en een kop van een bericht ook.',
          'De kolom begint in lijn met het logo, en de rest van de kolom van de pagina blijft leeg, als plek voor een zijbalk later.',
          'Op een scherm dat smaller is dan de kolom gebruikt de inhoud de hele breedte.',
          'De breedte komt uit het token `--hf-content-max-width` (36 rem), gemeten in de lettertypes van de site.',
          'Dit geldt voor elke `Page.Body`, dus voor elke pagina; de header en de footer blijven over de hele kolom van de pagina lopen.',
          'Is de `Page.Body` een `div`, dan geldt de breedte voor de `main` erin, en niet voor de zijbalk.',
          '',
          'Met `as` kies je het element uit een vaste lijst:',
          '',
          '- `main` (standaard): de `Page.Body` is de `main` van de pagina, de landmark met de inhoud.',
          '- `div`: voor een pagina met meer dan de hoofdinhoud, zoals een zijbalk.',
          '  Dan zet je zelf een `main` in de `Page.Body` en de zijbalk (`aside`) ernaast.',
          '',
          'Er is maar één `main` per pagina, en die zit in de `Page.Body` of dieper.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Page.Body',
})

const render = () => (
  <Page.Body>
    <ExampleContent />
  </Page.Body>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

export const WithSidebar = meta.story({
  name: 'Met zijbalk',
  parameters: {
    docs: {
      description: {
        story:
          'De `Page.Body` is een `div`; de `main` en de zijbalk staan erin, naast elkaar. Op een smal scherm vallen ze onder elkaar.',
      },
    },
  },
  render: () => (
    <Page.Body as="div" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
      <main style={{ flex: '2 1 20rem', minInlineSize: 0 }}>
        <ExampleContent />
      </main>
      <aside aria-labelledby="zijbalk" style={{ flex: '1 1 12rem', minInlineSize: 0 }}>
        <Heading appearance={3} id="zijbalk" level={2}>
          Nieuwste discussies
        </Heading>
        <Text appearance="meta">Hier komt een blok uit het forum.</Text>
      </aside>
    </Page.Body>
  ),
})
