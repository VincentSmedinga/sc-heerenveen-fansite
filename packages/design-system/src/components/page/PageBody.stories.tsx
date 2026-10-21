import preview from '#.storybook/preview'

import { ExampleContent } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { PageBody } from './PageBody'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Het deel van de pagina tussen de header en de footer.',
          'Het groeit mee met de hoogte van het scherm, zodat de footer onderaan blijft staan.',
          '',
          'Met `as` kies je het element uit een vaste lijst:',
          '',
          '- `main` (standaard): de `PageBody` is de `main` van de pagina, de landmark met de inhoud.',
          '- `div`: voor een pagina met meer dan de hoofdinhoud, zoals een zijbalk.',
          '  Dan zet je zelf een `main` in de `PageBody` en de zijbalk (`aside`) ernaast.',
          '',
          'Er is maar één `main` per pagina, en die zit in de `PageBody` of dieper.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/PageBody',
})

const render = () => (
  <PageBody>
    <ExampleContent />
  </PageBody>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

export const WithSidebar = meta.story({
  name: 'Met zijbalk',
  parameters: {
    docs: {
      description: {
        story:
          'De `PageBody` is een `div`; de `main` en de zijbalk staan erin, naast elkaar. Op een smal scherm vallen ze onder elkaar.',
      },
    },
  },
  render: () => (
    <PageBody as="div" style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
      <main style={{ flex: '2 1 20rem', minInlineSize: 0 }}>
        <ExampleContent />
      </main>
      <aside aria-labelledby="zijbalk" style={{ flex: '1 1 12rem', minInlineSize: 0 }}>
        <Heading appearance={3} id="zijbalk" level={2}>
          Nieuwste discussies
        </Heading>
        <Text appearance="meta">Hier komt een blok uit het forum.</Text>
      </aside>
    </PageBody>
  ),
})
