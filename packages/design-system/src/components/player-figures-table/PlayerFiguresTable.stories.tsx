import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { type PlayerFiguresRow, PlayerFiguresTable } from './PlayerFiguresTable'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De cijfers van alle spelers die in de verslagen van de wedstrijden staan, als echte `table`: wedstrijden, basisplaatsen, invallen, minuten, doelpunten, assists en kaarten.',
          'Kies hem voor een lijst van alle spelers van een seizoen; een speler van de bank die niet inviel, staat er ook, met nullen.',
          'De pagina geeft het bijschrift en de rijen mee, in de volgorde waarin ze staan: het component sorteert niet.',
          'Hij is gebouwd uit `DataTable`-kolommen uit `tableColumns` en `PlayerName`, in een `Card` onder een kop van niveau 2.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
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

const render = () => (
  <div style={{ maxInlineSize: '40rem' }}>
    <Card aria-labelledby="alle-spelers-kop">
      <Heading id="alle-spelers-kop" level={2}>
        Alle spelers
      </Heading>
      <PlayerFiguresTable caption={caption} rows={rows} />
    </Card>
  </div>
)

export const Default = meta.story({
  name: 'Alle spelers',
  render,
})
