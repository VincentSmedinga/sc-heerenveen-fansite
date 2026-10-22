import preview from '#.storybook/preview'

import { List } from './List'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst met items. Elk item is een `List.Item`: het `li`-element, dat alleen in een lijst werkt.',
          '',
          'Met `as` kies je het element uit een vaste lijst:',
          '',
          '- `ul` (standaard): een opsomming met vierkante tekens.',
          '- `ol`: een genummerde lijst.',
          '  Alleen hier kun je `start` en `reversed` gebruiken.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/List',
})

const render = () => (
  <>
    <List>
      <List.Item>Nieuws over sc Heerenveen uit de media</List.Item>
      <List.Item>De nieuwste discussies op het forum</List.Item>
    </List>
    <List as="ol">
      <List.Item>Stuur ons de link naar het bericht dat weg moet.</List.Item>
      <List.Item>Vertel erbij wie je bent en waarom het weg moet.</List.Item>
    </List>
  </>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
