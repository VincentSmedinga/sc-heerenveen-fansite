import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Button } from '../button/Button'
import { Card } from '../card/Card'
import { Form } from '../form/Form'
import { RatingScale, type RatingScaleProps } from './RatingScale'

const meta = preview.meta({
  argTypes: {
    error: { description: 'Wat er mis is met het cijfer, en hoe je het goed maakt. Zonder `error` is er geen fout.' },
    id: {
      description:
        'De `id` van de groep. Het is de `id` van het eerste keuzerondje, zodat een link in een `ErrorSummary` ernaartoe gaat.',
    },
    legend: {
      description:
        'De naam van wie een cijfer krijgt, zoals een speler. Een schermlezer leest hem voor elk cijfer voor.',
    },
    line: { description: 'Een kleine regel onder de legenda, zoals "Keeper · 90 min". Mag leeg zijn.' },
    name: { description: 'De naam waaronder het formulier het gekozen cijfer verstuurt.' },
    required: { description: 'Of er een cijfer gekozen moet zijn. Zonder `required={false}` is dat zo.' },
    value: {
      description: 'Het cijfer dat gekozen is als de pagina opent, van 1 tot 10. Zonder `value` is er niets gekozen.',
    },
  },
  component: RatingScale,
  parameters: {
    docs: {
      description: {
        component: [
          'De cijferschaal waarmee een fan één speler, of de trainer, een cijfer van 1 tot 10 geeft: tien knoppen in één groep, onder de naam van de speler.',
          'Kies hem waar je een geheel cijfer per persoon vraagt; een keuzelijst is langzamer en een schuifbalk geeft geen geheel cijfer. Hij werkt zonder JavaScript en met het toetsenbord: de pijltjes lopen langs de cijfers, en het formulier verstuurt het gekozen cijfer. De pagina geeft de naam, de regel en de foutmelding.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/RatingScale',
})

// The form would load a page in the frame of the story, so the story keeps the submit.
const inCard = (args: RatingScaleProps) => (
  <Card as="div" surface="soft">
    <Form action="/cijfers" method="post" onSubmit={(event) => event.preventDefault()}>
      <RatingScale {...args} />
      <Button type="submit">Cijfers opslaan</Button>
    </Form>
  </Card>
)

const player = { id: 'cijfer-1', legend: 'Testspeler A', line: 'Keeper · 90 min', name: 'cijfer-1' }

export const Default = meta.story({
  args: player,
  name: 'Leeg',
  render: inCard,
})

export const Chosen = meta.story({
  args: { ...player, value: 7 },
  name: 'Gekozen',
  render: inCard,
})

export const WithError = meta.story({
  args: { ...player, error: 'Geef Testspeler A een cijfer.' },
  name: 'Met fout',
  render: inCard,
})

export const OneRow = meta.story({
  args: { ...player, value: 8 },
  decorators: [
    (Story) => (
      <div style={{ inlineSize: '60rem', maxInlineSize: '100%' }}>
        <Story />
      </div>
    ),
  ],
  name: 'Eén rij',
  // A Form is never wider than a form is, so the card holds the group itself.
  render: (args) => (
    <Card as="div" surface="soft">
      <RatingScale {...args} />
    </Card>
  ),
})

export const WithTheKeyboard = meta.story({
  args: { id: 'cijfer-2', legend: 'Testspeler B', name: 'cijfer-2' },
  name: 'Met het toetsenbord',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('radio', { name: '1' })).toHaveFocus()
    await userEvent.keyboard('{ArrowRight}')
    await expect(canvas.getByRole('radio', { name: '2' })).toBeChecked()
    await userEvent.keyboard('{ArrowLeft}')
    await expect(canvas.getByRole('radio', { name: '1' })).toBeChecked()
    await expect(canvas.getByRole('radio', { name: '2' })).not.toBeChecked()
  },
  render: inCard,
})
