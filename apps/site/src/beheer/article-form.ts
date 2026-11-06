import { articleLimits } from '@fansite/db/schema'
import { type ArticleDocumentProblem, readArticleDocument } from '@fansite/shared/article-document'

import { type ArticleErrors, type ArticleValues, suggestSlug } from './article-fields'

// What an editor types in the form of an article: read as text, cleaned, and checked. The
// server does this again for every request, whatever the browser did.

/**
 * The most characters of the visible text of an article, not counting the JSON around it. The
 * column holds far more, and `readArticleDocument` has a limit for the JSON itself.
 */
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
  'nieuws',
  'over-ons',
  'podcasts',
  'privacy',
  'redactie',
  'robots',
  'sitemap',
  'spelers',
  'statistieken',
  'tegenstanders',
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
 * What is wrong with the text, for each way `readArticleDocument` can refuse it. The first two
 * can only happen when something other than the editor sent the text, so they say what to do
 * and nothing more.
 */
const bodyProblems: Record<ArticleDocumentProblem, string> = {
  component:
    'De tekst bevat iets wat in een artikel niet kan. Gebruik alleen alinea’s, koppen, lijsten, vet, cursief en links.',
  link: 'Een link wijst naar een adres dat niet kan. Een link begint met https:// of met een schuine streep, zoals /bronnen.',
  'too-large': 'De tekst is te groot om te bewaren. Maak hem korter.',
  unreadable: 'De tekst is niet goed aangekomen. Laad de pagina opnieuw en probeer het nog een keer.',
}

/**
 * The values of a form, as the form sends them: text, or nothing if a field is missing or is
 * not text. An empty address becomes the proposal from the title. The text of the article is
 * the JSON of the editor; when it is valid it is the form that gets stored, with the keys in
 * their fixed order, and when it isn't it stays as it was sent, so the form can give it back.
 */
export function readValues(formData: FormData): ArticleValues {
  const text = (name: string) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value : ''
  }

  const titel = line(text('titel'))
  const body = readArticleDocument(text('tekst'))

  return {
    adres: text('adres').trim() || suggestSlug(titel, articleLimits.slug),
    auteur: line(text('auteur')),
    intro: line(text('intro')),
    tekst: body.ok ? body.json : text('tekst'),
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

  const body = readArticleDocument(tekst)

  if (tekst.trim() === '' || (body.ok && !body.hasText)) {
    errors.tekst = 'Schrijf de tekst van het artikel.'
  } else if (!body.ok) {
    errors.tekst = bodyProblems[body.problem]
  } else if (body.textLength > bodyMaxLength) {
    errors.tekst = `De tekst is te lang. Gebruik hoogstens ${numberOf.format(bodyMaxLength)} tekens, nu zijn het er ${numberOf.format(body.textLength)}.`
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
