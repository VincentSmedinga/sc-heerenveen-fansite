import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { Match } from '../match/Match'
import { Text } from '../text/Text'
import { OutcomeBar } from './OutcomeBar'

const meta = preview.meta({
  argTypes: {
    draws: { description: 'Het aantal gelijkspelen.' },
    losses: { description: 'Het aantal verloren wedstrijden.' },
    wins: { description: 'Het aantal gewonnen wedstrijden.' },
  },
  component: OutcomeBar,
  parameters: {
    docs: {
      description: {
        component: [
          'Een balk in drie delen: winst, gelijkspel en verlies, in de kleuren van een uitslag.',
          'De balk is versiering en een kleur is nooit het enige teken: zet de drie getallen als zin naast of onder de balk.',
          'Hij is gebouwd uit drie eigen elementen in de kleuren van een uitslag.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/OutcomeBar',
})

export const Default = meta.story({
  args: { draws: 61, losses: 82, wins: 114 },
  name: 'Winst, gelijk en verlies',
  render: (args) => (
    <div style={{ maxInlineSize: '24rem' }}>
      <Card aria-labelledby="uitslag-een">
        <Heading id="uitslag-een" level={2}>
          Uitslagen met hem in het veld
        </Heading>
        <OutcomeBar {...args} />
        <Text>
          {args.wins} gewonnen, {args.draws} gelijk en {args.losses} verloren.
        </Text>
      </Card>
    </div>
  ),
})

export const HeadToHead = meta.story({
  args: { draws: 10, losses: 10, wins: 9 },
  name: 'Onderling, met een eigen doelpunt',
  render: (args) => (
    <div style={{ maxInlineSize: '24rem' }}>
      <Card aria-labelledby="onderling-een">
        <Heading id="onderling-een" level={2}>
          Onderling in Proefstad
        </Heading>
        <Heading appearance={3} level={3}>
          29 keer in Proefstad sinds 1990/91
        </Heading>
        <OutcomeBar {...args} />
        <Text>
          {args.wins} gewonnen · {args.draws} gelijk · {args.losses} verloren · doelpunten 38–37
        </Text>
        <Heading appearance={4} level={3}>
          De laatste twee daar
        </Heading>
        <List role="list">
          <List.Item>
            <Match
              competition="Eredivisie"
              dateTime="2026-02-01"
              goals={[
                { minute: 15, ours: false, player: 'Kopie' },
                { minute: 29, ours: true, ownGoal: true, player: 'Teststraat' },
                { minute: 90, ours: true, player: 'Nepper', stoppageMinutes: 4 },
              ]}
              goalsAgainst={1}
              goalsFor={2}
              home={false}
              opponent="Proefstad SV"
              round="Speelronde 20"
              status="played"
              time="zo 1 feb 2026"
            />
          </List.Item>
          <List.Item>
            <Match
              competition="Eredivisie"
              dateTime="2025-04-20"
              goals={[{ minute: 63, ours: false, player: 'Kopie' }]}
              goalsAgainst={1}
              goalsFor={0}
              home={false}
              opponent="Proefstad SV"
              round="Speelronde 31"
              status="played"
              time="zo 20 apr 2025"
            />
          </List.Item>
        </List>
      </Card>
    </div>
  ),
})
