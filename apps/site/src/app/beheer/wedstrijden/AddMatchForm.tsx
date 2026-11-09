'use client'

import {
  Button,
  Card,
  ErrorSummary,
  Field,
  FieldGroup,
  Form,
  Heading,
  Input,
  Link,
  RadioGroup,
  Select,
  Text,
} from '@fansite/design-system'
import { useActionState, useEffect } from 'react'

import {
  type AddFieldName,
  addFieldNames,
  type AddFormState,
  emptyAddValues,
  newClubChoice,
} from '#src/beheer/match-add-fields'

import { matchesPath } from './paths'

const summaryId = 'fouten'

/** What the form needs besides the match: the lists to choose from. */
export type AddMatchChoices = {
  clubs: { id: number; name: string }[]
  competitions: readonly string[]
  statuses: readonly { label: string; value: string }[]
}

/**
 * The form that adds a match no import reads. Every field has its own error, and the list of
 * errors gets the focus after a save that did not work, also an error that belongs to no field
 * (`algemeen`). It works without JavaScript: the server answers with the form again.
 */
export function AddMatchForm({
  action,
  choices,
}: {
  action: (previous: AddFormState, formData: FormData) => Promise<AddFormState>
  choices: AddMatchChoices
}) {
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: emptyAddValues })
  const { errors, values } = state
  const summary = [...addFieldNames, 'algemeen' as const].flatMap((id) => {
    const message = errors[id]

    return message === undefined ? [] : [{ id, message }]
  })

  useEffect(() => {
    if (summary.length > 0) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state, summary.length])

  // The value is the key of a field that a server answer must reset: React keeps what is typed.
  const field = (name: AddFieldName) => ({ defaultValue: values[name], key: `${name}-${values[name]}`, name })

  return (
    <Form action={formAction}>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      <Card aria-labelledby="wie-kop">
        <Heading id="wie-kop" level={2}>
          Welke wedstrijd
        </Heading>
        <Field
          error={errors.seizoen}
          hint="Zoals 2008/09. Een seizoen loopt van 1 juli tot 30 juni."
          id="seizoen"
          label="Seizoen"
        >
          <Input {...field('seizoen')} autoComplete="off" width="narrow" />
        </Field>
        <Field error={errors.competitie} id="competitie" label="Competitie">
          <Select {...field('competitie')} width="natural">
            <Select.Option value="">Kies een competitie</Select.Option>
            {choices.competitions.map((competition) => (
              <Select.Option key={competition} value={competition}>
                {competition}
              </Select.Option>
            ))}
          </Select>
        </Field>
        <Field
          error={errors.ronde}
          hint="Zoals Speelronde 12, Kwartfinale of Finale. De ronde is in een seizoen en een competitie maar één keer te geven."
          id="ronde"
          label="Ronde"
        >
          <Input {...field('ronde')} autoComplete="off" />
        </Field>
        <Field error={errors.tegenstander} id="tegenstander" label="Tegenstander">
          <Select {...field('tegenstander')} width="natural">
            <Select.Option value="">Kies een club</Select.Option>
            {choices.clubs.map((club) => (
              <Select.Option key={club.id} value={String(club.id)}>
                {club.name}
              </Select.Option>
            ))}
            <Select.Option value={newClubChoice}>Een andere club, die hieronder staat</Select.Option>
          </Select>
        </Field>
        <Field
          error={errors['nieuwe-club']}
          hideOptional
          hint="Alleen als de club er niet tussen staat. Een naam die we al kennen, wordt die club."
          id="nieuwe-club"
          label="Naam van een nieuwe club"
          required={false}
        >
          <Input {...field('nieuwe-club')} autoComplete="off" />
        </Field>
        <RadioGroup
          error={errors.thuis}
          id="thuis"
          key={`thuis-${values.thuis}`}
          legend="Thuis of uit"
          name="thuis"
          options={[
            { label: 'Thuis', value: 'thuis' },
            { label: 'Uit', value: 'uit' },
          ]}
          value={values.thuis}
        />
      </Card>
      <Card aria-labelledby="aftrap-kop">
        <Heading id="aftrap-kop" level={2}>
          Aftrap
        </Heading>
        <FieldGroup legend="Datum en tijd">
          <Field error={errors['aftrap-datum']} id="aftrap-datum" label="Datum">
            <Input {...field('aftrap-datum')} type="date" width="natural" />
          </Field>
          <Field
            error={errors['aftrap-tijd']}
            hideOptional
            hint="Is de tijd niet bekend? Laat hem dan leeg."
            id="aftrap-tijd"
            label="Tijd"
            required={false}
          >
            <Input {...field('aftrap-tijd')} type="time" width="natural" />
          </Field>
          <Field
            error={errors['aftrap-tekst']}
            hideOptional
            hint="Alleen als je de tijd niet invult, en er iets te zeggen is, zoals de avond."
            id="aftrap-tekst"
            label="Tijd onbekend: wat weten we wel?"
            required={false}
          >
            <Input {...field('aftrap-tekst')} autoComplete="off" />
          </Field>
        </FieldGroup>
      </Card>
      <Card aria-labelledby="uitslag-kop">
        <Heading id="uitslag-kop" level={2}>
          Uitslag
        </Heading>
        <Field error={errors.status} id="status" label="Status">
          <Select {...field('status')} width="natural">
            {choices.statuses.map((status) => (
              <Select.Option key={status.value} value={status.value}>
                {status.label}
              </Select.Option>
            ))}
          </Select>
        </Field>
        <FieldGroup hint="De doelpunten en de rest vul je daarna in, op de pagina van de wedstrijd." legend="Eindstand">
          <Field
            error={errors['uitslag-wij']}
            hideOptional
            id="uitslag-wij"
            label="Doelpunten sc Heerenveen"
            required={false}
          >
            <Input {...field('uitslag-wij')} autoComplete="off" inputMode="numeric" width="narrow" />
          </Field>
          <Field
            error={errors['uitslag-zij']}
            hideOptional
            id="uitslag-zij"
            label="Doelpunten tegenstander"
            required={false}
          >
            <Input {...field('uitslag-zij')} autoComplete="off" inputMode="numeric" width="narrow" />
          </Field>
        </FieldGroup>
      </Card>
      <Card aria-labelledby="bron-kop">
        <Heading id="bron-kop" level={2}>
          Bron
        </Heading>
        <Field
          error={errors.bron}
          hint="Waar komt dit vandaan? Zoals Leeuwarder Courant, 12 mei 2009. Komt in het logboek en staat bij de wedstrijd op de site. Alleen feiten, geen tekst van een krant."
          id="bron"
          label="Bron"
        >
          <Input {...field('bron')} autoComplete="off" />
        </Field>
      </Card>
      <Button disabled={pending} icon="save" type="submit">
        Wedstrijd toevoegen
      </Button>
      <Text>
        <Link href={matchesPath}>Annuleren</Link>
      </Text>
    </Form>
  )
}
