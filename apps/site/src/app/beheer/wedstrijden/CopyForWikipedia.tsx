'use client'

import { Button, Field, Text, Textarea } from '@fansite/design-system'
import { useState, useSyncExternalStore } from 'react'

/**
 * The text an editor puts on Wikipedia by hand (issue 1026): the value of the match in the
 * notation of the match box. The text always stands in a field that the editor can select and
 * copy, so it works without JavaScript. With JavaScript, a button puts it on the clipboard
 * and a line says that it worked. Nothing is sent anywhere and nothing is kept.
 */
export function CopyForWikipedia({
  id,
  text,
  title,
  what,
}: {
  /** The number of the difference, so the ids on a page with several stay unique. */
  id: number
  /** The text to copy. */
  text: string
  /** The name of the match. */
  title: string
  /** What the text is, in words: "de doelpunten". */
  what: string
}) {
  // The server and the first render have no button: only the browser knows it can copy.
  const canCopy = useSyncExternalStore(
    () => () => undefined,
    () => typeof navigator.clipboard?.writeText === 'function',
    () => false,
  )
  const [status, setStatus] = useState('')

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setStatus(`Gekopieerd: ${what} van ${title}. Plak het op Wikipedia.`)
    } catch {
      setStatus('Kopiëren is niet gelukt. Selecteer de tekst in het veld en kopieer hem zelf.')
    }
  }

  return (
    <>
      <Field
        hideOptional
        hint="Een verbetering op Wikipedia vraagt een gepubliceerde bron. Onze eigen site is er geen."
        id={`wikipedia-${id}-tekst`}
        label={`Tekst voor Wikipedia: ${what} van ${title}`}
        required={false}
      >
        <Textarea readOnly rows={text.split('\n').length} value={text} />
      </Field>
      {canCopy ? (
        <Button
          appearance="soft"
          aria-label={`Kopieer voor Wikipedia: ${what} van ${title}`}
          onClick={copy}
          type="button"
        >
          Kopieer voor Wikipedia
        </Button>
      ) : null}
      <Text className="hf-visually-hidden" role="status">
        {status}
      </Text>
    </>
  )
}
