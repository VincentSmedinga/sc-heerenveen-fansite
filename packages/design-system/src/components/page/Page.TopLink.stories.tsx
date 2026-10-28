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
          'Een ronde knop in de footer die de bezoeker terugbrengt naar de bovenkant van de pagina.',
          'Hij ziet eruit als de themaknop in de header, met een pijl omhoog in plaats van de zon of de maan, en heeft geen zichtbare tekst.',
          'Het `label` is de naam voor schermlezers, zoals "Naar boven".',
          'Het is een gewone link naar de bovenkant van de pagina, dus hij werkt ook zonder JavaScript.',
          '',
          'De knop is er alleen als hij nuttig is: als de pagina meer dan twee keer zo hoog is als het venster.',
          'Op een korte pagina, zoals een foutpagina, zie je hem nooit.',
          'Dat regelt CSS, op de scrollpositie van de pagina, zonder script.',
          'Een verborgen knop is niet bereikbaar met Tab en een schermlezer leest hem niet voor.',
          'Een browser die dit niet kent, toont de knop altijd.',
          '',
          'Zet hem als laatste in de `Page.Footer`, na de links.',
          'Op het scherm staat hij rechts, op een smal scherm boven de links, maar voor het toetsenbord komt hij na de andere links.',
          'Wie onderaan een lange pagina naar de footer tabt, komt zo bij de knop zodra hij zichtbaar is.',
          '',
          'De kleuren zijn die van de links in de footer.',
          'De knop ligt over de strepen van de vlag, en in geforceerde kleuren heeft hij een rand in een systeemkleur.',
          'Bij het afdrukken is hij er niet.',
          '',
          'De verhalen hieronder tonen de knop op een korte pagina, met de regel opgeheven, zodat hij te zien is.',
          'In het verhaal over een lange pagina werkt de regel echt: scrol naar beneden en de knop verschijnt.',
        ].join('\n'),
      },
      source: exampleSource,
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.TopLink',
})

// A short page can't scroll, so the link would stay hidden there. This lifts the rule, so the
// link shows on a short page. It is outside the layers, so it wins over top-link.css.
const showAlways = <style>{'.hf-page-top-link { animation: none; visibility: visible; }'}</style>

const renderOnShortPage = (_args: unknown, { globals }: { globals: Record<string, unknown> }) => (
  <Page>
    {showAlways}
    <ExampleHeader dark={globals['theme'] === 'dark'} />
    <Page.Body>
      <Page.Main>
        <Page.Cell>
          <Heading level={1}>Een korte pagina</Heading>
          <Text>
            De regel is hier opgeheven, zodat de knop in de footer te zien is. Op een echte korte pagina is hij er niet.
          </Text>
        </Page.Cell>
      </Page.Main>
    </Page.Body>
    <ExampleFooter topLink />
  </Page>
)

const shortPageParameters = {
  docs: { story: { iframeHeight: '30rem', inline: false } },
}

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Licht',
  parameters: shortPageParameters,
  render: renderOnShortPage,
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Donker',
  parameters: shortPageParameters,
  render: renderOnShortPage,
})

const hoverParameters = {
  ...shortPageParameters,
  docs: {
    ...shortPageParameters.docs,
    description: {
      story:
        'Onder de muis wordt de pijl donkerder in licht en lichter in donker, met een rand en een vulling. Dat doet hij alleen met een muis, niet na een tik op een telefoon. Ingedrukt ziet de knop er hetzelfde uit.',
    },
  },
  pseudo: { hover: ['.hf-page-top-link'] },
}

const focusParameters = {
  ...shortPageParameters,
  docs: {
    ...shortPageParameters.docs,
    description: {
      story:
        'Met het toetsenbord heeft de knop dezelfde rand en vulling als onder de muis, en daaromheen de focusrand van de pagina. De focusrand ligt over de strepen.',
    },
  },
  pseudo: { focusVisible: ['.hf-page-top-link'] },
}

export const HoverLight = meta.story({
  globals: { theme: 'light' },
  name: 'Onder de muis in licht',
  parameters: hoverParameters,
  render: renderOnShortPage,
})

export const HoverDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Onder de muis in donker',
  parameters: hoverParameters,
  render: renderOnShortPage,
})

export const FocusLight = meta.story({
  globals: { theme: 'light' },
  name: 'Focus in licht',
  parameters: focusParameters,
  render: renderOnShortPage,
})

export const FocusDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Focus in donker',
  parameters: focusParameters,
  render: renderOnShortPage,
})

const renderOnLongPage = (_args: unknown, { globals }: { globals: Record<string, unknown> }) => (
  <Page>
    <ExampleHeader dark={globals['theme'] === 'dark'} />
    <Page.Body>
      <Page.Main>
        <Page.Cell>
          <Heading level={1}>Een lange pagina</Heading>
          <Text>
            Scrol naar beneden. De knop in de footer verschijnt zodra de pagina verder is gescrold dan de hoogte van het
            venster.
          </Text>
        </Page.Cell>
        <div style={{ blockSize: '250vh' }} />
      </Page.Main>
    </Page.Body>
    <ExampleFooter topLink />
  </Page>
)

export const LongPage = meta.story({
  globals: { theme: 'light' },
  name: 'Een lange pagina: de regel werkt',
  parameters: {
    docs: {
      description: {
        story:
          'Hier is de regel niet opgeheven. Bovenaan is de knop er niet, en niet bereikbaar met Tab. Onderaan de pagina is hij er wel.',
      },
      story: { iframeHeight: '30rem', inline: false },
    },
  },
  render: renderOnLongPage,
})
