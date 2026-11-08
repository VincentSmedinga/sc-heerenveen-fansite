import type { ReportFormState } from './report-fields'
import type { PasteChoice, PasteRead, PasteUnread } from './report-paste'

// What the screen "Tekst plakken" knows after each answer of the server. It has nothing the
// browser should not load: the screen is a client component, and it imports this file.

/** The most characters of the text. The field says so, and the action refuses more. */
export const pasteMaxLength = 20_000

/** The screen before the text is read, or after a text that could not be read at all. */
export type PasteAsk = {
  /** What is wrong with the request, as a sentence. */
  error?: string
  /** The control the error is about, which gets the focus: the text or the box to replace. */
  field?: 'tekst' | 'vervangen'
  kind: 'ask'
  /** Whether the editor agreed to replace what the report has, so the box stays ticked. */
  replace: boolean
  /** The text as it was pasted, so it is not lost. */
  text: string
  version: number
}

/** The screen after the text was read: the form with the values, and what the reading says. */
export type PasteRead_ = {
  choices: PasteChoice[]
  form: ReportFormState
  kind: 'read'
  read: PasteRead[]
  unread: PasteUnread[]
  /** Counts the texts that were read, so a new text makes the form anew and a save does not. */
  version: number
}

export type PasteState = PasteAsk | PasteRead_

/** The screen as it opens. */
export const firstPasteState: PasteAsk = { kind: 'ask', replace: false, text: '', version: 0 }

/**
 * The text that the screen shows as an example of the format, which the editor can copy and
 * change. The players are made up.
 */
export const pasteExample = [
  'Formatie: 4-3-3',
  'Opstelling',
  '1 Brandsma',
  '4 Van Aken (a)',
  '9 Oyen',
  '# een regel met # is commentaar, en een speler van ons mag alleen een rugnummer zijn',
  'Bank',
  '12 Nepper',
  'Wissels',
  '61 12 voor 9',
  'Doelpunten',
  '23 Oyen assist Van Aken',
  '45+1 Van Aken strafschop',
  '70 Joop Voorbeeldlaan eigen doelpunt',
  'Kaarten',
  '34 geel Van Aken',
  'Strafschoppen',
  '55 gemist 9',
  'Tegenstander',
  'Formatie: 4-4-2',
  'Opstelling',
  '1 Ruud Oefenman',
  '5 Joop Voorbeeldlaan (a)',
  '9 Piet Spits',
  'Doelpunten',
  '80 Piet Spits',
].join('\n')
