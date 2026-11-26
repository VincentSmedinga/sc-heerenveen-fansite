import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { PredictionList, type PredictionListItem } from './PredictionList'

const played = (
  opponent: string,
  home: boolean,
  goalsFor: number,
  goalsAgainst: number,
  time: string,
  dateTime: string,
) =>
  ({
    competition: 'Eredivisie',
    dateTime,
    goalsAgainst,
    goalsFor,
    home,
    opponent,
    round: 'Speelronde 12',
    status: 'played',
    time,
  }) as const

const items: PredictionListItem[] = [
  {
    match: played('FC Twente', true, 2, 1, 'za 21 nov', '2026-11-21'),
    points: 17,
    prediction: { fullTime: { right: true, score: '3–1' }, halfTime: { right: false, score: '1–0' } },
  },
  {
    match: played('Testclub', false, 0, 1, 'za 14 nov', '2026-11-14'),
    points: 0,
    prediction: { fullTime: { right: false, score: '1–2' }, halfTime: { right: false, score: '0–0' } },
  },
  {
    match: {
      competition: 'Eredivisie',
      dateTime: '2026-11-29',
      home: true,
      opponent: 'Testclub United',
      round: 'Speelronde 14',
      status: 'scheduled',
      time: 'zo 29 nov',
    },
    prediction: { fullTime: { score: '1–1' }, halfTime: { score: '0–0' } },
  },
]

const meta = preview.meta({
  args: { items },
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
          'De lijst met wat een fan voorspelde: een rij per wedstrijd met links de wedstrijd zoals Match hem toont, met de kleur van de uitslag, en rechts de punten met de voorspelling. Is er weinig ruimte, zoals met grote tekst, dan staan die onder de wedstrijd.',
          'Kies hem voor een korte lijst op een kaart. Het is een lijst en geen tabel, want een rij leest als één zin. De uitslag breekt nooit af: een lange clubnaam gaat over een tweede regel door. Er wordt niets ingekort.',
          'Boven elke rij staat een dunne lijn, ook boven de eerste, met de krappe maat van de meeste lijsten.',
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
        match: played('FC Twente', true, 1, 1, 'za 21 nov', '2026-11-21'),
        points: 1,
        prediction: { fullTime: { right: false, score: '0–2' }, halfTime: { right: true, score: '0–0' } },
      },
    ],
  },
  name: 'Eén punt',
})

export const LiveAndCancelled = meta.story({
  args: {
    items: [
      {
        match: {
          competition: 'Eredivisie',
          dateTime: '2026-11-21',
          home: true,
          note: 'Bezig',
          opponent: 'FC Twente',
          round: 'Speelronde 12',
          status: 'scheduled',
          time: 'za 21 nov',
        },
        prediction: { fullTime: { score: '3–1' }, halfTime: { score: '1–0' } },
      },
      {
        match: {
          competition: 'KNVB Beker',
          home: false,
          opponent: 'Testclub',
          round: 'Tweede ronde',
          status: 'cancelled',
        },
        prediction: { fullTime: { score: '1–2' }, halfTime: { score: '0–0' } },
      },
    ],
  },
  name: 'Bezig en geannuleerd',
})

export const Draw = meta.story({
  args: {
    items: [
      {
        match: played('Testclub', true, 2, 2, 'za 21 nov', '2026-11-21'),
        points: 15,
        prediction: { fullTime: { right: true, score: '2–2' }, halfTime: { right: false, score: '0–1' } },
      },
    ],
  },
  name: 'Gelijkspel',
})

export const LongNames = meta.story({
  args: {
    items: [
      {
        match: played(
          'Testclub Voetbalvereniging Combinatie Noord Boven de Rivier',
          true,
          2,
          1,
          'za 21 nov',
          '2026-11-21',
        ),
        points: 30,
        prediction: { fullTime: { right: true, score: '2–1' }, halfTime: { right: true, score: '1–0' } },
      },
    ],
  },
  name: 'Lange clubnamen',
})
