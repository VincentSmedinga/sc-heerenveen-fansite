import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { type PlayerFiguresRow, PlayerFiguresTable } from './PlayerFiguresTable'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De cijfers van alle spelers die in de verslagen van de wedstrijden staan, als echte `table`: de wedstrijden, de basisplaatsen, de keren dat hij inviel, de minuten, de doelpunten, de assists en de gele en rode kaarten.',
          'De tabel heeft een bijschrift dat zegt voor welk seizoen en welke competities hij telt, maar alleen een schermlezer krijgt het: bezienden zien de kop van de kaart.',
          'Verder heeft de tabel kolomkoppen met `scope` en een rijkop met de naam van elke speler (zie `PlayerName`).',
          'De koppen zijn de letters uit `tableColumns`: G gespeeld, B basis, I invallers, M minuten, D doelpunten, A assists, Y geel en R rood.',
          'Een schermlezer hoort het hele woord, en onder de tabel staan de letters met hun woorden.',
          'Een geel-rode kaart telt als een gele en een rode, en dat staat er ook.',
          '',
          'De minuten zijn het kerngetal en dus vet, want de pagina sorteert de lijst op minuten en dan op naam.',
          'Een speler van de bank die niet inviel, staat er ook, met nullen, zodat hij niet verdwijnt.',
          'De kolommen staan dicht bij elkaar, zodat de tabel op een telefoon past; een lange naam breekt bij een spatie.',
          '',
          '- `caption` is de tekst van het bijschrift, dat niet te zien is.',
          '- `rows` zijn de spelers van boven naar beneden: het component sorteert niet.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/PlayerFiguresTable',
})

const rows: PlayerFiguresRow[] = [
  {
    assists: 2,
    givenName: 'Wouter',
    goals: 5,
    id: 1,
    minutes: 1710,
    played: 19,
    red: 0,
    started: 18,
    substituted: 1,
    surname: 'Proefman',
    yellow: 3,
  },
  {
    assists: 4,
    givenName: 'Gerrit',
    goals: 2,
    id: 2,
    minutes: 1530,
    played: 17,
    red: 0,
    started: 17,
    substituted: 0,
    surname: 'Nepper',
    yellow: 1,
  },
  {
    assists: 1,
    givenName: 'Joris',
    goals: 1,
    id: 3,
    minutes: 905,
    played: 12,
    red: 1,
    started: 8,
    substituted: 4,
    surname: 'Testvoort',
    yellow: 2,
  },
  {
    assists: 0,
    givenName: 'Jan Willem',
    goals: 0,
    id: 4,
    minutes: 310,
    played: 6,
    red: 0,
    started: 1,
    substituted: 5,
    surname: 'Van der Voorbeeldstraat-Proefmans',
    yellow: 0,
  },
  {
    assists: 0,
    goals: 0,
    id: 5,
    minutes: 0,
    played: 0,
    red: 0,
    started: 0,
    substituted: 0,
    surname: 'Kopie',
    yellow: 0,
  },
]

const caption =
  'Alle spelers in de verslagen van sc Heerenveen in het seizoen 2026/27, in de Eredivisie en de KNVB Beker'

const render = (maxInlineSize: string) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="alle-spelers-kop">
      <Heading id="alle-spelers-kop" level={2}>
        Alle spelers
      </Heading>
      <PlayerFiguresTable caption={caption} rows={rows} />
    </Card>
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Alle spelers, licht',
  render: render('40rem'),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Alle spelers, donker',
  render: render('40rem'),
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Op een telefoon, licht',
  render: render('22rem'),
})
