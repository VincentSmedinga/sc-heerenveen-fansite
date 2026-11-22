import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { PredictionList } from './PredictionList'

const meta = preview.meta({
  args: {
    items: [
      {
        away: 'FC Twente',
        competition: 'Eredivisie',
        date: 'za 21 nov',
        dateTime: '2026-11-21',
        home: 'sc Heerenveen',
        points: 17,
        prediction: {
          fullTime: { right: true, score: '3–1' },
          halfTime: { right: false, score: '1–0' },
        },
        score: '2–1',
      },
      {
        away: 'sc Heerenveen',
        competition: 'Eredivisie',
        date: 'za 14 nov',
        dateTime: '2026-11-14',
        home: 'Testclub',
        points: 0,
        prediction: {
          fullTime: { right: false, score: '1–2' },
          halfTime: { right: false, score: '0–0' },
        },
        score: '1–0',
      },
      {
        away: 'Testclub United',
        competition: 'Eredivisie',
        date: 'zo 29 nov',
        dateTime: '2026-11-29',
        home: 'sc Heerenveen',
        prediction: { fullTime: { score: '1–1' }, halfTime: { score: '0–0' } },
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
          'De lijst met wat een fan voorspelde: een rij per wedstrijd met de dag en de competitie, de clubs met de uitslag, en rechts de punten met de voorspelling.',
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

export const OnePoint = meta.story({
  args: {
    items: [
      {
        away: 'FC Twente',
        competition: 'Eredivisie',
        date: 'za 21 nov',
        dateTime: '2026-11-21',
        home: 'sc Heerenveen',
        points: 1,
        prediction: {
          fullTime: { right: false, score: '0–2' },
          halfTime: { right: true, score: '0–0' },
        },
        score: '1–1',
      },
    ],
  },
  name: 'Eén punt',
})

export const LiveAndCancelled = meta.story({
  args: {
    items: [
      {
        away: 'FC Twente',
        competition: 'Eredivisie',
        date: 'za 21 nov',
        dateTime: '2026-11-21',
        home: 'sc Heerenveen',
        prediction: { fullTime: { score: '3–1' }, halfTime: { score: '1–0' } },
        status: 'Bezig',
      },
      {
        away: 'sc Heerenveen',
        competition: 'KNVB Beker',
        date: 'za 14 nov',
        dateTime: '2026-11-14',
        home: 'Testclub',
        prediction: { fullTime: { score: '1–2' }, halfTime: { score: '0–0' } },
        status: 'Afgelast',
      },
    ],
  },
  name: 'Bezig en afgelast',
})

export const LongNames = meta.story({
  args: {
    items: [
      {
        away: 'Testclub Voetbalvereniging Combinatie Noord',
        competition: 'Eredivisie',
        date: 'za 21 nov',
        dateTime: '2026-11-21',
        home: 'Sportclub Testdorp Boven de Rivier',
        points: 30,
        prediction: {
          fullTime: { right: true, score: '2–1' },
          halfTime: { right: true, score: '1–0' },
        },
        score: '2–1',
      },
    ],
  },
  name: 'Lange clubnamen',
})
