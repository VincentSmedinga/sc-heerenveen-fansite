import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { NewsItem } from '../news-item/NewsItem'
import { Card, cardElements, cardSurfaces } from './Card'

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

export const Default = meta.story({
  args: { as: 'section', surface: 'default' },
  name: 'Kaart',
  render: ({ as = 'section', ...args }) => (
    // A name from the heading is only allowed on elements that have a role to name: not on a div.
    <Card {...args} aria-labelledby={as === 'div' ? undefined : 'card-heading'} as={as}>
      <Heading appearance={3} id="card-heading" level={2}>
        Nieuws
      </Heading>
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
    </Card>
  ),
})
