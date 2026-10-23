import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { NewsItem } from '../news-item/NewsItem'
import { Page } from '../page/Page'
import { Text } from '../text/Text'
import { Card, cardElements, type CardSurface, cardSurfaces } from './Card'

// The type of the props as the table of controls shows it: the compiler gives `unknown[number]` for the lists.
const union = (values: readonly string[]) => ({ type: { summary: values.map((value) => `'${value}'`).join(' | ') } })

const meta = preview.meta({
  argTypes: {
    as: {
      control: 'select',
      description: 'Het element van de kaart.',
      options: cardElements,
      table: union(cardElements),
    },
    surface: {
      control: 'radio',
      description: 'Het vlak van de kaart.',
      options: cardSurfaces,
      table: union(cardSurfaces),
    },
  },
  component: Card,
  parameters: {
    docs: {
      description: {
        component: [
          'Een kaart zet een blok van de pagina op een eigen vlak, met een rand en ronde hoeken.',
          'Zo staat elk blok los op de pagina, en dat geeft de pagina rust en richting.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Card',
})

const newsItems = (
  <List loose>
    <List.Item>
      <NewsItem
        dateTime="2026-10-21T12:05:00Z"
        headline="Heerenveen wint in blessuretijd van Testclub"
        href="#heerenveen-wint"
        source="Testkrant"
        time="14:05"
      />
    </List.Item>
    <List.Item>
      <NewsItem
        dateTime="2026-10-21T08:30:00Z"
        headline="Trainer over de blessures: ‘Er komt niemand terug voor zondag’"
        href="#blessures"
        paywalled
        source="Testkrant"
        time="10:30"
      />
    </List.Item>
  </List>
)

export const Default = meta.story({
  args: { as: 'section', surface: 'default' },
  name: 'Kaart',
  render: ({ as = 'section', ...args }) => (
    // A name from the heading is only allowed on elements that have a role to name: not on a div.
    <Card {...args} aria-labelledby={as === 'div' ? undefined : 'card-heading'} as={as}>
      <Heading appearance={3} id="card-heading" level={2}>
        Nieuws
      </Heading>
      {newsItems}
    </Card>
  ),
})

const surfaces: { label: string; surface: CardSurface }[] = [
  { label: 'Vlak', surface: 'default' },
  { label: 'Sterk vlak', surface: 'strong' },
  { label: 'Zacht vlak', surface: 'soft' },
  { label: 'Warm vlak', surface: 'warm' },
]

const renderSurfaces = () => (
  <Page.Body>
    <Page.Main>
      {surfaces.map(({ label, surface }) => (
        <Card aria-labelledby={`surface-${surface}`} key={surface} surface={surface}>
          <Heading appearance={3} id={`surface-${surface}`} level={2}>
            {label}
          </Heading>
          {newsItems}
        </Card>
      ))}
    </Page.Main>
  </Page.Body>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Vier vlakken, licht', render: renderSurfaces })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Vier vlakken, donker', render: renderSurfaces })

const renderPage = () => (
  <Page.Body>
    <Page.Main>
      <Heading level={1}>Nieuws over sc Heerenveen</Heading>
      <Card aria-labelledby="page-media">
        <Heading id="page-media" level={2}>
          Laatste nieuws
        </Heading>
        <Heading level={3}>donderdag 22 oktober</Heading>
        {newsItems}
      </Card>
      <Text>
        Welke media we volgen, lees je bij <Link href="#bronnen">Onze bronnen</Link>.
      </Text>
    </Page.Main>
    <Page.Sidebar aria-label="Naast het nieuws">
      <Card aria-labelledby="page-match" surface="soft">
        <Heading appearance={3} id="page-match" level={2}>
          Volgende wedstrijd
        </Heading>
        <Text appearance="meta">Hier komt een blok met de volgende wedstrijd.</Text>
      </Card>
      <Card aria-labelledby="page-forum">
        <Heading appearance={3} id="page-forum" level={2}>
          Nieuwste discussies
        </Heading>
        <List>
          <List.Item>Hier komt een lijst uit het forum.</List.Item>
          <List.Item>Met een paar onderwerpen onder elkaar.</List.Item>
        </List>
      </Card>
    </Page.Sidebar>
  </Page.Body>
)

export const OnPageLight = meta.story({ globals: { theme: 'light' }, name: 'Op een pagina, licht', render: renderPage })

export const OnPageDark = meta.story({ globals: { theme: 'dark' }, name: 'Op een pagina, donker', render: renderPage })
