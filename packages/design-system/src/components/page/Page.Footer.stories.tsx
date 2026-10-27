import preview from '#.storybook/preview'

import { ExampleFooter, ExampleHeader } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De onderkant van de pagina: een `footer`, dus de contentinfo van de pagina.',
          'De footer sluit de pagina af zoals de header hem opent: met een eigen vlak, dat alleen door zijn kleur van de pagina verschilt.',
          'Het vlak loopt van de linker- tot de rechterrand van het venster, op elke breedte.',
          'In licht is het een stap donkerder dan de pagina, in donker een stap lichter.',
          'Wat erin staat, blijft in de kolom van de pagina, in lijn met de inhoud erboven.',
          'De verhalen voor een smal en een breed scherm staan alleen in het canvas, met de instelling Viewport van de werkbalk.',
          '',
          'De tekst heeft de kleur van secundaire tekst.',
          'Links in de footer hebben de kleur van gewone links: blauw, en onder de muis donkerder in licht en lichter in donker.',
          'Een bezochte link heeft dezelfde kleur als een gewone link, en de onderstreping blijft.',
          'Een link in de footer hoeft daar niets voor te doen.',
          'De kleuren en hun contrast staan bij [Tokens › Kleur](?path=/docs/tokens-kleur--documentatie).',
          '',
          'Bij de footer horen schuine strepen, zoals die van de Friese vlag.',
          'Ze beginnen over de footer, onder de tekst, en lopen daarboven naar boven uit, achter de rest van de pagina, tot ze vervagen.',
          'De hoogte volgt de footer, dus op een telefoon, waar de footer hoger is, zijn de strepen ook hoger.',
          'Ze scrollen met de pagina mee, nemen geen aanraking of muis aan en zijn er niet in geforceerde kleuren en bij het afdrukken.',
          'Je hoeft er niets voor te doen: ze zijn onderdeel van de footer, en de kleuren staan bij Tokens › Kleur.',
          '',
          'De inhoud zet je zelf neer: twee regels tekst, elk in een eigen `Text`, en dan de links over de site.',
          'Op de site zijn dat "Alle koppen en links op één plek." en "Voor supporters door supporters.".',
          'De links, zoals Over ons, Bronnen, Privacy en Updates, staan in een `Navigation` met de naam "Over de site".',
          'Op een breed scherm staan ze rechts naast de twee regels, ter hoogte van de bovenkant van de tekst; op een smal scherm staan ze eronder.',
          '',
          'De twee regels tekst breken niet af: een zin blijft op één regel.',
          'Alleen de links geven mee. Het zijn losse links, dus tussen de links mag een regel afbreken, en op een middelbaar scherm komen ze in twee rijen van ongeveer even lang naast de tekst.',
          'Op een scherm dat zo smal is dat de tekst nergens meer past, mag alles weer afbreken, als noodgreep: anders scrolt de pagina zijwaarts.',
        ].join('\n'),
      },
      source: exampleSource,
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Footer',
})

const render = () => <ExampleFooter />

// A short page, so the stripes above the footer are in view.
// The footer alone would show only the part over it.
const renderOnShortPage = () => (
  <Page>
    <ExampleHeader />
    <Page.Body>
      <Page.Main>
        <Page.Cell>
          <Heading level={1}>Een korte pagina</Heading>
          <Text>Met weinig inhoud, zodat de strepen boven de footer helemaal te zien zijn.</Text>
        </Page.Cell>
      </Page.Main>
    </Page.Body>
    <ExampleFooter />
  </Page>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

const shortPageParameters = {
  docs: {
    description: {
      story:
        'Op een korte pagina zijn de strepen helemaal te zien: over de footer, en daarboven naar boven vervagend, achter de inhoud.',
    },
    story: { iframeHeight: '30rem', inline: false },
  },
}

export const ShortPageLight = meta.story({
  globals: { theme: 'light' },
  name: 'Strepen op een korte pagina, licht',
  parameters: shortPageParameters,
  render: renderOnShortPage,
})

export const ShortPageDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Strepen op een korte pagina, donker',
  parameters: shortPageParameters,
  render: renderOnShortPage,
})

const statesParameters = {
  docs: {
    description: {
      story:
        'De tweede link is bezocht, de derde staat onder de muis en de vierde heeft focus, nagebootst met de add-on Pseudo States. Een bezochte link ziet er hetzelfde uit als een andere. Met de Tab-toets zie je de echte focusrand.',
    },
  },
  pseudo: {
    focusVisible: ['.hf-page-footer li:nth-child(4) a'],
    hover: ['.hf-page-footer li:nth-child(3) a'],
    visited: ['.hf-page-footer li:nth-child(2) a'],
  },
}

export const StatesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Bezocht, onder de muis en focus in licht',
  parameters: statesParameters,
  render,
})

export const StatesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Bezocht, onder de muis en focus in donker',
  parameters: statesParameters,
  render,
})

// Only on the canvas, with Storybook's viewport setting: on the docs page they would show the
// same as the stories above.
const screens = { tags: ['!autodocs'] }

const narrowDescription = 'Op een smal scherm staan de links onder de tekst, links uitgelijnd.'

const wideDescription =
  'Op een breed scherm staan de links rechts naast de twee regels tekst, ter hoogte van de bovenkant.'

const mediumDescription =
  'Op een middelbaar scherm staan de links in twee even lange rijen naast de tekst. De zinnen breken niet af.'

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

export const MediumLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: { value: 'medium' } },
  name: 'Middelbaar scherm, licht',
  parameters: { docs: { description: { story: mediumDescription } } },
  render,
})

export const MediumDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: { value: 'medium' } },
  name: 'Middelbaar scherm, donker',
  parameters: { docs: { description: { story: mediumDescription } } },
  render,
})
