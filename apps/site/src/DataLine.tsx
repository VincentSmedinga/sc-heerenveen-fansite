import { Text } from '@fansite/design-system'

const numberFormat = new Intl.NumberFormat('nl-NL')

/**
 * What limits the data of a card, as one short line at the end of the card, after the content
 * and the legend and before the link to more and the credit: "Alleen de Eredivisie, 13 van de
 * 14 gespeelde wedstrijden". Complete data are the default and say nothing, so without a limit
 * it shows nothing. Every limit of a card goes in this one line.
 */
export function DataLine({ limits }: { limits: readonly (false | null | string | undefined)[] }) {
  const words = limits.filter((limit): limit is string => typeof limit === 'string' && limit !== '')

  if (words.length === 0) return null

  const line = words.join(', ')

  return <Text appearance="meta">{`${line.charAt(0).toUpperCase()}${line.slice(1)}`}</Text>
}

/** The limit of a card that counts `known` of the `played` matches, or nothing for all. */
export const incompleteMatches = (known: number, played: number) =>
  known === played
    ? undefined
    : `${numberFormat.format(known)} van de ${numberFormat.format(played)} gespeelde wedstrijden`
