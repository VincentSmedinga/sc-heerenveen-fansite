import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { NewsItem } from '../news-item/NewsItem'
import { Page } from '../page/Page'
import { ArticleCard, type ArticleCardProps } from './ArticleCard'

const meta = preview.meta({
  argTypes: {
    date: { description: 'De datum zoals een lezer hem leest.' },
    dateTime: { description: 'Dezelfde dag voor het `time`-element.' },
    href: { description: 'Het adres van het artikel op de site.' },
    intro: { description: 'De inleiding van het artikel.' },
    title: { description: 'De titel van het artikel, als link.' },
  },
  component: ArticleCard,
  parameters: {
    docs: {
      description: {
        component: [
          'De kaart op de homepage met het nieuwste artikel van onze eigen redactie.',
          'Hij staat bovenaan de hoofdkolom, boven het nieuws van de media, op het warme vlak, zodat hij zich van het nieuws onderscheidt; is er geen artikel, dan laat de pagina de kaart weg.',
          'De titel en "Lees verder" gaan naar dezelfde pagina, en de naam van "Lees verder" noemt het artikel.',
          'Hij is gebouwd uit `Card`, `Heading`, `Text`, `Link` en `Time`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
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
const renderOnPage = (args: ArticleCardProps) => (
  <Page.Body>
    <Page.Main>
      <ArticleCard {...args} />
      {news}
    </Page.Main>
  </Page.Body>
)

export const Default = meta.story({
  args: {
    date: '25 oktober 2026',
    dateTime: '2026-10-25',
    href: '#dit-zijn-wij',
    intro: 'Wij zijn de redactie van de Fansite. Hier lees je wie we zijn en wat je van ons mag verwachten.',
    title: 'Dit zijn wij',
  },
  name: 'Boven het nieuws',
  render: renderOnPage,
})

export const Long = meta.story({
  args: {
    date: '25 oktober 2026',
    dateTime: '2026-10-25',
    href: '#lang',
    intro:
      'Een introductie van drie hele regels, met een heel lang woord erin: Heelerglangewoordenzonderspatieswaarnaaralleswordtgezegd. En nog een zin, zodat de tekst doorloopt.',
    title: 'Een titel die zo lang is dat hij op een smalle kolom over meer dan één regel loopt',
  },
  name: 'Lange titel en inleiding',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <ArticleCard {...args} />
    </div>
  ),
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

export const Balanced = meta.story({
  name: 'Titels in balans over twee of drie regels, met een lang woord en een Friese titel',
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
