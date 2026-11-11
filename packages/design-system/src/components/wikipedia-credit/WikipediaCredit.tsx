import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
import { Link } from '../link/Link'
import { Time } from '../time/Time'

/** How the credits name the sc Heerenveen Fansite, our own data, the same way each time. */
const archiveName = 'sc Heerenveen Fansite'

/** What the fold says when the editors entered some of the data. */
const editedSentence = 'Enkele gegevens heeft onze redactie zelf ingevuld of aangepast.'

/** What the fold says before the link to Wikidata. */
const wikidataSentence = 'Enkele spelers komen van'

/** The licence of Wikipedia and of our own match data. */
const licenceHref = 'https://creativecommons.org/licenses/by-sa/4.0/deed.nl'

/** Above this many pages the list gathers the pages of a season on one line. */
const groupFrom = 10

export type WikipediaCreditPage = {
  /** The address of the page on Wikipedia. */
  href: string
  /** What the link says, such as `Eredivisie 2026/27`. */
  name: string
}

export type WikipediaCreditProps =
  | (WikipediaCreditBaseProps<'details'> &
      (
        | {
            /**
             * The last time the pages were read, as a visitor reads it, in Dutch time, such as
             * `25 oktober 2026 om 14:05`. The component knows no time zone. Leave both out when
             * the time is not known, such as for a player whose article was not read yet: the
             * sentence about the reading then falls away.
             */
            readAt: string
            /** The same moment in a form a machine reads, such as `2026-10-25T12:05:00Z`. */
            readAtDateTime: string
          }
        | { readAt?: never; readAtDateTime?: never }
      ) & {
        /**
         * Whether some of the matches come from the sc Heerenveen Fansite as well. The
         * summary then names both, "Bron: Wikipedia en sc Heerenveen Fansite", and the fold
         * says that the older matches are from the sc Heerenveen Fansite.
         */
        archive?: boolean
        compact?: false
        /**
         * What our own data from these pages is called in the last sentence, "Onze
         * wedstrijdgegevens zijn ook CC BY-SA 4.0." Without it, it is `wedstrijdgegevens`. A
         * page with other data, such as the squad, gives the plural of its own word,
         * `selectiegegevens`.
         */
        data?: string
        /**
         * Whether our own editors filled in or corrected some of the data themselves. The
         * fold then says so, "Enkele gegevens heeft onze redactie zelf ingevuld of aangepast."
         */
        edited?: boolean
        lead?: never
        /** The Wikipedia pages the data comes from, at least one. */
        pages: [WikipediaCreditPage, ...WikipediaCreditPage[]]
        /**
         * Whether some of the players come from Wikidata, for the page Spelers. The fold then
         * says so, with the licence (CC0), which asks for no credit.
         */
        wikidata?: boolean
      })
  | (WikipediaCreditBaseProps<'p'> & {
      /** Whether some of the matches come from the sc Heerenveen Fansite as well. */
      archive?: boolean
      /** The short form, "Bron: Wikipedia", for a small card. It takes `lead` and `archive`. */
      compact: true
      data?: never
      edited?: never
      /**
       * What stands before "Wikipedia" instead of `Bron:`, such as `Gegevens van` in the strip
       * under the image of a card.
       */
      lead?: string
      pages?: never
      readAt?: never
      readAtDateTime?: never
      wikidata?: never
    })

type WikipediaCreditBaseProps<Tag extends 'details' | 'p'> = Omit<ComponentPropsWithoutRef<Tag>, 'children'> & {
  /** A credit has no children: everything it shows comes from the props below. */
  children?: never
}

/**
 * The pages grouped by the season their name ends with, in the order of the first page of each
 * season: `Eredivisie 2024/25` and `KNVB Beker 2024/25` become `2024/25` with `Eredivisie` and
 * `KNVB Beker`. It is undefined when a name has no season to end with, so the list stays flat.
 */
function bySeason(pages: readonly WikipediaCreditPage[]) {
  const seasons = new Map<string, { label: string; page: WikipediaCreditPage }[]>()

  for (const page of pages) {
    const [, label, season] = /^(.*\S) (\d{4}\/\d{2})$/u.exec(page.name) ?? []

    if (label === undefined || season === undefined) {
      return undefined
    }
    seasons.set(season, [...(seasons.get(season) ?? []), { label, page }])
  }

  return [...seasons]
}

/**
 * The credit for data from Wikipedia. The full form is a `details` that is closed: it says
 * "Bron: Wikipedia", and one click or press shows the licence (CC BY-SA 4.0), a link to each
 * page the data comes from, the time of the last reading when it is known, and a sentence that
 * our own data from them are CC BY-SA 4.0 too: the match data, or what `data` names. It is
 * closed for one page as well as for fifty, so there is one form to learn and a long list,
 * such as that of the opponents, does not make the credit longer than the page. The short form
 * (`compact`) says only "Bron: Wikipedia", for a small card on a page that has the full form
 * elsewhere.
 * It is principle 4 of the Redactie ("Altijd de bron vermelden"), and it is a component so
 * that a page with Wikipedia data can't leave it out. The link to a page names the page, which
 * is the credit to its authors: their names are one click away in the history of the article.
 * The links go to another site and are never fetched by the page. The `summary` holds no link,
 * so a click on it does one thing.
 */
export const WikipediaCredit = ({
  archive = false,
  className,
  compact,
  data = 'wedstrijdgegevens',
  edited = false,
  lead = 'Bron:',
  pages,
  readAt,
  readAtDateTime,
  wikidata = false,
  ...props
}: WikipediaCreditProps) =>
  compact ? (
    <p
      {...(props as ComponentPropsWithoutRef<'p'>)}
      className={classNames('hf-meta', 'hf-wikipedia-credit', className)}
    >
      {`${lead} Wikipedia${archive ? ` en ${archiveName}` : ''}`}
    </p>
  ) : (
    <details
      {...(props as ComponentPropsWithoutRef<'details'>)}
      className={classNames('hf-meta', 'hf-wikipedia-credit', className)}
    >
      <summary>
        {`Bron: Wikipedia${archive ? ` en ${archiveName}` : ''}`}
        <Icon name="arrow-down" />
      </summary>
      <p>
        Licentie: <Link href={licenceHref}>CC BY-SA 4.0</Link>. {pages.length === 1 ? 'Pagina' : 'Pagina’s'}:{' '}
        {(pages.length > groupFrom ? bySeason(pages) : undefined)?.map(([season, group], index) => (
          <span key={season}>
            {index > 0 ? '; ' : ''}
            {season}:{' '}
            {group.map(({ label, page }, position) => (
              <span key={page.href}>
                {position > 0 ? ', ' : ''}
                <Link aria-label={page.name} href={page.href}>
                  {label}
                </Link>
              </span>
            ))}
          </span>
        )) ??
          pages.map((page, index) => (
            <span key={page.href}>
              {index > 0 ? ', ' : ''}
              <Link href={page.href}>{page.name}</Link>
            </span>
          ))}
        .
        {readAt === undefined ? null : (
          <>
            {' '}
            Laatst gelezen op <Time dateTime={readAtDateTime}>{readAt}</Time>.
          </>
        )}{' '}
        Onze {data} zijn ook CC BY-SA 4.0.
        {archive ? ` Oudere wedstrijden komen van de ${archiveName}.` : ''}
        {edited ? ` ${editedSentence}` : ''}
        {wikidata ? (
          <>
            {' '}
            {wikidataSentence} <Link href="https://www.wikidata.org/">Wikidata</Link> (CC0).
          </>
        ) : null}
      </p>
    </details>
  )
