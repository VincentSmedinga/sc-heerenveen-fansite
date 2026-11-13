import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Button } from '../button/Button'
import { Card } from '../card/Card'
import { Field } from '../field/Field'
import { Heading } from '../heading/Heading'
import { Input } from '../input/Input'
import { Form } from './Form'

const meta = preview.meta({
  argTypes: {
    inline: {
      control: 'boolean',
      description: 'De velden en de knop op één regel, zoals een zoekveld met zijn knop.',
    },
    noValidate: {
      control: 'boolean',
      description: 'Zet de controle van de browser uit. Standaard aan, omdat de site de fouten zelf toont.',
    },
  },
  component: Form,
  parameters: {
    docs: {
      description: {
        component: [
          'Een formulier laat de bezoeker iets invullen en versturen. Het bevat velden (`Field`), een `Honeypot` tegen spam en een `Button`.',
          'Een `ErrorSummary` hoort boven het formulier, buiten het `Form`. De browser controleert het formulier niet zelf: de site toont de fouten in onze woorden.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Form',
})

export const Default = meta.story({
  name: 'Formulier',
  render: (args) => (
    <Form {...args} onSubmit={(event) => event.preventDefault()}>
      <Field id="naam" label="Naam">
        <Input autoComplete="name" name="naam" />
      </Field>
      <Button type="submit">Versturen</Button>
    </Form>
  ),
})

export const Cards = meta.story({
  name: 'Kaarten',
  render: () => (
    <Form onSubmit={(event) => event.preventDefault()}>
      <Card aria-labelledby="kaart-a">
        <Heading id="kaart-a" level={2}>
          Aftrap
        </Heading>
        <Field id="datum" label="Datum">
          <Input name="datum" />
        </Field>
      </Card>
      <Card aria-labelledby="kaart-b">
        <Heading id="kaart-b" level={2}>
          Uitslag
        </Heading>
        <Field id="stand" label="Stand">
          <Input name="stand" />
        </Field>
      </Card>
    </Form>
  ),
})

export const Buttons = meta.story({
  name: 'Meer knoppen',
  render: () => (
    <Form onSubmit={(event) => event.preventDefault()}>
      <Form.Buttons>
        {['Doelman', 'Verdediger', 'Middenvelder', 'Aanvaller'].map((line) => (
          <Button aria-label={`${line} voor Jan Voorbeeld`} key={line} type="submit">
            {line}
          </Button>
        ))}
        <Button appearance="soft" aria-label="Sla over: Jan Voorbeeld" type="button">
          Sla over
        </Button>
      </Form.Buttons>
    </Form>
  ),
})

export const OneLine = meta.story({
  name: 'Op één regel',
  render: () => (
    <Form inline onSubmit={(event) => event.preventDefault()}>
      <Field id="zoek" label="Zoeken" required={false}>
        <Input name="q" type="search" />
      </Field>
      <Button type="submit">Zoeken</Button>
    </Form>
  ),
})
