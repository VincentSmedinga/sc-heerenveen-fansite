import type { PublicMatch } from '@fansite/db/queries'

import { type CompetitionChoice, competitionChoices, competitionQuery, leagueLabel } from './competition'
import { competitionOptionsOf } from './matches'
import { SwitchLinks } from './SwitchLinks'

/**
 * The links of the switch, for a page that knows itself what there is to choose, such as the
 * pages of the opponents, which count the matches of every season. `options` are the choices to
 * show, `all` first (see `optionsOf`); the switch is left out when there are none. Each choice
 * is a link to the same page with `?competitie=` (`all` has none), so the switch works without
 * JavaScript and the choice is in the address. `address` is the address of the page without the
 * choice, and `league` what the league is called: `Eredivisie`, `Eerste divisie` in the seasons
 * played there, and `Competitie` for matches of both (see `leagueLabel`).
 */
export function CompetitionLinks({
  address,
  competition,
  league = 'Eredivisie',
  options,
}: {
  address: string
  competition: CompetitionChoice
  league?: string
  options: readonly CompetitionChoice[]
}) {
  if (options.length === 0) {
    return null
  }

  return (
    <SwitchLinks
      compact
      label="Welke wedstrijden"
      options={competitionChoices
        .filter(({ choice }) => options.includes(choice))
        .map(({ choice, label }) => ({
          href: `${address}${competitionQuery(choice)}`,
          label: choice === 'league' ? league : label,
          value: choice,
        }))}
      value={competition}
    />
  )
}

/**
 * The switch of the pages of a season between every match and the league, the cup or Europe,
 * each only when the season has a played match in it (see `competitionOptionsOf`). Without
 * anything to choose, there is no switch.
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
  return (
    <CompetitionLinks
      address={address}
      competition={competition}
      league={leagueLabel(matches.map((match) => match.competition))}
      options={competitionOptionsOf(matches)}
    />
  )
}
