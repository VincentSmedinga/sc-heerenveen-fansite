import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { PlayerName } from '../player-name/PlayerName'
import { ShortFact } from './ShortFact'

const meta = preview.meta({
  argTypes: {
    children: { description: 'Wat de regel zegt, zoals een speler.' },
  },
  component: ShortFact,
  parameters: {
    docs: {
      description: {
        component: [
          'Een korte regel in een lijst voor één ding zonder naam of periode ervoor, zoals een speler van de selectie.',
          'Zet elke regel in een `List.Item`, de lijst in een `Card` onder een kop, en geef de `List` `role="list"`. Boven elke regel staat een dunne lijn, ook boven de eerste, met de krappe maat van de meeste lijsten.',
          'Heeft elke waarde een naam erboven, kies dan een `DescriptionList` onder elkaar, zodat een schermlezer hoort wat bij elkaar hoort.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/ShortFact',
})

export const Default = meta.story({
  args: { children: <PlayerName givenName="Testspeler" surname="Een" /> },
  name: 'Spelers onder elkaar',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="feit-spelers">
        <Heading id="feit-spelers" level={2}>
          Testselectie
        </Heading>
        <List role="list">
          <List.Item>
            <ShortFact {...args} />
          </List.Item>
          <List.Item>
            <ShortFact>
              <PlayerName givenName="Testspeler" surname="Twee" />
            </ShortFact>
          </List.Item>
          <List.Item>
            <ShortFact>
              <PlayerName givenName="Testspeler" surname="Drie" />
            </ShortFact>
          </List.Item>
        </List>
      </Card>
    </div>
  ),
})
