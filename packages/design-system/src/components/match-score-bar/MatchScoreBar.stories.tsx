import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { MatchScoreBar, type MatchScoreBarGoal } from './MatchScoreBar'

const meta = preview.meta({
  argTypes: {
    extraTime: { description: 'Of de wedstrijd in verlenging ging. De balk loopt dan door tot 120 minuten.' },
    goals: { description: 'De doelpunten, met de minuut, de blessuretijd en voor wie ze telden.' },
    headingLevel: { description: 'Het niveau van de kop "Wedstrijdverloop" in de opbouw van de pagina.' },
  },
  component: MatchScoreBar,
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
          'Hoe de stand in een wedstrijd liep, als dunne balk met een stuk voor elke stand: groen als sc Heerenveen voor stond, grijs bij gelijkstand en rood bij achterstand.',
          'De balk is versiering; een schermlezer hoort per stuk de stand en de minuten, dus kleur is niet het enige teken.',
          'Hij is gebouwd uit `Heading` en de kleuren van een uitslag.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchScoreBar',
})

const ours = (minute: number, stoppageMinutes?: number): MatchScoreBarGoal => ({ minute, ours: true, stoppageMinutes })
const theirs = (minute: number, stoppageMinutes?: number): MatchScoreBarGoal => ({
  minute,
  ours: false,
  stoppageMinutes,
})

export const Default = meta.story({
  args: {
    extraTime: false,
    goals: [ours(12), theirs(34), theirs(51), ours(63), ours(78)],
    headingLevel: 2,
  },
  name: 'De stand per minuut',
})

export const WithoutGoals = meta.story({
  args: { goals: [], headingLevel: 2 },
  name: 'Zonder doelpunten',
})

export const LostLead = meta.story({
  args: {
    goals: [ours(8), ours(31), theirs(52), theirs(67), theirs(81)],
    headingLevel: 2,
  },
  name: 'Een voorsprong die verloren gaat',
})

export const AddedTime = meta.story({
  args: {
    goals: [ours(45, 1), theirs(45, 3), theirs(90, 2), ours(90, 4)],
    headingLevel: 2,
  },
  name: 'Doelpunten in de blessuretijd',
})

export const ExtraTime = meta.story({
  args: {
    extraTime: true,
    goals: [theirs(20), ours(70), ours(105), theirs(118)],
    headingLevel: 2,
  },
  name: 'Met verlenging',
})
