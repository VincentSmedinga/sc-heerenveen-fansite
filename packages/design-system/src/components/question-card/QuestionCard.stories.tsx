import { expect } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { QuestionCard } from './QuestionCard'

const meta = preview.meta({
  argTypes: {
    children: { control: 'text', description: 'De korte regel onder het getal. Hij kan ontbreken.' },
    figure: { control: 'text', description: 'Het getal dat de vraag geeft, groot: een aantal of een uitslag.' },
    href: { control: 'text', description: 'Waar de kaart heen gaat. De hele kaart is de link.' },
    question: { control: 'text', description: 'De vraag in gewone woorden.' },
  },
  component: QuestionCard,
  parameters: {
    docs: {
      description: {
        component: [
          'Een vraagkaart is een kaart die één link is: een vraag, het antwoord als groot getal en een korte regel eronder.',
          'Kies hem om een bezoeker die nog niet weet wat hij zoekt, te laten beginnen bij een vraag waarvan hij het aantal al ziet.',
          'De link heeft de vraag, het getal en de regel samen als naam, en de hele kaart is aan te klikken.',
          'Zet de kaarten in een `QuestionCard.Grid`: dat is de lijst, met drie kolommen op een breed scherm en één op een telefoon.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/QuestionCard',
})

export const Default = meta.story({
  args: { children: 'sinds 1990/91', figure: '228', href: '#vraag', question: 'Tegen Testclub, Voorbeeld en Proef' },
  name: 'Kaart',
  render: (args) => (
    <QuestionCard.Grid aria-label="Voorbeeld" style={{ gridTemplateColumns: '1fr', maxInlineSize: '20rem' }}>
      <QuestionCard {...args} />
    </QuestionCard.Grid>
  ),
})

export const Grid = meta.story({
  name: 'Raster van kaarten',
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole('listitem')).toHaveLength(4)
    await expect(canvas.getByRole('link', { name: /Alle 0–0’s/u })).toHaveAttribute('href', '#nul')
  },
  render: () => (
    <QuestionCard.Grid aria-label="Begin met een vraag">
      <QuestionCard figure="8" href="#uit" question="Elke uitzege in Europa">
        en geen tegendoelpunt
      </QuestionCard>
      <QuestionCard figure="22" href="#derby" question="De derby tegen Testdorp">
        13 keer gewonnen
      </QuestionCard>
      <QuestionCard figure="111" href="#nul" question="Alle 0–0’s" />
      <QuestionCard figure="11–1" href="#zeges" question="Onze grootste zeges">
        de lijst, op doelsaldo
      </QuestionCard>
    </QuestionCard.Grid>
  ),
})
