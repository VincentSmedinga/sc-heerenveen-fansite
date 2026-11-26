'use client'

import { Button, Card, Field, Form, Heading, Input, RadioGroup, Text } from '@fansite/design-system'
import { useActionState, useEffect, useRef } from 'react'

import { type ClubColourMode, type ClubColourState, colourFieldId, colourModeId } from '#src/beheer/club-colour-fields'

type Props = {
  /** The action that saves the choice: `submitClubColour` with the club bound to it. */
  action: (previous: ClubColourState, formData: FormData) => Promise<ClubColourState>
  /** The choice of the editors now: null for the list, `none` or a colour. */
  choice: null | string
  /** The colour the club has now as `#rrggbb`, or null for none. */
  colour: null | string
  /** The name of the club, for the name of the button. */
  name: string
  /** When a saved colour shows on the match pages. */
  showDelay: string
}

/**
 * The colour of a club, for the discs on the pitch of a match: a choice between the colour of
 * the list, an own colour and none, a field for the own colour and a button. The card says
 * which colour holds now. A colour that is wrong shows at its field, which gets the focus. It
 * is a plain POST that works without JavaScript.
 */
export function ClubColourForm({ action, choice, colour, name, showDelay }: Props) {
  const [state, formAction, pending] = useActionState<ClubColourState, FormData>(action, {})
  const told = useRef(state)
  const stored: ClubColourMode = choice === null ? 'lijst' : choice === 'none' ? 'geen' : 'eigen'
  const mode = state.mode ?? stored
  const own = state.colour ?? (stored === 'eigen' ? (choice ?? '') : '')

  useEffect(() => {
    if (told.current === state) {
      return
    }

    told.current = state

    if (state.error !== undefined) {
      document.getElementById(state.field === 'kleur' ? colourFieldId : colourModeId)?.focus()
    }
  }, [state])

  const source = stored === 'lijst' ? 'uit de lijst' : 'gekozen door de redactie'

  return (
    <Card aria-labelledby="kleur-kop">
      <Heading id="kleur-kop" level={2}>
        Kleur van de club
      </Heading>
      <Text appearance="meta">
        {`Nu: ${colour ?? 'geen kleur'}, ${source}. De rondjes van deze club op het veld van een wedstrijd krijgen die kleur. Zonder kleur zijn ze open.`}
      </Text>
      <Form action={formAction}>
        <RadioGroup
          error={state.field === 'keuze' ? state.error : undefined}
          id={colourModeId}
          key={`keuze-${mode}`}
          legend="Welke kleur"
          name="keuze"
          options={[
            { label: 'Uit de lijst', value: 'lijst' },
            { label: 'Eigen kleur', value: 'eigen' },
            { label: 'Geen kleur', value: 'geen' },
          ]}
          value={mode}
        />
        <Field
          error={state.field === 'kleur' ? state.error : undefined}
          hint="Alleen voor een eigen kleur: # en zes hexadecimale tekens, zoals #e30613."
          id={colourFieldId}
          label="Eigen kleur"
          required={false}
        >
          <Input
            autoComplete="off"
            autoFocus={state.field === 'kleur'}
            defaultValue={own}
            key={`kleur-${own}`}
            name="kleur"
            spellCheck={false}
          />
        </Field>
        <Form.Buttons>
          <Button aria-label={`Opslaan: kleur van ${name}`} disabled={pending} icon="save" type="submit">
            Opslaan
          </Button>
        </Form.Buttons>
      </Form>
      <Text role="status">
        {state.saved === undefined
          ? null
          : `Opgeslagen: ${name} heeft ${state.saved === '' ? 'geen kleur' : `de kleur ${state.saved}`}. Dat staat ${showDelay} op de wedstrijdpagina's van dit seizoen; bij oudere seizoenen duurt het langer.`}
      </Text>
    </Card>
  )
}
