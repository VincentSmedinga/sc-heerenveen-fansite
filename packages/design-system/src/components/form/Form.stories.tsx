import preview from '#.storybook/preview'

import { Button } from '../button/Button'
import { Card } from '../card/Card'
import { Field } from '../field/Field'
import { Heading } from '../heading/Heading'
import { Input } from '../input/Input'
import { Form } from './Form'

const meta = preview.meta({
  component: Form,
  parameters: {
    docs: {
      description: {
        component: [
          'Een formulier. Het bevat velden (`Field`), een `Honeypot` tegen spam en een `Button` om te versturen.',
          'Een `ErrorSummary` hoort boven het formulier, buiten het `Form`.',
          'Het volledige voorbeeld staat bij HTML-elementen/Formulier, onder Verwijderverzoek, met een fout erbij.',
          '',
          'De browser controleert het formulier niet zelf: `Form` zet `noValidate` aan.',
          'De site controleert de antwoorden en laat de fouten zien met een `Field` en een `ErrorSummary`, in onze woorden.',
          'De bubbel van de browser staat in de taal van de browser en wordt niet altijd voorgelezen.',
          'Met `noValidate={false}` krijg je de controle van de browser terug.',
          '',
          'Het formulier verstuur je met `action` en `method`, of met een actie van de server.',
          'Een formulier dat gegevens verstuurt, gebruikt `method="post"`.',
          '',
          'Heeft een formulier meer dan één knop, zet ze dan in een `Form.Buttons`: de knoppen staan naast elkaar in even brede kolommen, met ruimte ertussen, en onder elkaar waar ze niet passen.',
          'Zo is elke knop een groot doel voor een vinger.',
          '',
          'Een formulier van kaarten, zoals een wedstrijd in het beheer, zet de ruimte van de pagina tussen de kaarten.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Formulier/Form',
})

const render = () => (
  <Form onSubmit={(event) => event.preventDefault()}>
    <Field id="naam" label="Naam">
      <Input autoComplete="name" name="naam" />
    </Field>
    <Button type="submit">Versturen</Button>
  </Form>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

const cards = () => (
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
)

export const Buttons = meta.story({
  globals: { theme: 'light' },
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

export const Cards = meta.story({ globals: { theme: 'light' }, name: 'Kaarten', render: cards })
