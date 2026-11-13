import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { NewsItem } from './NewsItem'

const meta = preview.meta({
  argTypes: {
    dateTime: { description: 'De volledige tijd voor het `time`-element, zoals `2026-10-21T12:05:00Z`.' },
    details: { description: 'Korte feiten als tekst, zoals "49 min", achter de naam van de bron.' },
    headline: { description: 'De kop, zoals de bron hem publiceerde.' },
    href: { description: 'Het adres van het bericht bij de bron.' },
    internal: { description: 'Een pagina van onze eigen site, zoals een artikel van de redactie.' },
    paywalled: { description: 'Zet "voor abonnees" onder de kop.' },
    showSource: { description: 'Toon de naam van de bron. Uit, dan blijft hij alleen voor een schermlezer.' },
    source: { description: 'De naam van de bron, zoals de bron vermeld wil worden.' },
    time: {
      description: 'De korte dag en de tijd of de datum, zoals een bezoeker ze leest: "wo 14:05" of "wo 14 okt".',
    },
  },
  component: NewsItem,
  parameters: {
    docs: {
      description: {
        component: [
          'Een regel nieuws van een andere bron: de dag en de tijd, de kop als link naar het bericht bij de bron, en daaronder de naam van de bron, met "voor abonnees" als het bericht achter een betaalmuur staat.',
          'Is de regel zelf smal, zoals op een telefoon of in de zijbalk, dan staan de dag en de tijd boven de kop; het component kiest dat op zijn eigen breedte.',
          'Het component heeft geen intro of foto: die tonen we alleen met toestemming van de bron (principe 1 en 2 van de Redactie), en er staat nooit een logo van de bron bij (principe 3).',
          'Zet hem in een `List.Item` voor een lijst met nieuws, met `role="list"` op de `List`, in een `Card` onder een kop van niveau 2.',
          'Hij is gebouwd uit `Link`, `Text` en `Time`, met het pictogram voor een link naar buiten uit `Icon`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/NewsItem',
})

// The list as the news page has it. The headlines are made up.
const renderList = () => (
  <div style={{ maxInlineSize: '38rem' }}>
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
            time="wo 14 okt"
          />
        </List.Item>
        <List.Item>
          <NewsItem
            dateTime="2025-10-14T12:05:00Z"
            headline="Terugblik op een seizoen van een jaar geleden, met het jaar erbij"
            href="#ander-jaar"
            source="Voorbeeldkrant"
            time="di 14 okt 2025"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const Default = meta.story({
  args: {
    dateTime: '2026-10-21T12:05:00Z',
    headline: 'Heerenveen wint in blessuretijd van Testclub',
    href: '#heerenveen-wint',
    paywalled: false,
    showSource: true,
    source: 'Testkrant',
    time: 'wo 14:05',
  },
  name: 'Nieuwsregel',
  render: (args) => (
    <div style={{ maxInlineSize: '38rem' }}>
      <NewsItem {...args} />
    </div>
  ),
})

export const InAList = meta.story({
  name: 'In een lijst, zonder en met betaalmuur en met een datum',
  render: renderList,
})

export const WithoutTheSource = meta.story({
  name: 'Zonder de naam van de bron',
  render: () => (
    <div style={{ maxInlineSize: '38rem' }}>
      <Card aria-labelledby="een-bron-kop">
        <Heading id="een-bron-kop" level={2}>
          Nieuws van Testkrant
        </Heading>
        <List role="list">
          <List.Item>
            <NewsItem
              dateTime="2026-10-21T12:05:00Z"
              headline="Heerenveen wint in blessuretijd van Testclub"
              href="#heerenveen-wint"
              showSource={false}
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
              showSource={false}
              source="Testkrant"
              time="wo 10:30"
            />
          </List.Item>
        </List>
      </Card>
    </div>
  ),
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
            time="wo 14 okt"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const Episodes = meta.story({
  name: 'Afleveringen met feiten',
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
            time="vr 9 okt"
          />
        </List.Item>
      </List>
    </Card>
  </div>
)

export const LongHeadline = meta.story({
  name: 'Lange kop',
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

export const Balanced = meta.story({
  name: 'Koppen in balans over twee of drie regels, met een lang woord en een Friese kop',
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
            time="zo 25 okt"
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

export const Internal = meta.story({
  name: 'Een artikel van de redactie tussen de berichten',
  render: renderInternal,
})
