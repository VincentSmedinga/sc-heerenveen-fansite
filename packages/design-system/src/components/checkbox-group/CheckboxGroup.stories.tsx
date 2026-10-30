import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Button } from '../button/Button'
import { Card } from '../card/Card'
import { Form } from '../form/Form'
import { CheckboxGroup } from './CheckboxGroup'

const options = [
  { label: 'Leeuwarder Courant', value: 'leeuwarder-courant' },
  { label: 'Omrop Fryslân', value: 'omrop-fryslan' },
  { label: 'Testkrant', value: 'testkrant' },
  { label: 'Voorbeeldkrant, met dank aan de redactie', value: 'voorbeeldkrant' },
]

const meta = preview.meta({
  args: { legend: 'Bronnen', name: 'bron', options },
  argTypes: {
    legend: { description: 'De naam van de groep. Een schermlezer leest hem voor elk vakje voor.' },
    name: { description: 'De naam waaronder het formulier elke aangevinkte waarde verstuurt.' },
    options: {
      description:
        'De vakjes, in de volgorde waarin ze staan: een `label` voor de bezoeker en een `value` voor het formulier.',
    },
    value: {
      description: 'De waarden die aangevinkt zijn als de pagina opent. Zonder `value` staat er niets aan.',
    },
  },
  component: CheckboxGroup,
  parameters: {
    docs: {
      description: {
        component: [
          'Een groep selectievakjes waarvan de bezoeker er zoveel aanvinkt als hij wil, zoals de bronnen waarvan een pagina nieuws toont.',
          'Je kiest hem als meer dan één antwoord kan, en een keuzelijst of een rij links maar één antwoord geeft.',
          'Het is een `fieldset` met een `legend`, dus een schermlezer zegt de naam van de groep bij elk vakje.',
          'Zet hem in een `Form` met een `Button` die het formulier verstuurt: de groep onthoudt zelf niets, het formulier stuurt wat is aangevinkt.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/CheckboxGroup',
})

// The form would load a page in the frame of the story, so the story keeps the submit.
const inCard = (args: Parameters<typeof CheckboxGroup>[0]) => (
  <Card as="div" surface="soft">
    <Form action="/nieuws" method="get" onSubmit={(event) => event.preventDefault()}>
      <CheckboxGroup {...args} />
      <Button type="submit">Toon</Button>
    </Form>
  </Card>
)

export const Default = meta.story({
  name: 'Niets aangevinkt',
  render: inCard,
})

export const Checked = meta.story({
  args: { value: ['omrop-fryslan', 'testkrant'] },
  name: 'Twee aangevinkt',
  render: inCard,
})

export const WithTheKeyboard = meta.story({
  name: 'Met het toetsenbord',
  play: async ({ canvas }) => {
    await userEvent.tab()
    await expect(canvas.getByRole('checkbox', { name: 'Leeuwarder Courant' })).toHaveFocus()
    await userEvent.keyboard(' ')
    await expect(canvas.getByRole('checkbox', { name: 'Leeuwarder Courant' })).toBeChecked()
    await userEvent.tab()
    await userEvent.tab()
    await expect(canvas.getByRole('checkbox', { name: 'Testkrant' })).toHaveFocus()
    await userEvent.keyboard(' ')
    await expect(canvas.getByRole('checkbox', { name: 'Testkrant' })).toBeChecked()
    await expect(canvas.getByRole('checkbox', { name: 'Omrop Fryslân' })).not.toBeChecked()
  },
  render: inCard,
})
