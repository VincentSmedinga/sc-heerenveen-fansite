import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { MatchNeighbours } from './MatchNeighbours'

const meta = preview.meta({
  argTypes: {
    next: { description: 'De wedstrijd erna. Laat hem weg bij de laatste wedstrijd.' },
    previous: { description: 'De wedstrijd ervoor. Laat hem weg bij de eerste wedstrijd.' },
  },
  component: MatchNeighbours,
  parameters: {
    docs: {
      description: {
        component: [
          'De links naar de vorige en de volgende wedstrijd onderaan de pagina van een wedstrijd, zodat een supporter het seizoen kan doorlezen.',
          'Een wedstrijd met een uitslag toont de stand vanuit onze kant in de kleur van de uitslag; een wedstrijd zonder uitslag toont de datum of een woord, en een wedstrijd zonder pagina is gewone tekst.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchNeighbours',
})

export const Default = meta.story({
  args: {
    next: { club: 'Voorbeeld United', goalsAgainst: 1, goalsFor: 1, home: false, href: '/volgende' },
    previous: { club: 'Testdorp FC', goalsAgainst: 0, goalsFor: 3, home: true, href: '/vorige' },
  },
  name: 'Vorige en volgende wedstrijd',
})

export const WithoutResult = meta.story({
  args: {
    next: { club: 'Voorbeeld United', home: false, state: 'zo 1 nov', stateDateTime: '2026-11-01' },
    previous: { club: 'Testdorp FC', goalsAgainst: 2, goalsFor: 1, home: true },
  },
  name: 'Zonder uitslag en zonder pagina',
})

export const FirstMatch = meta.story({
  args: {
    next: { club: 'Voorbeeld United', goalsAgainst: 3, goalsFor: 0, home: true, href: '/volgende' },
  },
  name: 'De eerste wedstrijd: alleen de volgende',
})

export const LongNames = meta.story({
  args: {
    next: {
      club: 'Een Voorbeeldvereniging Met Een Heel Erg Lange Naam Voor Amateurvoetbal Testdorp',
      goalsAgainst: 0,
      goalsFor: 1,
      home: false,
      href: '/volgende',
    },
    previous: {
      club: 'Een Voorbeeldvereniging Met Een Heel Erg Lange Naam Voor Amateurvoetbal Testdorp',
      goalsAgainst: 4,
      goalsFor: 4,
      home: true,
      href: '/vorige',
    },
  },
  name: 'Lange namen van clubs',
})
