import { hiddenReasonMaxLength } from '@fansite/db/schema'

import { parseReason } from './items'

/**
 * The reasons an editor can choose to hide an item (#1013), the keys of the form and the texts
 * that are kept in `hidden_reason`. The list is here and nowhere else: the form, the check of
 * the choice and the explanation of the page read it. The order is the order of the list.
 */
export const hideReasons = [
  { key: 'fout', text: 'Fout in het bericht' },
  { key: 'past-niet', text: 'Past niet bij de site' },
  { key: 'bron', text: 'Op verzoek van de bron' },
  { key: 'dubbel', text: 'Dubbel bericht' },
] as const

/** The key of the choice "Anders", which comes with a text of the editor's own. */
export const otherReasonKey = 'anders'

/** What goes wrong with a reason: no choice, "Anders" without a text, or a text too long. */
export type HideReasonError = 'anders' | 'kies' | 'lang'

/**
 * The reason from the form: the key of the list, and the text that goes with "Anders". The
 * server checks the choice again: a key that is not in the list is no choice. A fixed reason
 * gives its own text and ignores the text field; "Anders" gives the text, as one line.
 */
export function parseHideReason(choice: unknown, note: unknown): { error: HideReasonError } | { reason: string } {
  const fixed = hideReasons.find(({ key }) => key === choice)

  if (fixed !== undefined) {
    return { reason: fixed.text }
  }

  if (choice !== otherReasonKey) {
    return { error: 'kies' }
  }

  const parsed = parseReason(note)

  if ('error' in parsed) {
    return { error: 'lang' }
  }

  // Hiding an item keeps its reason required, also for "Anders".
  return parsed.reason === undefined ? { error: 'anders' } : { reason: parsed.reason }
}

/** The error texts, by what went wrong; `lang` says how long a text may be. */
export const hideReasonErrors: Record<HideReasonError, string> = {
  anders: 'Schrijf een reden bij Anders.',
  kies: 'Kies een reden.',
  lang: `Schrijf een kortere reden, van hoogstens ${hiddenReasonMaxLength} tekens.`,
}
