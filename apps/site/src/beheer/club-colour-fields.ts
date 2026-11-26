// What the form of the colour of a club in the admin (#1677) sends and shows, for the server
// and the browser.

/** The three choices: the list in the code, an own colour, or none. */
export const clubColourModes = ['lijst', 'eigen', 'geen'] as const

export type ClubColourMode = (typeof clubColourModes)[number]

/**
 * What the form shows after a choice: `saved` says what the club has now, `error` why nothing
 * was saved and `field` which of the two controls it is about, and `mode` and `colour` are
 * what the editor chose, so the form still shows them after an error.
 */
export type ClubColourState = {
  colour?: string
  error?: string
  field?: 'keuze' | 'kleur'
  mode?: string
  saved?: string
}

export const colourModeId = 'kleur-keuze'
export const colourFieldId = 'eigen-kleur'
