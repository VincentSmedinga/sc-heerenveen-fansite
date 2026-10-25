// What the form of an article is made of, with nothing the browser should not load: the form
// is a client component, and it imports this file. The checks that need the database package
// are in `article-form.ts`.

/** The names of the fields, which are also their `id`: an error links to the field with it. */
export const fieldNames = ['titel', 'adres', 'intro', 'tekst', 'auteur'] as const

export type ArticleErrors = Partial<Record<FieldName, string>>

/** What the form shows after a save: the errors, and the values to put back in the fields. */
export type ArticleFormState = { errors: ArticleErrors; values: ArticleValues }

/** What an editor filled in, as text. A field that was left out is an empty string. */
export type ArticleValues = Record<FieldName, string>

export type FieldName = (typeof fieldNames)[number]

export const emptyValues: ArticleValues = { adres: '', auteur: '', intro: '', tekst: '', titel: '' }

/** The longest address a proposal can be, the same as the column (`articleLimits.slug`). */
export const slugMaxLength = 80

/**
 * A proposal for the address from the title: lowercase letters and digits, accents dropped,
 * every other run of characters one hyphen, cut at the longest address on a hyphen when it can.
 * An empty result means the title has nothing an address can be made of, such as only emoji.
 */
export function suggestSlug(title: string, maxLength = slugMaxLength) {
  const slug = title
    .normalize('NFKD')
    .replaceAll(/\p{M}/gu, '')
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/gu, '-')
    .replaceAll(/^-+|-+$/gu, '')

  if (slug.length <= maxLength) {
    return slug
  }

  const cut = slug.slice(0, maxLength)
  const lastHyphen = cut.lastIndexOf('-')

  return (lastHyphen > 0 ? cut.slice(0, lastHyphen) : cut).replaceAll(/-+$/gu, '')
}
