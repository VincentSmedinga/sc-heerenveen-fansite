import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { PlayerName } from '../player-name/PlayerName'
import { Text } from '../text/Text'
import { ShortFact } from './ShortFact'

const meta = preview.meta({
  argTypes: {
    children: { description: 'Wat de regel zegt: een getal, een zin of namen.' },
    empty: {
      description:
        'Of de regel zegt dat er niets te tonen is, zoals "Nog geen". Hij heeft dan het gewone gewicht en de rustige kleur.',
    },
  },
  component: ShortFact,
  parameters: {
    docs: {
      description: {
        component: [
          'Een feit als korte regel in een lijst, met de naam erboven, zoals de uitersten van een seizoen hun naam boven de wedstrijd hebben.',
          'Het is de korte regel van `ShortMatch` voor een waarde die geen wedstrijd is, met hetzelfde uiterlijk en dezelfde dunne lijnen tussen de regels.',
          'Zet de naam als `Text` met `appearance="meta"` en de regel samen in een `List.Item`, de lijst in een `Card` onder een kop van niveau 2, en geef de `List` `role="list"`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/ShortFact',
})

const inCard = (children: React.ReactNode, id: string) => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby={id} surface="soft">
      <Heading id={id} level={2}>
        Testcijfers
      </Heading>
      <List role="list">{children}</List>
    </Card>
  </div>
)

export const Default = meta.story({
  args: { children: '1 van de 17 doelpunten' },
  name: 'Een feit met een naam erboven',
  render: (args) =>
    inCard(
      <List.Item>
        <Text appearance="meta">Strafschoppen</Text>
        <ShortFact {...args} />
      </List.Item>,
      'feit-een',
    ),
})

export const SeveralFacts = meta.story({
  name: 'Vier feiten onder elkaar, met namen en een leeg feit',
  render: () =>
    inCard(
      <>
        <List.Item>
          <Text appearance="meta">Hattricks</Text>
          <ShortFact empty>Nog geen</ShortFact>
        </List.Item>
        <List.Item>
          <Text appearance="meta">Dubbelslagen</Text>
          <ShortFact>
            <PlayerName givenName="Testspeler" surname="Een" />, 2×,
            <PlayerName givenName="Testspeler" surname="Twee" />
          </ShortFact>
        </List.Item>
        <List.Item>
          <Text appearance="meta">Strafschoppen</Text>
          <ShortFact>1 van de 17 doelpunten</ShortFact>
        </List.Item>
        <List.Item>
          <Text appearance="meta">Eigen doelpunten</Text>
          <ShortFact>1 door de tegenstander · 0 door ons</ShortFact>
        </List.Item>
      </>,
      'feit-vier',
    ),
})
