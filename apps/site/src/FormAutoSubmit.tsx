'use client'

import { useEffect } from 'react'

/**
 * Sends a form when the visitor changes a choice in it: a list or a checkbox, not a text
 * field, which would send before the visitor is done. It is an extra for browsers with
 * JavaScript; the form works without it, with its button. It also takes the controls that sit
 * outside the form and belong to it through their `form` attribute. It draws nothing.
 */
export function FormAutoSubmit({ formId }: { formId: string }) {
  useEffect(() => {
    const listener = (event: Event) => {
      const form = document.getElementById(formId)
      const { target } = event

      if (
        form instanceof HTMLFormElement &&
        (target instanceof HTMLSelectElement || (target instanceof HTMLInputElement && target.type === 'checkbox')) &&
        target.form === form
      ) {
        form.requestSubmit()
      }
    }

    document.addEventListener('change', listener)

    return () => document.removeEventListener('change', listener)
  }, [formId])

  return null
}
