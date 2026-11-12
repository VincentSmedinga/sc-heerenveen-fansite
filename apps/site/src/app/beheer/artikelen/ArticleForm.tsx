'use client'

import { Button, ErrorSummary, Field, Form, Input, Textarea } from '@fansite/design-system'
import { RichTextEditor, type RichTextValue } from '@fansite/design-system/rich-text-editor'
import { useActionState, useEffect, useRef, useState } from 'react'

import {
  type ArticleFormState,
  type ArticleValues,
  fieldNames,
  slugMaxLength,
  suggestSlug,
} from '#src/beheer/article-fields'

const summaryId = 'fouten'

/** How long each field may be, for the hints. The server checks the real limits. */
export type ArticleFormLimits = { author: number; body: string; intro: number; title: number }

/** Where the article stands, which decides the buttons and the address field. */
export type ArticleStatus = 'draft' | 'new' | 'published'

/**
 * The form to write an article or to change one. It is a client component to show what the
 * server says and to run the editor, which needs JavaScript: writing does, reading does not.
 * With JavaScript the page doesn't reload when the form is sent. The address follows the title
 * until the editor writes in the address field themself; an empty address becomes the same
 * proposal on the server.
 *
 * "Opslaan" is the first button, so the Enter key in a field saves and does not publish.
 * "Publiceren" saves what is on the screen and then publishes it. The address of a published
 * article is shown but can't be changed. An author has no "Publiceren" (`publishes` is false):
 * an editor or the owner publishes his article.
 */
export function ArticleForm({
  action,
  initial,
  limits,
  publishes = true,
  status,
}: {
  action: (previous: ArticleFormState, formData: FormData) => Promise<ArticleFormState>
  initial: ArticleValues
  limits: ArticleFormLimits
  /** Whether the form has the button to publish: not for an author. */
  publishes?: boolean
  status: ArticleStatus
}) {
  // The editor starts with the text that was loaded, and keeps its own text after that.
  const [startText] = useState(() => editorValue(initial.tekst))
  const [state, formAction, pending] = useActionState(action, { errors: {}, values: initial })
  const { errors, values } = state
  const summary = fieldNames.flatMap((name) => {
    const message = errors[name]

    return message === undefined ? [] : [{ id: name, message }]
  })

  // Whether the address still follows the title: true until the editor writes in it, and at
  // the start when it is empty or the proposal from the title.
  const following = useRef(values.adres === '' || values.adres === suggestSlug(values.titel))

  // After a save with errors the editor must hear what is wrong. Without JavaScript the page
  // loads again and the screen reader starts at the top; with JavaScript the page doesn't
  // change, so the focus goes to the block.
  useEffect(() => {
    if (fieldNames.some((name) => state.errors[name] !== undefined)) {
      document.getElementById(summaryId)?.focus()
    }
  }, [state])

  return (
    <>
      <ErrorSummary errors={summary} id={summaryId} level={2} tabIndex={-1} />
      <Form action={formAction}>
        <Field error={errors.titel} hint={`Hoogstens ${limits.title} tekens.`} id="titel" label="Titel">
          <Input
            autoComplete="off"
            defaultValue={values.titel}
            name="titel"
            onInput={(event) => {
              const address = event.currentTarget.form?.elements.namedItem('adres')

              if (status !== 'published' && following.current && address instanceof HTMLInputElement) {
                address.value = suggestSlug(event.currentTarget.value, slugMaxLength)
              }
            }}
          />
        </Field>
        <Field
          error={errors.adres}
          hint={
            status === 'published'
              ? 'Dit artikel staat op de site, dus het adres verandert niet meer. Trek het artikel eerst in als het toch moet.'
              : 'Kleine letters, cijfers en streepjes. Laat het leeg voor een voorstel uit de titel. Na het publiceren verandert het niet meer.'
          }
          id="adres"
          label="Adres"
          required={status === 'published'}
        >
          <Input
            autoComplete="off"
            defaultValue={values.adres}
            name="adres"
            onInput={() => {
              following.current = false
            }}
            readOnly={status === 'published'}
            spellCheck={false}
          />
        </Field>
        <Field
          error={errors.intro}
          hint={`Een of twee zinnen, hoogstens ${limits.intro} tekens. Staat onder de titel en in de kaart op home.`}
          id="intro"
          label="Intro"
        >
          <Textarea autoComplete="off" defaultValue={values.intro} name="intro" rows={3} />
        </Field>
        <RichTextEditor
          {...(startText === undefined ? {} : { defaultValue: startText })}
          error={errors.tekst}
          hint={`Hoogstens ${limits.body} tekens. Met de knoppen maak je een kop, een lijst, vet, cursief en een link. Noem wat je van anderen overneemt altijd met de bron en een link.`}
          id="tekst"
          label="Tekst"
          name="tekst"
        />
        <Field
          error={errors.auteur}
          hint={`De naam die bij het artikel staat, bijvoorbeeld “de redactie”. Hoogstens ${limits.author} tekens.`}
          id="auteur"
          label="Auteur"
        >
          <Input autoComplete="off" defaultValue={values.auteur} name="auteur" />
        </Field>
        {/* Opslaan stays the first button: it is the one the Enter key presses. */}
        <Button className="hf-space-end-0" disabled={pending} type="submit">
          {status === 'new' ? 'Opslaan als concept' : 'Opslaan'}
        </Button>
        {status === 'draft' && publishes ? (
          <Button appearance="soft" disabled={pending} name="knop" type="submit" value="publiceren">
            Publiceren
          </Button>
        ) : null}
      </Form>
    </>
  )
}

/** The text of the article for the editor, or nothing, so the editor starts empty. */
function editorValue(text: string): RichTextValue | undefined {
  try {
    const value: unknown = JSON.parse(text)

    return typeof value === 'object' && value !== null && 'type' in value && value.type === 'doc'
      ? (value as RichTextValue)
      : undefined
  } catch {
    return undefined
  }
}
