import preview from '#.storybook/preview'

import { List } from './List'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst met `li`-elementen.',
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
      <li>Nieuws over sc Heerenveen uit de media</li>
      <li>De nieuwste discussies op het forum</li>
    </List>
    <List as="ol">
      <li>Stuur ons de link naar het bericht dat weg moet.</li>
      <li>Vertel erbij wie je bent en waarom het weg moet.</li>
    </List>
  </>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
