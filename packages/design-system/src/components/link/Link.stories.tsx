import preview from '#.storybook/preview'

import { Text } from '../text/Text'
import { Link } from './Link'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een link.',
          'Een link is altijd onderstreept; onder de muis wordt de lijn dikker.',
          'Een bezochte link ziet er hetzelfde uit als een link die je nog niet hebt geopend; alleen de kop van een nieuwsbericht en de titel van een discussie worden grijs.',
          '',
          '`href` is verplicht: een link zonder bestemming is geen link.',
          'De tekst zegt waar de link heen gaat, ook los van de zin eromheen; dus geen "lees meer" of "klik hier".',
          'Bij een nieuwsbericht is de kop de link.',
          '',
          'Met `icon` zet je een pictogram bij de tekst:',
          '',
          '- `arrow-right`: een pijl achter de tekst, voor een link naar meer of naar alles, zoals "Alle podcasts".',
          '- `external-link`: het pictogram voor een externe link achter de tekst, voor elke link die de site verlaat, ook in een zin of een lijst.',
          '  Een link naar een mailadres of naar een pagina van de site zelf krijgt het niet.',
          '- `arrow-left`: een pijl naar links vóór de tekst, voor de weg terug, zoals "Vorige". Hij staat vóór de tekst omdat hij achteruit wijst.',
          '',
          'Een pictogram bij een link staat achter de tekst, omdat het vooruit wijst, naar waar de link heen gaat.',
          'De link heet voor een schermlezer zijn tekst alleen: het pictogram is verborgen.',
          'Het pictogram heeft de kleur van de tekst, ook onder de muis, en blijft bij het laatste woord als de regel afbreekt.',
          'Laat de inhoud van de link eindigen met tekst, anders kan het pictogram alleen op een regel komen.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Link',
})

const render = () => (
  <Text style={{ maxInlineSize: '40rem' }}>
    Lees het hele verslag bij <Link href="#verslag-omrop-fryslan">Omrop Fryslân</Link> of bekijk de samenvatting bij{' '}
    <Link href="#samenvatting-eredivisie">de eredivisie</Link>.
  </Text>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

const arrow = () => (
  <Text style={{ maxInlineSize: '40rem' }}>
    <Link href="#alle-podcasts" icon="arrow-right">
      Alle podcasts
    </Link>
  </Text>
)

export const ArrowLight = meta.story({ globals: { theme: 'light' }, name: 'Met een pijl, licht', render: arrow })

export const ArrowDark = meta.story({ globals: { theme: 'dark' }, name: 'Met een pijl, donker', render: arrow })

const external = () => (
  <Text style={{ maxInlineSize: '40rem' }}>
    Bij de site hoort ook{' '}
    <Link href="https://forum.heerenveen.org" icon="external-link">
      ons forum
    </Link>
    , waar supporters met elkaar praten. Of ga naar{' '}
    <Link href="https://www.omropfryslan.nl" icon="external-link">
      Omrop Fryslân
    </Link>
    .
  </Text>
)

export const ExternalLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met het pictogram voor een externe link, licht',
  render: external,
})

export const ExternalDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met het pictogram voor een externe link, donker',
  render: external,
})

// Only on the canvas: a link that breaks over two lines at 320 pixels, where the icon must stay with the last word.
const breaking = () => (
  <Text style={{ fontSize: '1.5rem' }}>
    <Link href="https://www.autoriteitpersoonsgegevens.nl" icon="external-link">
      Autoriteit Persoonsgegevens
    </Link>
  </Text>
)

export const BreakingLight = meta.story({
  globals: { theme: 'light', viewport: { value: 'mobile1' } },
  name: 'Breekt af bij 320 pixels, licht',
  render: breaking,
  tags: ['!autodocs'],
})

export const BreakingDark = meta.story({
  globals: { theme: 'dark', viewport: { value: 'mobile1' } },
  name: 'Breekt af bij 320 pixels, donker',
  render: breaking,
  tags: ['!autodocs'],
})
