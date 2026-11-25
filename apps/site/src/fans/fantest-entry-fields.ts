// What the form of the quiz of the month (a client component) shares with the server. This
// module imports nothing, so the form brings no database code to the browser.

/** The name of the hidden field with the version of the questions the form showed. */
export const versionField = 'versie'

/** A question as a supporter sees it while the month runs: without the right answer. */
export type MonthQuestion = { answers: [string, string, string, string]; position: number; text: string }
