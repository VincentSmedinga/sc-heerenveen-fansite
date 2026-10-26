import { articleLimits } from '@fansite/db/schema'

import { type ArticleErrors, type ArticleValues, suggestSlug } from './article-fields'

// What an editor types in the form of an article: read as text, cleaned, and checked. The
// server does this again for every request, whatever the browser did.

/** The most characters of the text of an article. The column holds far more. */
export const bodyMaxLength = 20_000

/**
 * The addresses an article may not take: the first part of the address of every page of the
 * site and of the admin. An article lives at `/redactie/<address>`, so none of these could
 * collide today, but an address like `beheer` or `privacy` would look like another page and
 * block that page if the articles ever move to the top. `article-form.test.ts` fails when the
 * site gets a page that is not in the list.
 */
export const reservedSlugs: readonly string[] = [
  'api',
  'beheer',
  'bronnen',
  'contact',
  'icon',
  'manifest',
  'over-ons',
  'podcasts',
  'privacy',
  'redactie',
  'robots',
  'sitemap',
  'toegankelijkheid',
  'updates',
  'wedstrijden',
  'zoeken',
]

const lengthOf = (value: string) => [...value].length

const numberOf = new Intl.NumberFormat('nl-NL')

/** A line of text: control characters and runs of spaces become one space, and the ends go. */
const line = (value: string) => value.replaceAll(/[\p{Cc}\s]+/gu, ' ').trim()

/**
 * The text of an article as the form sends it: line breaks are `\n` (a browser sends `\r\n`),
 * every control character other than a line break or a tab is gone, and the ends are trimmed.
 * What is left is what the editor typed, so saving and opening the article again changes
 * nothing.
 */
export function cleanBody(value: string) {
  return value
    .replaceAll(/\r\n|[\r\u2028\u2029]/gu, '\n')
    .replaceAll(/[^\P{Cc}\n\t]/gu, '')
    .trim()
}

/**
 * The values of a form, as the form sends them: text, or nothing if a field is missing or is
 * not text. An empty address becomes the proposal from the title.
 */
export function readValues(formData: FormData): ArticleValues {
  const text = (name: string) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value : ''
  }

  const titel = line(text('titel'))

  return {
    adres: text('adres').trim() || suggestSlug(titel, articleLimits.slug),
    auteur: line(text('auteur')),
    intro: line(text('intro')),
    tekst: cleanBody(text('tekst')),
    titel,
  }
}

/**
 * Checks the values and returns an error in words for each field that is wrong: what is wrong
 * and how to put it right. No errors means the values fit in the table. The values must be as
 * `readValues` gives them. That the address is free, and that a published article keeps its
 * address, only the database knows (see `articles.ts`).
 */
export function validate({ adres, auteur, intro, tekst, titel }: ArticleValues): ArticleErrors {
  const errors: ArticleErrors = {}

  if (titel === '') {
    errors.titel = 'Schrijf een titel.'
  } else if (lengthOf(titel) > articleLimits.title) {
    errors.titel = `De titel is te lang. Gebruik hoogstens ${articleLimits.title} tekens, nu zijn het er ${lengthOf(titel)}.`
  }

  if (adres === '') {
    errors.adres = 'Schrijf een adres, zoals “welkom-bij-de-fansite”.'
  } else if (lengthOf(adres) > articleLimits.slug) {
    errors.adres = `Het adres is te lang. Gebruik hoogstens ${articleLimits.slug} tekens, nu zijn het er ${lengthOf(adres)}.`
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(adres)) {
    errors.adres =
      'Gebruik alleen kleine letters, cijfers en enkele streepjes, zonder spaties of accenten, zoals “welkom-bij-de-fansite”.'
  } else if (reservedSlugs.includes(adres)) {
    errors.adres = 'Dit adres hoort bij een andere pagina van de site. Kies een ander adres.'
  }

  if (intro === '') {
    errors.intro = 'Schrijf een intro, van een of twee zinnen.'
  } else if (lengthOf(intro) > articleLimits.intro) {
    errors.intro = `De intro is te lang. Gebruik hoogstens ${articleLimits.intro} tekens, nu zijn het er ${lengthOf(intro)}.`
  }

  if (tekst === '') {
    errors.tekst = 'Schrijf de tekst van het artikel.'
  } else if (lengthOf(tekst) > bodyMaxLength) {
    errors.tekst = `De tekst is te lang. Gebruik hoogstens ${numberOf.format(bodyMaxLength)} tekens, nu zijn het er ${numberOf.format(lengthOf(tekst))}.`
  }

  if (auteur === '') {
    errors.auteur = 'Schrijf de naam die bij het artikel staat, bijvoorbeeld “de redactie”.'
  } else if (lengthOf(auteur) > articleLimits.author) {
    errors.auteur = `De naam is te lang. Gebruik hoogstens ${articleLimits.author} tekens, nu zijn het er ${lengthOf(auteur)}.`
  }

  return errors
}

/** The errors only the database can find, in the words of the form. */
export const databaseErrors = {
  locked:
    'Dit artikel is gepubliceerd, dus het adres kan niet meer veranderen. Trek het artikel eerst in als het toch moet.',
  taken: 'Een ander artikel heeft dit adres al. Kies een ander adres.',
} as const
