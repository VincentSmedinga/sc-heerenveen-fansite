import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { Text } from '../text/Text'
import { DiscussionItem } from './DiscussionItem'

const meta = preview.meta({
  argTypes: {
    dateTime: { description: 'De volledige tijd voor het `time`-element, zoals `2026-10-23T11:28:21Z`.' },
    href: { description: 'Het adres van de discussie op het forum.' },
    lastPostedBy: { description: 'De schermnaam van de laatste reageerder. Laat hem weg als het forum die niet kent.' },
    replies: { description: 'Het aantal reacties, zonder het openingsbericht.' },
    time: { description: 'De tijd zoals een bezoeker hem leest, zoals "13:28" of "wo 14:05".' },
    title: { description: 'De titel, zoals het forum hem heeft.' },
  },
  component: DiscussionItem,
  parameters: {
    docs: {
      description: {
        component: [
          'Een regel met een discussie van ons eigen forum: de titel als link, en eronder het aantal reacties, wie het laatst reageerde en wanneer, zoals "83 reacties · laatst Buffon1 · 13:28".',
          'De schermnaam is gewone tekst, en het component laat nooit de tekst van een bericht zien (zie Redactie, "Ons eigen forum").',
          'Zet hem in een `List.Item` voor een lijst met discussies, met `role="list"` op de `List`, in een `Card` onder een kop van niveau 2 met onderaan een link naar het forum.',
          'Hij is gebouwd uit `Link` en `Text`, en de tijd uit `Time`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/DiscussionItem',
})

// The block as the homepage has it, in the width of the sidebar. The discussions are made up,
// as are the screen names.
const renderList = () => (
  <div style={{ maxInlineSize: '20rem' }}>
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
            time="wo 14 okt"
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

export const Default = meta.story({
  args: {
    dateTime: '2026-10-23T11:28:21Z',
    href: '#wie-wint-zondag',
    lastPostedBy: 'Buffon1',
    replies: 83,
    time: '13:28',
    title: 'Wie wint er zondag?',
  },
  name: 'Discussie',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DiscussionItem {...args} />
    </div>
  ),
})

export const InAList = meta.story({
  name: 'In een lijst, met 83, 1 en 0 reacties en een regel zonder schermnaam',
  render: renderList,
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

export const LongTitle = meta.story({
  name: 'Lange titel en lange schermnaam',
  render: renderLong,
})
