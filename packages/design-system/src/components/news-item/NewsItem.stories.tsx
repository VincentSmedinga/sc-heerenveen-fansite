import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { NewsItem } from './NewsItem'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een regel nieuws van een andere bron. Links staan de dag en de tijd in rood, zoals "wo 14:05", of voor wat ouder is de datum en de tijd, zoals "14 okt 14:05".',
          'Daarnaast staat de kop als link naar het bericht bij de bron, en daaronder de naam van de bron met een klein pictogram voor een link naar buiten en, als het bericht achter een betaalmuur staat, "voor abonnees".',
          'De kolom is op elke regel even breed, zodat de koppen op één lijn beginnen.',
          'Een datum en een tijd passen niet naast elkaar in de kolom: de tijd komt op een tweede regel, onder de datum.',
          'Is de regel zelf smal, zoals op een telefoon of in de zijbalk, dan staan de dag en de tijd boven de kop, zodat de kop en de bron de hele breedte krijgen.',
          'Het component kiest dat met een container query op zijn eigen breedte, niet op die van het venster.',
          'De volgorde in de HTML en voor een schermlezer blijft gelijk: eerst de dag en de tijd, dan de kop.',
          '',
          'De kop is niet onderstreept, want een lijst met veel onderstreepte koppen is druk.',
          'Onder de muis en met de focus van het toetsenbord krijgt hij de onderstreping, naast de focusrand.',
          'De onderstreping is iets dunner dan bij andere links onder de muis, passend bij het gewicht van de kop, staat iets dichter bij de tekst, en loopt niet door de staarten van letters als de g en de p.',
          'De kop is een van de twee links die grijs worden als je ze hebt geopend (de andere is de titel van een discussie); onder de muis krijgt hij de kleur voor hover, ook als hij bezocht is.',
          'Een kop staat op een eigen regel, iets zwaarder dan gewone tekst en in de kleur voor links, dus je herkent hem ook zonder onderstreping als link.',
          'Andere links blijven onderstreept.',
          'De kop heeft de maat van gewone tekst en een iets zwaarder gewicht, Medium.',
          '',
          '- `headline` is de kop, zoals de bron hem publiceerde.',
          '  Het component past hem niet aan.',
          '- `href` is het adres van het bericht bij de bron.',
          '  De link opent in hetzelfde tabblad.',
          '- `source` is de naam van de bron, zoals de bron vermeld wil worden.',
          '- `time` is de korte dag en de tijd, of de datum en de tijd, zoals een bezoeker ze leest: "wo 14:05" of "14 okt 14:05".',
          '  `dateTime` is de volledige tijd voor het `time`-element, zoals `2026-10-21T12:05:00Z`.',
          '  Het component kent geen tijdzone en rekent niet: de pagina zegt welke dag en tijd de bezoeker ziet.',
          '- `internal` is voor een pagina van onze eigen site, zoals een artikel van de redactie: het pictogram voor een link naar buiten blijft dan weg.',
          '  De naam van de bron is dan "Van de redactie".',
          '- `paywalled` zet "voor abonnees" onder de kop, achter de naam van de bron.',
          '  Dat staat in tekst, zodat het ook werkt voor een schermlezer en zonder kleur.',
          '- `details` is een lijst met korte feiten als tekst, zoals "49 min" of "seizoen 9, aflevering 16".',
          '  Ze staan achter de naam van de bron en achter "voor abonnees", elk na een puntje.',
          '  Het zijn feiten over het item en geen inhoud ervan, dus ze mogen zonder toestemming van de bron.',
          '  De pagina schrijft de feiten uit in woorden, want het component rekent en vertaalt niet.',
          '',
          'Het component heeft geen props voor een intro of een foto.',
          'Die tonen we alleen met toestemming van de bron (principe 1 en 2 van de Redactie).',
          'Er staat ook geen logo of pictogram van de bron bij (principe 3).',
          'Het pictogram bij de naam is geen pictogram van de bron: het zegt dat de kop naar een andere site gaat.',
          'Het is onze eigen SVG, in de kleur van de tekst, en voor een schermlezer verborgen.',
          'De naam van de link is de kop alleen.',
          '',
          'Het component is een `div`.',
          'Zet hem in een `List.Item` voor een lijst met nieuws, en geef de `List` `role="list"`: Safari noemt een lijst zonder opsommingstekens anders geen lijst meer.',
          'De lijst krijgt dan geen opsommingstekens en geen inspringing, en tussen de regels staat een dunne lijn.',
          'Zet de lijst in een `Card` met het witte vlak: daarop haalt het rood 4,5:1, in licht en donker.',
          'De kop is minstens 24 pixels hoog, en een lange kop loopt door op de volgende regel.',
          'De woorden van een kop die over meer regels loopt zijn over die regels verdeeld, zodat geen regel met één woord alleen overblijft.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/NewsItem',
})

// The width of the container, not of the window, decides how a line looks: a wide column such
// as the main column of a page, and a narrow one such as a phone or the sidebar.
const renderIn = (maxInlineSize: string) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="nieuws-kop">
      <Heading id="nieuws-kop" level={2}>
        Laatste nieuws
      </Heading>
      <List role="list">
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T12:05:00Z"
            headline="Heerenveen wint in blessuretijd van Testclub"
            href="#heerenveen-wint"
            source="Testkrant"
            time="wo 14:05"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T08:30:00Z"
            headline="Trainer over de blessures: ‘Er komt niemand terug voor zondag’"
            href="#blessures"
            paywalled
            source="Testkrant"
            time="wo 10:30"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-20T17:45:00Z"
            headline="Jeugdspeler tekent zijn eerste contract"
            href="#contract"
            source="Voorbeeldkrant"
            time="di 19:45"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-14T12:05:00Z"
            headline="Terugblik op de zege in Zwolle, met een nieuwe aanvaller en een geblesseerde captain"
            href="#terugblik"
            source="Testkrant"
            time="14 okt 14:05"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

const renderWide = renderIn('38rem')

const renderNarrow = renderIn('20rem')

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Brede container, zonder en met betaalmuur, licht',
  render: renderWide,
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Brede container, zonder en met betaalmuur, donker',
  render: renderWide,
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Smalle container, dag en tijd boven de kop, licht',
  render: renderNarrow,
})

export const NarrowDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Smalle container, dag en tijd boven de kop, donker',
  render: renderNarrow,
})

// A headline is only underlined under the mouse and with the focus of the keyboard, so those
// states are imitated: the first headline is under the mouse, the second has the focus and the
// third has been visited.
const stateParameters = {
  docs: {
    description: {
      story:
        'De eerste kop staat onder de muis, de tweede heeft de focus van het toetsenbord en de derde is bezocht, nagebootst met de add-on Pseudo States. Alleen de eerste twee zijn onderstreept. Met de Tab-toets zie je de echte focusrand.',
    },
  },
  pseudo: {
    focusVisible: ['li:nth-child(2) .hf-news-item-headline'],
    hover: ['li:nth-child(1) .hf-news-item-headline'],
    visited: ['li:nth-child(3) .hf-news-item-headline'],
  },
}

export const StatesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Kop onder de muis, met focus en bezocht, licht',
  parameters: stateParameters,
  render: renderWide,
})

export const StatesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Kop onder de muis, met focus en bezocht, donker',
  parameters: stateParameters,
  render: renderWide,
})

const renderEpisodes = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="podcast-kop">
      <Heading id="podcast-kop" level={2}>
        Nieuwste podcasts
      </Heading>
      <List role="list">
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T12:05:00Z"
            details={['seizoen 9, aflevering 16', '37 min']}
            headline="S9E16 | De 1e, 10e, 100e en 1000e"
            href="#aflevering-16"
            source="Testpodcast"
            time="wo 14:05"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-14T12:05:00Z"
            details={['1 uur 12 min']}
            headline="Een aflevering met een lange kop over een wedstrijd vol wendingen en een doelpunt in de laatste minuut"
            href="#aflevering-lang"
            source="Proefpodcast"
            time="14 okt"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const EpisodesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Afleveringen met feiten, licht',
  parameters: {
    docs: {
      description: {
        story:
          'Een aflevering van een podcast heeft achter de naam van de bron de duur en, als de podcast ze geeft, het seizoen en het nummer.',
      },
    },
  },
  render: renderEpisodes,
})

export const EpisodesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Afleveringen met feiten, donker',
  render: renderEpisodes,
})

const renderLong = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-label="Een lange kop">
      <List role="list">
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T12:05:00Z"
            headline="Heerenveen na een wedstrijd vol wendingen, blessures en een doelpunt in de laatste minuut toch nog langs Testclub: ‘Dit is wat we nodig hadden’"
            href="#lang"
            paywalled
            source="Voorbeeldkrant, met dank aan de redactie"
            time="wo 14:05"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T08:30:00Z"
            headline="Trainer"
            href="#kort"
            source="Testkrant"
            time="wo 10:30"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-09T06:10:00Z"
            headline="Heerenveen na een wedstrijd vol wendingen, blessures en een doelpunt in de laatste minuut toch nog langs Testclub: ‘Dit is wat we nodig hadden’"
            href="#lang-datum"
            source="Testkrant"
            time="9 okt 08:10"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const LongHeadlineLight = meta.story({
  globals: { theme: 'light' },
  name: 'Lange kop, licht',
  render: renderLong,
})

export const LongHeadlineDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Lange kop, donker',
  render: renderLong,
})

// The headlines are made up. Each one breaks over two or three lines in a narrow column, so the
// words are spread over the lines and no line is left with one word. The third has a long word,
// which breaks instead of making the page scroll sideways, and the last is Frisian.
const renderBalanced = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-label="Koppen in balans">
      <List role="list">
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T12:05:00Z"
            headline="Heerenveen blijft na een zware week ongeslagen in de competitie"
            href="#ongeslagen"
            source="Testkrant"
            time="wo 14:05"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T08:30:00Z"
            headline="Trainer tevreden over de voorbereiding op de uitwedstrijd bij Testclub van zondag"
            href="#voorbereiding"
            source="Voorbeeldkrant"
            time="wo 10:30"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-20T17:45:00Z"
            headline="Kampioenschapsfeestcommissievergaderingsverslag ligt klaar voor de leden"
            href="#lang-woord"
            source="Testkrant"
            time="di 19:45"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-20T08:15:00Z"
            headline="Hearrenfean wûn yn de lêste minút fan in spannende wedstriid tsjin Test Boys"
            href="#frysk"
            lang="fy"
            source="Testkrante"
            time="di 10:15"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const BalancedLight = meta.story({
  globals: { theme: 'light' },
  name: 'Koppen in balans over twee of drie regels, met een lang woord en een Friese kop, licht',
  parameters: {
    docs: {
      description: {
        story:
          'De woorden van een kop zijn over de regels verdeeld, zodat geen regel met één woord alleen overblijft. Een heel lang woord breekt in plaats van dat de pagina opzij scrolt. Een browser die dit niet kent, breekt de kop zoals gewone tekst.',
      },
    },
  },
  render: renderBalanced,
})

export const BalancedDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Koppen in balans over twee of drie regels, met een lang woord en een Friese kop, donker',
  render: renderBalanced,
})

const renderInternal = () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="resultaten-kop">
      <Heading id="resultaten-kop" level={2}>
        2 resultaten voor selectie
      </Heading>
      <List role="list">
        <List.Item>
          <NewsItem
            dateTime="2026-10-25"
            headline="De selectie van dit seizoen, bekeken"
            href="#artikel"
            internal
            source="Van de redactie"
            time="25 okt"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2026-10-21T12:05:00Z"
            headline="Nieuwe selectie bekend bij Testclub"
            href="#selectie"
            source="Testkrant"
            time="wo 14:05"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const InternalLight = meta.story({
  globals: { theme: 'light' },
  name: 'Een artikel van de redactie tussen de berichten, licht',
  render: renderInternal,
})

export const InternalDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Een artikel van de redactie tussen de berichten, donker',
  render: renderInternal,
})
