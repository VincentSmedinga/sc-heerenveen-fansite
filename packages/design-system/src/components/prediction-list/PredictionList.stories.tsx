import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { PredictionList } from './PredictionList'

const meta = preview.meta({
  args: {
    items: [
      {
        away: 'FC Twente',
        date: 'za 21 nov',
        dateTime: '2026-11-21',
        home: 'sc Heerenveen',
        points: 17,
        prediction: 'Jij: 1–0 bij rust, 3–1 eind',
        score: '2–1',
      },
      {
        away: 'sc Heerenveen',
        date: 'za 14 nov',
        dateTime: '2026-11-14',
        home: 'Testclub',
        points: 0,
        prediction: 'Jij: 0–0 bij rust, 1–2 eind',
        score: '1–0',
      },
      {
        away: 'Testclub United',
        date: 'za 28 nov',
        dateTime: '2026-11-28',
        home: 'sc Heerenveen',
        prediction: 'Jij: 0–0 bij rust, 1–1 eind',
        status: 'Nog niet gespeeld',
      },
    ],
  },
  component: PredictionList,
  decorators: [
    (Story) => (
      <Card>
        <Story />
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'De lijst met wat een supporter voorspelde: een rij per wedstrijd met de dag, de clubs met de uitslag, de voorspelling en de punten in een eigen kolom.',
          'Kies hem voor een korte lijst op een kaart. Het is een lijst en geen tabel, want een rij leest als één zin. De uitslag breekt nooit af: een lange clubnaam wordt ingekort.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/PredictionList',
})

export const Default = meta.story({ name: 'Met punten en zonder' })

export const LongNames = meta.story({
  args: {
    items: [
      {
        away: 'Testclub Voetbalvereniging Combinatie Noord',
        date: 'za 21 nov',
        dateTime: '2026-11-21',
        home: 'Sportclub Testdorp Boven de Rivier',
        points: 30,
        prediction: 'Jij: 1–0 bij rust, 2–1 eind',
        score: '2–1',
      },
    ],
  },
  name: 'Lange clubnamen',
})
