// What the forms of the supporters in the admin are made of (issue 1458), with nothing the
// browser should not load: the forms are client components, and they import this file. The
// checks and the changes, which need the database package, are in `supporter-management.ts`.

/** The reasons for blocking an account, in the order the form lists them. */
export const blockReasons = [
  { label: 'Ongepaste schermnaam', value: 'schermnaam' },
  { label: 'Doet zich voor als een ander', value: 'nadoen' },
  { label: 'Misbruik van een spel', value: 'misbruik' },
  { label: 'Anders', value: 'anders' },
] as const

export type BlockReason = (typeof blockReasons)[number]['value']

/** The words that say why an account was blocked, for every reason but `anders`. */
export const blockReasonTexts: Readonly<Record<Exclude<BlockReason, 'anders'>, string>> = {
  misbruik: 'misbruik van een spel',
  nadoen: 'doet zich voor als een ander',
  schermnaam: 'ongepaste schermnaam',
}

/** The most characters of the explanation of the reason "anders". */
export const noteMaxLength = 300

/** What the form to block shows after a submit: the errors, and the values to put back. */
export type BlockFormState = {
  errors: { reden?: string; toelichting?: string }
  values: { reden: string; toelichting: string }
}

/** What the form to remove an address shows after a submit. */
export type ForgetFormState = { done?: 'none' | 'removed'; error?: string | undefined; value: string }

/** What the form to change the name shows after a submit. */
export type RenameFormState = { error?: string | undefined; value: string }

export const emptyBlockForm: BlockFormState = { errors: {}, values: { reden: '', toelichting: '' } }
