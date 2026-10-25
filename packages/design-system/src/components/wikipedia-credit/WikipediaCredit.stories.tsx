import preview from '#.storybook/preview'

import { WikipediaCredit } from './WikipediaCredit'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De bronvermelding voor gegevens van Wikipedia, in de vorm van principe 4 van de Redactie: altijd de bron vermelden.',
          'Ze zegt "Bron: Wikipedia (CC BY-SA 4.0)", linkt naar elke pagina waar de gegevens vandaan komen en naar de geschiedenis van die pagina, noemt de tijd van de laatste keer lezen en zegt dat onze wedstrijdgegevens ook CC BY-SA 4.0 zijn.',
          'De link naar de geschiedenis zegt voor een schermlezer van welke pagina hij is: "geschiedenis van Eredivisie 2026/27".',
          '',
          'Een kleine kaart op een pagina die de volledige vorm elders heeft, gebruikt de korte vorm: `compact` zegt alleen "Bron: Wikipedia".',
          '',
          'Het is een component, zodat een pagina met gegevens van Wikipedia er niet omheen kan.',
          'Zet het onder het blok of de pagina met de gegevens.',
          '',
          "- `pages` zijn de pagina's van Wikipedia waar de gegevens vandaan komen, minstens één.",
          '  Elke pagina heeft een `name` voor de link, een `href` en een `historyHref`.',
          '- `readAt` is de tijd van de laatste keer lezen zoals een bezoeker hem leest, in Nederlandse tijd.',
          '  `readAtDateTime` is dezelfde tijd voor machines.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/WikipediaCredit',
})

const standings = {
  historyHref: 'https://nl.wikipedia.org/w/index.php?title=Eredivisie_2026/27_(mannenvoetbal)&action=history',
  href: 'https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)',
  name: 'Eredivisie 2026/27',
}

const cup = {
  historyHref: 'https://nl.wikipedia.org/w/index.php?title=KNVB_Beker_2026/27_(mannen)&action=history',
  href: 'https://nl.wikipedia.org/wiki/KNVB_Beker_2026/27_(mannen)',
  name: 'KNVB Beker 2026/27',
}

const readAt = { readAt: '25 oktober 2026 om 14:05', readAtDateTime: '2026-10-25T12:05:00Z' }

const renderOne = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <WikipediaCredit {...readAt} pages={[standings]} />
  </div>
)

const renderTwo = () => (
  <div style={{ maxInlineSize: '36rem' }}>
    <WikipediaCredit {...readAt} pages={[standings, cup]} />
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Eén pagina, in een smalle kolom, licht',
  render: renderOne,
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Eén pagina, in een smalle kolom, donker',
  render: renderOne,
})

const renderCompact = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <WikipediaCredit compact />
  </div>
)

export const CompactLight = meta.story({
  globals: { theme: 'light' },
  name: 'Korte vorm, licht',
  render: renderCompact,
})

export const CompactDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Korte vorm, donker',
  render: renderCompact,
})

export const TwoPagesLight = meta.story({
  globals: { theme: 'light' },
  name: "Twee pagina's, licht",
  render: renderTwo,
})

export const TwoPagesDark = meta.story({
  globals: { theme: 'dark' },
  name: "Twee pagina's, donker",
  render: renderTwo,
})
