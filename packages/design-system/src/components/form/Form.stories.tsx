import preview from '#.storybook/preview'

import { Button } from '../button/Button'
import { Field } from '../field/Field'
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
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Form',
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
