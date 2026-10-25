import preview from '#.storybook/preview'

import { Button } from '../components/button/Button'
import { ErrorSummary } from '../components/error-summary/ErrorSummary'
import { Field } from '../components/field/Field'
import { Form } from '../components/form/Form'
import { Honeypot } from '../components/honeypot/Honeypot'
import { Input } from '../components/input/Input'
import { Select } from '../components/select/Select'
import { Textarea } from '../components/textarea/Textarea'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Formulierelementen: label, invoerveld, keuzelijst, tekstvak, vinkje, keuzerondje en knop.',
          'Velden en knoppen zijn hoog genoeg om met een vinger te raken. De rand van een veld is goed te zien tegen de achtergrond.',
          '',
          'Een pagina gebruikt geen HTML, dus voor een formulier zijn er componenten:',
          '`Form`, `Field` met een `Input`, `Textarea` of `Select`, `Button`, `ErrorSummary` en `Honeypot`.',
          'Het voorbeeld Verwijderverzoek laat zien hoe ze samen een formulier vormen.',
          'Een vinkje en een keuzerondje hebben nog geen component; in het voorbeeld staan ze als kaal element.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'HTML-elementen/Formulier',
})

// The two answers of the radio buttons and the checkbox have no component yet, so they are bare
// elements here.
const renderForm = (withErrors: boolean) => (
  <>
    {withErrors ? (
      <ErrorSummary
        errors={[
          { id: 'e-mail', message: 'Vul een e-mailadres in, zoals naam@voorbeeld.nl.' },
          { id: 'link', message: 'Vul de link in naar het bericht dat weg moet.' },
        ]}
        level={2}
      />
    ) : null}
    <Form onSubmit={(event) => event.preventDefault()}>
      <Field id="naam" label="Naam" required={false}>
        <Input autoComplete="name" name="naam" />
      </Field>

      <Field
        error={withErrors ? 'Vul een e-mailadres in, zoals naam@voorbeeld.nl.' : undefined}
        hint="Hier mailen we naartoe als we vragen hebben."
        id="e-mail"
        label="E-mailadres"
      >
        <Input autoComplete="email" name="e-mail" type="email" />
      </Field>

      <Field id="onderwerp" label="Onderwerp">
        <Select defaultValue="verwijderen" name="onderwerp">
          <Select.Option value="verwijderen">Een bericht laten verwijderen</Select.Option>
          <Select.Option value="fout">Een fout in een bericht</Select.Option>
          <Select.Option value="bron">Een bron voorstellen</Select.Option>
          <Select.Option value="anders">Iets anders</Select.Option>
        </Select>
      </Field>

      <Field
        error={withErrors ? 'Vul de link in naar het bericht dat weg moet.' : undefined}
        id="link"
        label="Link naar het bericht"
      >
        <Input name="link" type="url" />
      </Field>

      <Field id="toelichting" label="Toelichting" required={false}>
        <Textarea name="toelichting" rows={4} />
      </Field>

      <fieldset>
        <legend>Mogen we je mailen over je verzoek?</legend>
        <div>
          <input defaultChecked id="mailen-ja" name="mailen" type="radio" value="ja" />
          <label htmlFor="mailen-ja">Ja, graag</label>
        </div>
        <div>
          <input id="mailen-nee" name="mailen" type="radio" value="nee" />
          <label htmlFor="mailen-nee">Nee, dat hoeft niet</label>
        </div>
      </fieldset>

      <p>
        <input id="kopie" name="kopie" type="checkbox" />
        <label htmlFor="kopie">Stuur mij een kopie van dit verzoek</label>
      </p>

      <Honeypot name="website" />

      <Button type="submit">Versturen</Button>
    </Form>
  </>
)

export const RemovalRequest = meta.story({
  name: 'Verwijderverzoek',
  parameters: {
    docs: {
      description: {
        story:
          'Een formulier van componenten. Elk `Field` heeft zijn label, en een veld dat niet verplicht is, zegt dat. De `Honeypot` zie je niet.',
      },
    },
  },
  render: () => renderForm(false),
})

export const RemovalRequestWithErrors = meta.story({
  name: 'Verwijderverzoek met fouten',
  parameters: {
    docs: {
      description: {
        story:
          'Hetzelfde formulier na het versturen met twee velden fout. De `ErrorSummary` staat boven het formulier, buiten het `Form`. Hij linkt naar die velden, en elke fout staat ook bij het veld.',
      },
    },
  },
  render: () => renderForm(true),
})
