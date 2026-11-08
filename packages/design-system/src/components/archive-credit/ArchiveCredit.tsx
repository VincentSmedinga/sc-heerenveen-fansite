import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

/** How the credits name the archive of the old fansite, so each says it the same way. */
export const archiveName = 'het archief van de oude sc Heerenveen Fansite'

export type ArchiveCreditProps = Omit<ComponentPropsWithoutRef<'p'>, 'children'> & {
  /** A credit has no children: everything it shows comes from the props. */
  children?: never
  /**
   * What stands before the name instead of `Bron:`, such as `Gegevens van` in the strip under
   * the image of a card.
   */
  lead?: string
}

/**
 * The credit for matches that come from the archive of the old sc Heerenveen Fansite (1990 to
 * 2007): "Bron: het archief van de oude sc Heerenveen Fansite". It is principle 4 of the
 * Redactie ("Altijd de bron vermelden"), for a page or a card whose matches are all old. The
 * archive is ours, so there is no licence, page or link to name, and the credit is one line
 * that is always visible. A page with matches from Wikipedia as well uses `WikipediaCredit`
 * with `archive`, which names both.
 */
export const ArchiveCredit = ({ className, lead = 'Bron:', ...props }: ArchiveCreditProps) => (
  <p {...props} className={classNames('hf-meta', 'hf-archive-credit', className)}>
    {`${lead} ${archiveName}`}
  </p>
)
