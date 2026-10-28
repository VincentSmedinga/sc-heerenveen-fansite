import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'
import { Link } from '../link/Link'
import { Time } from '../time/Time'

/** The licence of Wikipedia and of our own match data. */
const licenceHref = 'https://creativecommons.org/licenses/by-sa/4.0/deed.nl'

export type WikipediaCreditPage = {
  /** The address of the page on Wikipedia. */
  href: string
  /** What the link says, such as `Eredivisie 2026/27`. */
  name: string
}

export type WikipediaCreditProps =
  | (WikipediaCreditBaseProps & {
      /** The short form, "Bron: Wikipedia", for a small card. It takes only `lead` besides. */
      compact: true
      data?: never
      /**
       * What stands before "Wikipedia" instead of `Bron:`, such as `Gegevens van` in the strip
       * under the image of a card.
       */
      lead?: string
      pages?: never
      readAt?: never
      readAtDateTime?: never
    })
  | (WikipediaCreditBaseProps & {
      compact?: false
      /**
       * What our own data from these pages is called in the last sentence, "Onze
       * wedstrijdgegevens zijn ook CC BY-SA 4.0." Without it, it is `wedstrijdgegevens`. A
       * page with other data, such as the squad, gives the plural of its own word,
       * `selectiegegevens`.
       */
      data?: string
      lead?: never
      /** The Wikipedia pages the data comes from, at least one. */
      pages: [WikipediaCreditPage, ...WikipediaCreditPage[]]
      /**
       * The last time the pages were read, as a visitor reads it, in Dutch time, such as `25
       * oktober 2026 om 14:05`. The component knows no time zone.
       */
      readAt: string
      /** The same moment in a form a machine reads, such as `2026-10-25T12:05:00Z`. */
      readAtDateTime: string
    })

type WikipediaCreditBaseProps = Omit<ComponentPropsWithoutRef<'p'>, 'children'> & {
  /** A credit has no children: everything it shows comes from the props below. */
  children?: never
}

/**
 * The credit for data from Wikipedia. The full form says "Bron: Wikipedia (CC BY-SA 4.0)", with
 * a link to each page the data comes from, the time of the last reading, and a sentence that
 * our own data from them are CC BY-SA 4.0 too: the match data, or what `data` names. The short
 * form (`compact`) says only "Bron: Wikipedia", for a small card on a page that has the full
 * form elsewhere. It is principle 4 of the Redactie ("Altijd de bron vermelden"), and it is a
 * component so that a page with Wikipedia data can't leave it out. The link to a page names
 * the page, which is the credit to its authors: their names are one click away in the history
 * of the article. The links go to another site and are never fetched by the page.
 */
export const WikipediaCredit = ({
  className,
  compact,
  data = 'wedstrijdgegevens',
  lead = 'Bron:',
  pages,
  readAt,
  readAtDateTime,
  ...props
}: WikipediaCreditProps) => (
  <p {...props} className={classNames('hf-meta', 'hf-wikipedia-credit', className)}>
    {compact ? (
      `${lead} Wikipedia`
    ) : (
      <>
        Bron: Wikipedia (<Link href={licenceHref}>CC BY-SA 4.0</Link>), {pages.length === 1 ? 'pagina' : 'pagina’s'}:{' '}
        {pages.map((page, index) => (
          <span key={page.href}>
            {index > 0 ? ', ' : ''}
            <Link href={page.href}>{page.name}</Link>
          </span>
        ))}
        . Laatst gelezen op <Time dateTime={readAtDateTime}>{readAt}</Time>. Onze {data} zijn ook CC BY-SA 4.0.
      </>
    )}
  </p>
)
