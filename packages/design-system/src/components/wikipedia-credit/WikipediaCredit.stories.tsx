import preview from '#.storybook/preview'

import { WikipediaCredit, type WikipediaCreditPage } from './WikipediaCredit'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De bronvermelding voor gegevens van Wikipedia, in de vorm van principe 4 van de Redactie: altijd de bron vermelden.',
          'De volledige vorm staat dicht en zegt "Bron: Wikipedia".',
          'Eén klik of toetsdruk laat de licentie (CC BY-SA 4.0), een link naar elke pagina waar de gegevens vandaan komen, de tijd van de laatste keer lezen en de zin zien dat onze wedstrijdgegevens ook CC BY-SA 4.0 zijn.',
          'Hij is dicht voor elke pagina, ook als er maar één is, zodat een bezoeker één vorm leert kennen en een lange lijst, zoals die van de tegenstanders, de pagina niet vult.',
          'Wikipedia noemt een link naar het artikel een goede bronvermelding: de auteurs staan in de geschiedenis van het artikel, die vanaf de pagina te bereiken is.',
          'Daarom linkt de bronvermelding niet zelf naar die geschiedenis.',
          '',
          'Een kleine kaart op een pagina die de volledige vorm elders heeft, gebruikt de korte vorm: `compact` zegt alleen "Bron: Wikipedia", zonder uitklap.',
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
          '- `open` laat de uitklap open staan, voor een voorbeeld; op een pagina blijft hij dicht.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/WikipediaCredit',
})

const standings = {
  href: 'https://nl.wikipedia.org/wiki/Eredivisie_2026/27_(mannenvoetbal)',
  name: 'Eredivisie 2026/27',
}

const cup = {
  href: 'https://nl.wikipedia.org/wiki/KNVB_Beker_2026/27_(mannen)',
  name: 'KNVB Beker 2026/27',
}

const seasonPage = (start: number): WikipediaCreditPage => {
  const season = `${start}/${String(start + 1).slice(-2)}`

  return { href: `https://nl.wikipedia.org/wiki/Eredivisie_${season}_(mannenvoetbal)`, name: `Eredivisie ${season}` }
}

// The opponents list has a page for every season since 2002/03.
const manyPages: [WikipediaCreditPage, ...WikipediaCreditPage[]] = [
  seasonPage(2002),
  ...Array.from({ length: 23 }, (_, index) => seasonPage(2003 + index)),
]

const readAt = { readAt: '25 oktober 2026 om 14:05', readAtDateTime: '2026-10-25T12:05:00Z' }

export const Closed = meta.story({
  name: 'Dicht, met één pagina',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <WikipediaCredit {...readAt} pages={[standings]} />
    </div>
  ),
})

export const Open = meta.story({
  name: 'Open, met één pagina',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <WikipediaCredit {...readAt} open pages={[standings]} />
    </div>
  ),
})

export const TwoPagesOpen = meta.story({
  name: "Open, met twee pagina's",
  render: () => (
    <div style={{ maxInlineSize: '36rem' }}>
      <WikipediaCredit {...readAt} open pages={[standings, cup]} />
    </div>
  ),
})

export const ManyPagesClosed = meta.story({
  name: "Dicht, met veel pagina's: de lijst van de tegenstanders",
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <WikipediaCredit {...readAt} pages={manyPages} />
    </div>
  ),
})

export const ManyPagesOpen = meta.story({
  name: "Open, met veel pagina's: de lijst van de tegenstanders",
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <WikipediaCredit {...readAt} open pages={manyPages} />
    </div>
  ),
})

export const Compact = meta.story({
  name: 'Korte vorm',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <WikipediaCredit compact />
    </div>
  ),
})

const squad = {
  href: 'https://nl.wikipedia.org/wiki/Sc_Heerenveen_in_het_seizoen_2026/27_(mannen)',
  name: 'Selectie 2026/27',
}

export const Squad = meta.story({
  name: 'De selectie, met een eigen woord voor onze gegevens, open',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <WikipediaCredit {...readAt} data="selectiegegevens" open pages={[squad]} />
    </div>
  ),
})
