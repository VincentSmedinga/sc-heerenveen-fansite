import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { Text } from '../text/Text'
import { DiscussionItem } from './DiscussionItem'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een regel met een discussie van ons eigen forum.',
          'De titel is een link naar de discussie op het forum.',
          'Daaronder staan het aantal reacties, wie het laatst reageerde en wanneer, zoals "83 reacties · laatst Buffon1, 13:28".',
          'Het aantal telt de reacties, dus zonder het openingsbericht.',
          'Het component schrijft "1 reactie" en "0 reacties" goed.',
          '',
          'De schermnaam is gewone tekst: geen link naar een profiel en geen avatar.',
          'Weet het forum niet wie het laatst reageerde, dan laat je `lastPostedBy` weg.',
          'Er staat dan "83 reacties · laatst 13:28".',
          'Het component laat nooit de tekst van een bericht zien (zie Redactie, "Ons eigen forum").',
          '',
          'De titel is niet onderstreept, zoals de kop van een nieuwsregel, want een lijst met veel onderstreepte titels is druk.',
          'Onder de muis en met de focus van het toetsenbord krijgt hij de onderstreping, naast de focusrand.',
          'De kleuren veranderen niet: een bezochte titel houdt de kleur voor bezocht, en onder de muis krijgt hij de kleur voor hover.',
          'De titel staat op een eigen regel, iets zwaarder dan gewone tekst en in de kleur voor links, dus je herkent hem ook zonder onderstreping als link.',
          'De titel is groot genoeg om goed te raken, en een lange titel loopt door op de volgende regel.',
          '',
          '- `title` is de titel, zoals het forum hem heeft.',
          '  Het component past hem niet aan.',
          '- `href` is het adres van de discussie op het forum.',
          '  De link opent in hetzelfde tabblad.',
          '- `replies` is het aantal reacties.',
          '- `lastPostedBy` is de schermnaam van de laatste reageerder.',
          '- `time` is de tijd zoals een bezoeker hem leest, zoals "13:28" of "wo 14:05".',
          '  `dateTime` is de volledige tijd voor het `time`-element, zoals `2026-10-23T11:28:21Z`.',
          '  Het component kent geen tijdzone en rekent niet: de pagina zegt welke tijd de bezoeker ziet.',
          '',
          'Het component is een `div`.',
          'Zet hem in een `List.Item` voor een lijst met discussies, en geef de `List` `role="list"`: Safari noemt een lijst zonder opsommingstekens anders geen lijst meer.',
          'De lijst krijgt dan geen opsommingstekens en geen inspringing, en tussen de regels staat een dunne lijn.',
          'Zet de lijst in een `Card`, onder een kop van niveau 2, met onderaan een link naar het forum.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/DiscussionItem',
})

// The block as the homepage has it, in the width of the sidebar. The discussions are made up, as are the screen names.
const renderBlock = (maxInlineSize: string) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="discussies-kop">
      <Heading id="discussies-kop" level={2}>
        Nieuwste discussies
      </Heading>
      <List role="list">
        <List.Item>
          <DiscussionItem
            dateTime="2026-10-23T11:28:21Z"
            href="#wie-wint-zondag"
            lastPostedBy="Buffon1"
            replies={83}
            time="13:28"
            title="Wie wint er zondag?"
          />
        </List.Item>
        <List.Item>
          <DiscussionItem
            dateTime="2026-10-22T19:45:00Z"
            href="#nieuwe-spits"
            lastPostedBy="Tribunetijger"
            replies={1}
            time="do 21:45"
            title="Nieuwe spits gezocht"
          />
        </List.Item>
        <List.Item>
          <DiscussionItem
            dateTime="2026-10-20T08:10:00Z"
            href="#stadion"
            lastPostedBy="Friesche Pompebled"
            replies={0}
            time="di 10:10"
            title="Het stadion in de winter"
          />
        </List.Item>
        <List.Item>
          <DiscussionItem
            dateTime="2026-10-14T16:00:00Z"
            href="#jeugd"
            replies={12}
            time="14 okt"
            title="Jeugdopleiding"
          />
        </List.Item>
      </List>
      <Text>
        <Link href="#forum">Naar het forum</Link>
      </Text>
    </Card>
  </div>
)

const renderSidebar = renderBlock('20rem')

const renderNarrow = renderBlock('16rem')

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Zijbalk, met 83, 1 en 0 reacties en een regel zonder schermnaam, licht',
  render: renderSidebar,
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Zijbalk, met 83, 1 en 0 reacties en een regel zonder schermnaam, donker',
  render: renderSidebar,
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Smalle kolom, licht',
  render: renderNarrow,
})

export const NarrowDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Smalle kolom, donker',
  render: renderNarrow,
})

// A title is only underlined under the mouse and with the focus of the keyboard, so those states are imitated: the first
// title is under the mouse, the second has the focus and the third has been visited.
const stateParameters = {
  docs: {
    description: {
      story:
        'De eerste titel staat onder de muis, de tweede heeft de focus van het toetsenbord en de derde is bezocht, nagebootst met de add-on Pseudo States. Alleen de eerste twee zijn onderstreept. Met de Tab-toets zie je de echte focusrand.',
    },
  },
  pseudo: {
    focusVisible: ['li:nth-child(2) .hf-discussion-item-title'],
    hover: ['li:nth-child(1) .hf-discussion-item-title'],
    visited: ['li:nth-child(3) .hf-discussion-item-title'],
  },
}

export const StatesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Titel onder de muis, met focus en bezocht, licht',
  parameters: stateParameters,
  render: renderSidebar,
})

export const StatesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Titel onder de muis, met focus en bezocht, donker',
  parameters: stateParameters,
  render: renderSidebar,
})

const renderLong = () => (
  <div style={{ maxInlineSize: '16rem' }}>
    <Card aria-label="Een lange titel">
      <List role="list">
        <List.Item>
          <DiscussionItem
            dateTime="2026-10-23T11:28:21Z"
            href="#lang"
            lastPostedBy="Een supporter met een erg lange schermnaam zonder spaties: Tribunetijger_van_het_noorden"
            replies={1234}
            time="13:28"
            title="Een discussie met een heel lange titel over de wedstrijd van zondag, de opstelling, de wissels en alles wat daarna gebeurde in de kantine"
          />
        </List.Item>
        <List.Item>
          <DiscussionItem
            dateTime="2026-10-22T19:45:00Z"
            href="#kort"
            lastPostedBy="Buffon1"
            replies={3}
            time="do 21:45"
            title="Opstelling"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const LongTitleLight = meta.story({
  globals: { theme: 'light' },
  name: 'Lange titel en lange schermnaam, licht',
  render: renderLong,
})

export const LongTitleDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Lange titel en lange schermnaam, donker',
  render: renderLong,
})
