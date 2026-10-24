import preview from '#.storybook/preview'

import { ExampleFooter } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De onderkant van de pagina: een `footer`, dus de contentinfo van de pagina.',
          'De footer sluit de pagina af zoals de header hem opent: met een eigen vlak en een dunne lijn erboven.',
          'Het vlak loopt van de linker- tot de rechterrand van het venster, op elke breedte.',
          'In licht is het een stap donkerder dan de pagina, in donker een stap lichter.',
          'Wat erin staat, blijft in de kolom van de pagina, in lijn met de inhoud erboven.',
          'De verhalen voor een smal en een breed scherm staan alleen in het canvas, met de instelling Viewport van de werkbalk.',
          '',
          'De tekst heeft de kleur van secundaire tekst.',
          'Links in de footer zijn donker zand, en onder de muis donkerder in licht en lichter in donker.',
          'Een bezochte link heeft dezelfde kleur als een gewone link, en de onderstreping blijft.',
          'Een link in de footer hoeft daar niets voor te doen.',
          'De kleuren en hun contrast staan bij [Tokens › Kleur](?path=/docs/tokens-kleur--documentatie).',
          '',
          'De inhoud zet je zelf neer: twee regels tekst, elk in een eigen `Text`, en dan de links over de site.',
          'Op de site zijn dat "Alle koppen en links op één plek." en "Voor supporters door supporters.".',
          'De links, zoals Over ons, Bronnen, Privacy en Wat is er nieuw, staan in een `Navigation` met de naam "Over de site".',
          'Op een breed scherm staan ze rechts naast de twee regels, in het midden; op een smal scherm staan ze eronder.',
        ].join('\n'),
      },
      source: exampleSource,
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Page.Footer',
})

const render = () => <ExampleFooter />

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

// Only on the canvas, with Storybook's viewport setting: on the docs page they would show the same as the stories above.
const screens = { tags: ['!autodocs'] }

const narrowDescription = 'Op een smal scherm staan de links onder de tekst, links uitgelijnd.'

const wideDescription = 'Op een breed scherm staan de links rechts naast de twee regels tekst, in het midden.'

export const NarrowLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: { value: 'mobile1' } },
  name: 'Smal scherm, licht',
  parameters: { docs: { description: { story: narrowDescription } } },
  render,
})

export const NarrowDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: { value: 'mobile1' } },
  name: 'Smal scherm, donker',
  parameters: { docs: { description: { story: narrowDescription } } },
  render,
})

export const WideLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: { value: 'wide' } },
  name: 'Breed scherm, licht',
  parameters: { docs: { description: { story: wideDescription } } },
  render,
})

export const WideDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: { value: 'wide' } },
  name: 'Breed scherm, donker',
  parameters: { docs: { description: { story: wideDescription } } },
  render,
})
