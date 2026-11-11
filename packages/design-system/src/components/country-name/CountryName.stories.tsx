import preview from '#.storybook/preview'

import { CountryName } from './CountryName'

const meta = preview.meta({
  args: { country: 'NL' },
  component: CountryName,
  parameters: {
    docs: {
      description: {
        component: [
          'Een land in een regel tekst: de vlag en de Nederlandse naam, zoals onder de naam op de pagina van een speler.',
          'De vlag is versiering, want de naam staat ernaast; een schermlezer leest het land één keer.',
          'Een land zonder tekening krijgt het kader met de code, zoals bij `PlayerName`.',
          'Kies `PlayerName` met `country` voor een speler in een lijst; kies dit voor een land in een zin.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/CountryName',
})

export const Default = meta.story({ name: 'Met een vlag' })

export const CodeOnly = meta.story({ args: { country: 'VE' }, name: 'Met de code in een kader' })
