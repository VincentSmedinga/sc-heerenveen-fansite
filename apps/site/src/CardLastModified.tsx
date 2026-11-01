import { LastModified } from '@fansite/design-system'

import { lastModifiedOfCard, type SourcedCard, type SourceVersion } from './card-sources'

/**
 * The last line of a card with data from an import: "Laatst gewijzigd: <datum>", the newest
 * moment that the sources of the card changed (see `cardSources`). The card names itself, and
 * the sources come from the page. A card without a moment gets no line. Put it after the data
 * of the card, not in the sentence that says there is none yet.
 */
export function CardLastModified({
  card,
  now,
  sources,
}: {
  card: SourcedCard
  now: Date
  sources: readonly SourceVersion[]
}) {
  const line = lastModifiedOfCard(card, sources, now)

  return line === undefined ? null : <LastModified dateTime={line.dateTime}>{line.text}</LastModified>
}
