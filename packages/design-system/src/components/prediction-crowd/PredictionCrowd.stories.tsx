import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { GameHeading } from '../game-heading/GameHeading'
import { Link } from '../link/Link'
import { Text } from '../text/Text'
import { PredictionCrowd } from './PredictionCrowd'

const meta = preview.meta({
  args: { children: '54 supporters voorspelden deze wedstrijd.' },
  argTypes: {
    children: { description: 'De regel die zegt hoeveel supporters voorspelden.' },
    figures: { description: 'Kerngetallen over de wedstrijd die is gespeeld. Twee tot vier.' },
    outcomes: { description: 'Hoeveel supporters winst, gelijkspel en verlies voorspelden, voor sc Heerenveen.' },
    scores: { description: 'De meest voorspelde eindstanden, thuis eerst, de meest voorspelde bovenaan.' },
  },
  component: PredictionCrowd,
  decorators: [
    (Story) => (
      <Card aria-labelledby="prognose-kop" game="prognose">
        <GameHeading id="prognose-kop" level={2} meta="Van supporters">
          Prognose
        </GameHeading>
        <Story />
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Wat een groep supporters voorspelde voor één wedstrijd, zonder een naam: hoeveel het er waren en, vanaf de aftrap, de verdeling over winst, gelijk en verlies en de meest voorspelde eindstanden.',
          'Kies hem in de kaart van een spel, op de pagina van een wedstrijd. De uitslag staat in woorden bij de verdeling, niet alleen in kleur. Hij heeft geen kaart of kop van zichzelf.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/PredictionCrowd',
})

export const BeforeKickoff = meta.story({
  args: { children: '48 supporters voorspelden deze wedstrijd. Wat ze voorspelden, zie je bij de aftrap.' },
  name: 'Voor de aftrap',
  render: (args) => (
    <>
      <PredictionCrowd {...args} />
      <Text>
        <Link href="#voorspellen">Voorspel ook</Link>
      </Text>
    </>
  ),
})

export const FromKickoff = meta.story({
  args: {
    outcomes: { draws: 13, losses: 8, wins: 33 },
    scores: [
      { count: 14, label: '2–1' },
      { count: 11, label: '1–0' },
      { count: 8, label: '1–1' },
      { count: 6, label: '3–1' },
      { count: 15, label: 'anders' },
    ],
  },
  name: 'Vanaf de aftrap',
})

export const AfterTheMatch = meta.story({
  args: {
    figures: [
      { figure: '1,9–0,8', label: 'gemiddeld voorspeld', note: 'van 54 voorspellingen' },
      { figure: '14', label: 'precies goed', note: '26 procent' },
      { figure: '38', label: 'goede uitslag', note: '70 procent' },
    ],
    outcomes: { actual: 'win', draws: 13, losses: 8, wins: 33 },
    scores: [
      { actual: true, count: 14, label: '2–1' },
      { count: 11, label: '1–0' },
      { count: 8, label: '1–1' },
      { count: 6, label: '3–1' },
      { count: 15, label: 'anders' },
    ],
  },
  name: 'Na de wedstrijd',
})
