import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { WikipediaCredit, type WikipediaCreditPage } from './WikipediaCredit'

const meta = preview.meta({
  argTypes: {
    archive: { description: 'Noemt ook de sc Heerenveen Fansite, voor wedstrijden van Wikipedia en van de Fansite.' },
    compact: { description: 'De korte vorm: alleen "Bron: Wikipedia", zonder uitklap.' },
    data: { description: 'Het woord voor onze eigen gegevens in de laatste zin, in het meervoud.' },
    edited: { description: 'Zet de zin dat de redactie gegevens zelf invulde in de uitklap.' },
    open: { description: 'Laat de uitklap open staan, voor een voorbeeld.' },
    pages: { description: "De pagina's van Wikipedia waar de gegevens vandaan komen, minstens één." },
    readAt: { description: 'De tijd van de laatste keer lezen, zoals een bezoeker hem leest.' },
    readAtDateTime: { description: 'Dezelfde tijd voor machines.' },
    wikidata: { description: 'Zegt dat enkele spelers van Wikidata komen (CC0).' },
  },
  component: WikipediaCredit,
  parameters: {
    docs: {
      description: {
        component: [
          'De bronvermelding voor gegevens van Wikipedia, in de vorm van principe 4 van de Redactie: altijd de bron vermelden.',
          'De volledige vorm staat dicht en zegt "Bron: Wikipedia"; één klik laat de licentie, een link naar elke pagina waar de gegevens vandaan komen en de tijd van de laatste keer lezen zien.',
          'Een kleine kaart op een pagina die de volledige vorm elders heeft, gebruikt de korte vorm (`compact`). Een pagina waarvan alle gegevens van onszelf zijn, heeft geen bronvermelding.',
          'Het is een component, zodat een pagina met gegevens van Wikipedia er niet omheen kan. Hij is gebouwd uit `Link`, `Time` en `Icon` in een uitklap, en staat onder het blok of de pagina met de gegevens.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
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

const inColumn = (credit: React.ReactNode) => <div style={{ maxInlineSize: '20rem' }}>{credit}</div>

export const Default = meta.story({
  args: { ...readAt, open: false, pages: [standings, cup] },
  name: 'Bronvermelding',
  render: (args) => inColumn(<WikipediaCredit {...args} />),
})

export const ManyPages = meta.story({
  args: { ...readAt, open: true, pages: manyPages },
  name: "Veel pagina's: de lijst van de tegenstanders",
  render: (args) => inColumn(<WikipediaCredit {...args} />),
})

export const Edited = meta.story({
  args: { ...readAt, edited: true, open: true, pages: [standings] },
  name: 'Met een zin dat de redactie gegevens zelf invulde',
  render: (args) => inColumn(<WikipediaCredit {...args} />),
})

export const Compact = meta.story({
  args: { compact: true },
  name: 'Korte vorm',
  render: (args) => inColumn(<WikipediaCredit {...args} />),
})

const squad = {
  href: 'https://nl.wikipedia.org/wiki/Sc_Heerenveen_in_het_seizoen_2026/27_(mannen)',
  name: 'Selectie 2026/27',
}

export const WithWikidata = meta.story({
  args: { ...readAt, data: 'selectiegegevens', open: true, pages: [squad], wikidata: true },
  name: 'De selectie, met Wikidata en een eigen woord voor onze gegevens',
  render: (args) => inColumn(<WikipediaCredit {...args} />),
})

export const WithArchive = meta.story({
  args: { ...readAt, archive: true, open: true, pages: [standings] },
  name: 'Met de sc Heerenveen Fansite',
  render: (args) => inColumn(<WikipediaCredit {...args} />),
})
