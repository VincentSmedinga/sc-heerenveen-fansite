import preview from '#.storybook/preview'

import { WikipediaCredit } from './WikipediaCredit'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De bronvermelding voor gegevens van Wikipedia, in de vorm van principe 4 van de Redactie: altijd de bron vermelden.',
          'Ze zegt "Bron: Wikipedia (CC BY-SA 4.0)", linkt naar elke pagina waar de gegevens vandaan komen, noemt de tijd van de laatste keer lezen en zegt dat onze wedstrijdgegevens ook CC BY-SA 4.0 zijn.',
          'Wikipedia noemt een link naar het artikel een goede bronvermelding: de auteurs staan in de geschiedenis van het artikel, die vanaf de pagina te bereiken is.',
          'Daarom linkt de bronvermelding niet zelf naar die geschiedenis.',
          'Op `/wedstrijden` staat hij in een kaart zonder zichtbare rand en achtergrond (`surface="transparent"`), zodat zijn tekst op één lijn staat met de tekst in de kaarten erboven.',
          '',
          'Een kleine kaart op een pagina die de volledige vorm elders heeft, gebruikt de korte vorm: `compact` zegt alleen "Bron: Wikipedia".',
          '',
          'Het is een component, zodat een pagina met gegevens van Wikipedia er niet omheen kan.',
          'Zet het onder het blok of de pagina met de gegevens.',
          '',
          "- `pages` zijn de pagina's van Wikipedia waar de gegevens vandaan komen, minstens één.",
          '  Elke pagina heeft een `name` voor de link en een `href`.',
          '- `data` is het woord voor onze eigen gegevens uit die pagina\'s in de laatste zin, "Onze wedstrijdgegevens zijn ook CC BY-SA 4.0".',
          '  Een pagina met andere gegevens, zoals de selectie, geeft het eigen woord in het meervoud: `selectiegegevens`.',
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
  href: 'https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)',
  name: 'Eredivisie 2026/27',
}

const cup = {
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

const squad = {
  href: 'https://nl.wikipedia.org/wiki/Sc_Heerenveen_in_het_seizoen_2026/27_(mannen)',
  name: 'Selectie 2026/27',
}

const renderSquad = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <WikipediaCredit {...readAt} data="selectiegegevens" pages={[squad]} />
  </div>
)

export const SquadLight = meta.story({
  globals: { theme: 'light' },
  name: 'De selectie, met een eigen woord voor onze gegevens, licht',
  render: renderSquad,
})

export const SquadDark = meta.story({
  globals: { theme: 'dark' },
  name: 'De selectie, met een eigen woord voor onze gegevens, donker',
  render: renderSquad,
})
