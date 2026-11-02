import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Button } from '../button/Button'
import { Card } from '../card/Card'
import { Form } from '../form/Form'
import { RadioGroup, type RadioGroupProps } from './RadioGroup'

const options = [
  { label: 'Nee', value: 'nee' },
  { label: 'Ja', value: 'ja' },
]

const meta = preview.meta({
  argTypes: {
    error: { description: 'Wat er mis is met het antwoord, en hoe je het goed maakt. Zonder `error` is er geen fout.' },
    hideOptional: { description: 'Laat "(niet verplicht)" weg uit de legenda van een groep die niet verplicht is.' },
    hint: { description: 'Extra uitleg onder de legenda, als gewone tekst.' },
    id: {
      description:
        'De `id` van de groep. Het is de `id` van het eerste keuzerondje, zodat een link in een `ErrorSummary` ernaartoe gaat.',
    },
    legend: { description: 'De naam van de groep. Een schermlezer leest hem voor elk keuzerondje voor.' },
    name: { description: 'De naam waaronder het formulier de gekozen waarde verstuurt.' },
    options: {
      description:
        'De keuzerondjes, in de volgorde waarin ze staan: een `label` voor de bezoeker en een `value` voor het formulier.',
    },
    required: { description: 'Of er één gekozen moet zijn. Zonder `required={false}` is dat zo.' },
    value: { description: 'De waarde die gekozen is als de pagina opent. Zonder `value` is er niets gekozen.' },
  },
  component: RadioGroup,
  parameters: {
    docs: {
      description: {
        component: [
          'Een keuze uit twee of drie waarden, zoals ja of nee: een `fieldset` met een `legend` en een keuzerondje per waarde.',
          'Je kiest het waar de bezoeker alle keuzes in één blik wil zien; bij meer of langere keuzes is een `Select` beter.',
          'Het werkt zonder JavaScript en met het toetsenbord: de pijltjes lopen langs de rondjes, en het formulier verstuurt wat is gekozen.',
          'Zet het in een `Form`. De legenda, de hulptekst en de fout horen bij elkaar zoals bij een `Field`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/RadioGroup',
})

// The form would load a page in the frame of the story, so the story keeps the submit.
const inCard = (args: RadioGroupProps) => (
  <Card as="div" surface="soft">
    <Form action="/wedstrijd" method="post" onSubmit={(event) => event.preventDefault()}>
      <RadioGroup {...args} />
      <Button type="submit">Opslaan</Button>
    </Form>
  </Card>
)

export const Default = meta.story({
  args: { id: 'verlenging', legend: 'Was er verlenging?', name: 'verlenging', options, value: 'nee' },
  name: 'Keuze uit twee',
  render: inCard,
})

export const WithError = meta.story({
  args: {
    error: 'Kies of er verlenging was.',
    hint: 'Alleen bij een beker- of play-offwedstrijd.',
    id: 'verlenging',
    legend: 'Was er verlenging?',
    name: 'verlenging',
    options,
  },
  name: 'Met hulptekst en fout',
  render: inCard,
})

export const WithTheKeyboard = meta.story({
  args: {
    id: 'team',
    legend: 'Team',
    name: 'team',
    options: [
      { label: 'sc Heerenveen', value: 'wij' },
      { label: 'Testclub', value: 'zij' },
    ],
  },
  name: 'Met het toetsenbord',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('radio', { name: 'sc Heerenveen' })).toHaveFocus()
    await userEvent.keyboard('{ArrowDown}')
    await expect(canvas.getByRole('radio', { name: 'Testclub' })).toBeChecked()
    await userEvent.keyboard('{ArrowUp}')
    await expect(canvas.getByRole('radio', { name: 'sc Heerenveen' })).toBeChecked()
    await expect(canvas.getByRole('radio', { name: 'Testclub' })).not.toBeChecked()
  },
  render: inCard,
})
