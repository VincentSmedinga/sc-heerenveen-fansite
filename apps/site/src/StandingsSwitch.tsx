import { SegmentedLinks } from '@fansite/design-system'

import { type StandingsView, standingsViewQuery } from './standings-view'

/**
 * The switch of the card Stand between the table of the whole season (the default) and the
 * table over the latest five matches. Both choices are links to the same page, the second with
 * `?stand=laatste-5`, so the switch works without JavaScript and the choice is in the address.
 * `address` is the address of the page of the season, and `anchor` the id of the card, which
 * the links end on so the page does not jump to the top.
 */
export function StandingsSwitch({ address, anchor, view }: { address: string; anchor: string; view: StandingsView }) {
  return (
    <SegmentedLinks
      label="Welke stand"
      options={[
        { href: `${address}${standingsViewQuery('season')}#${anchor}`, label: 'Hele seizoen', value: 'season' },
        { href: `${address}${standingsViewQuery('last-five')}#${anchor}`, label: 'Laatste 5', value: 'last-five' },
      ]}
      size="small"
      value={view}
    />
  )
}
