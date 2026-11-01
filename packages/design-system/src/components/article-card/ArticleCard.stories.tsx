import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { NewsItem } from '../news-item/NewsItem'
import { Page } from '../page/Page'
import { ArticleCard } from './ArticleCard'

const meta = preview.meta({
  component: ArticleCard,
  parameters: {
    docs: {
      description: {
        component: [
          'De kaart op de homepage met het nieuwste artikel van onze eigen redactie.',
          'Hij staat bovenaan de hoofdkolom, boven het nieuws van de media, op het zachte vlak, zodat hij zich van het nieuws onderscheidt.',
          'Is er geen artikel, dan laat de pagina de kaart weg.',
          '',
          'Onder de kop "Van de redactie" staan de titel als link naar het artikel, de datum, de inleiding en de link "Lees verder".',
          'De titel en "Lees verder" gaan naar dezelfde pagina.',
          'De naam van "Lees verder" noemt het artikel, zodat de link ook buiten de kaart duidelijk is.',
          '',
          '- `title` is de titel van het artikel, `intro` de inleiding.',
          '- `href` is het adres van het artikel op de site.',
          '- `short` is de korte vorm voor een smalle kolom naast het nieuws: zonder "Lees verder", zodat de titel de ene link is.',
          '- `date` is de datum zoals een lezer hem leest, en `dateTime` dezelfde dag voor het `time`-element.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/ArticleCard',
})

const news = (
  <Card aria-labelledby="nieuws-kop">
    <Heading id="nieuws-kop" level={2}>
      Laatste nieuws
    </Heading>
    <List role="list">
      <List.Item>
        <NewsItem
          dateTime="2026-10-25T12:05:00Z"
          headline="Heerenveen wint in blessuretijd van Testclub"
          href="#heerenveen-wint"
          source="Testkrant"
          time="zo 14:05"
        />
      </List.Item>
    </List>
  </Card>
)

// The card at the top of the main column, above the news, as on the homepage. The text is made
// up.
const renderOnPage = () => (
  <Page.Body>
    <Page.Main>
      <ArticleCard
        date="25 oktober 2026"
        dateTime="2026-10-25"
        href="#dit-zijn-wij"
        intro="Wij zijn de redactie van de Fansite. Hier lees je wie we zijn en wat je van ons mag verwachten."
        title="Dit zijn wij"
      />
      {news}
    </Page.Main>
  </Page.Body>
)

const renderLong = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <ArticleCard
      date="25 oktober 2026"
      dateTime="2026-10-25"
      href="#lang"
      intro="Een introductie van drie hele regels, met een heel lang woord erin: Heelerglangewoordenzonderspatieswaarnaaralleswordtgezegd. En nog een zin, zodat de tekst doorloopt."
      title="Een titel die zo lang is dat hij op een smalle kolom over meer dan één regel loopt"
    />
  </div>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Boven het nieuws, licht', render: renderOnPage })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Boven het nieuws, donker', render: renderOnPage })

// The short form, as in the sidebar of the news page. The text is made up.
const renderShort = () => (
  <div style={{ maxInlineSize: '16rem' }}>
    <ArticleCard
      date="25 oktober 2026"
      dateTime="2026-10-25"
      href="#dit-zijn-wij"
      intro="Wij zijn de redactie van de Fansite. Hier lees je wie we zijn en wat je van ons mag verwachten."
      short
      title="Dit zijn wij"
    />
  </div>
)

export const Short = meta.story({
  name: 'Korte vorm in een smalle kolom',
  parameters: {
    docs: {
      description: {
        story:
          'De korte vorm heeft de titel als link, de datum en de inleiding, zonder "Lees verder". Hij is voor de zijkolom van het nieuws.',
      },
    },
  },
  render: renderShort,
})

export const LongLight = meta.story({
  globals: { theme: 'light' },
  name: 'Lange titel en inleiding in een smalle kolom, licht',
  render: renderLong,
})

export const LongDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Lange titel en inleiding in een smalle kolom, donker',
  render: renderLong,
})

// The titles are made up. Each one breaks over two or three lines in a narrow column, so the
// words are spread over the lines. The second has a long word and the third is Frisian.
// The site shows one card, named by its heading "Van de redactie". Three cards on one page
// would be three landmarks with the same name, so each gets a name of its own here.
const renderBalanced = () => (
  <div style={{ display: 'grid', gap: '1rem', maxInlineSize: '20rem' }}>
    <ArticleCard
      aria-label="Van de redactie, bericht 1"
      aria-labelledby={undefined}
      date="25 oktober 2026"
      dateTime="2026-10-25"
      href="#wie-zijn-wij"
      intro="Een korte inleiding."
      title="Wie wij zijn en wat je van ons mag verwachten"
    />
    <ArticleCard
      aria-label="Van de redactie, bericht 2"
      aria-labelledby={undefined}
      date="24 oktober 2026"
      dateTime="2026-10-24"
      href="#lang-woord"
      intro="Een korte inleiding."
      title="Kampioenschapsfeestcommissievergaderingsverslag voor de leden"
    />
    <ArticleCard
      aria-label="Van de redactie, bericht 3"
      aria-labelledby={undefined}
      date="23 oktober 2026"
      dateTime="2026-10-23"
      href="#frysk"
      intro="Een korte inleiding."
      lang="fy"
      title="Wy sykje mear fanwegen yn de redaksje fan de Fansite"
    />
  </div>
)

export const BalancedLight = meta.story({
  globals: { theme: 'light' },
  name: 'Titels in balans over twee of drie regels, met een lang woord en een Friese titel, licht',
  parameters: {
    docs: {
      description: {
        story:
          'De woorden van een titel zijn over de regels verdeeld, zodat geen regel met één woord alleen overblijft. Een heel lang woord breekt in plaats van dat de pagina opzij scrolt.',
      },
    },
  },
  render: renderBalanced,
})

export const BalancedDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Titels in balans over twee of drie regels, met een lang woord en een Friese titel, donker',
  render: renderBalanced,
})
