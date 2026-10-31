import type { PublicMatch } from '@fansite/db/queries'

import { SegmentedLinks } from '@fansite/design-system'

import { type CompetitionChoice, competitionParam, competitionQuery, leagueValue } from './competition'
import { hasPlayedCupMatch } from './matches'

/**
 * The two links of the switch, for a page that knows itself whether there is anything to
 * choose, such as the pages of the opponents, which count the matches of every season.
 */
export function CompetitionLinks({ address, competition }: { address: string; competition: CompetitionChoice }) {
  return (
    <SegmentedLinks
      label="Welke wedstrijden"
      options={[
        { href: address, label: 'Alle wedstrijden', value: 'all' },
        { href: `${address}${competitionQuery('league')}`, label: 'Eredivisie', value: 'league' },
      ]}
      size="small"
      value={competition}
    />
  )
}

/**
 * The switch of the statistics pages between all the matches (the Eredivisie and the KNVB
 * Beker, the default) and the Eredivisie alone. Both choices are links to the same page, the
 * second with `?competitie=eredivisie`, so the switch works without JavaScript and the choice
 * is in the address. `address` is the address of the page of the season without the choice. The
 * switch is only there when the season has a played cup tie: without one, the two choices count
 * the same matches and there is nothing to choose.
 */
export function CompetitionSwitch({
  address,
  competition,
  matches,
}: {
  address: string
  competition: CompetitionChoice
  matches: PublicMatch[]
}) {
  return hasPlayedCupMatch(matches) ? <CompetitionLinks address={address} competition={competition} /> : null
}

/** What the season picker sends with the season to keep the choice (see `SeasonPicker`). */
export const competitionFields = (competition: CompetitionChoice): Record<string, string> =>
  competition === 'league' ? { [competitionParam]: leagueValue } : {}
