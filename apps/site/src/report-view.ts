import type { ReportedMatch, ReportedPlayerName } from '@fansite/db/match-reports'
import type { MatchHeaderFact, MatchPlayerName } from '@fansite/design-system'

import { oldSiteReportSource } from '@fansite/db/schema'

import type { MatchPageData } from './match-page'

import { type NameParts, personNameParts } from './player-name'

// What the page of a match shows, taken from a report that has passed the rules: the plain data
// of `match-page.ts`, with the names of the players in the two parts `PlayerName` shows.

export { ourClub } from './match-page'

/**
 * The data of the page of a match from a stored report that has passed the rules. The players
 * are in the order the form had them: the report keeps them in the order of their rows.
 */
export function matchPageDataOf(reported: ReportedMatch, facts: MatchHeaderFact[], complete: boolean): MatchPageData {
  const { match, names, stored } = reported
  const players = new Map(stored.appearances.map((player) => [player.id, player]))

  return {
    afterNinety:
      match.afterNinetyFor !== null && match.afterNinetyAgainst !== null
        ? { against: match.afterNinetyAgainst, for: match.afterNinetyFor }
        : null,
    cards: stored.cards.map((card) => ({
      kind: card.kind,
      minute: card.minute,
      playerId: card.appearanceId,
      stoppageMinutes: card.stoppageMinutes,
    })),
    complete,
    extraTime: match.extraTime,
    facts,
    formationOursDerived:
      stored.report.formationOurs !== null &&
      stored.report.source === oldSiteReportSource &&
      stored.report.savedBy === null,
    formations: { opponent: stored.report.formationOpponent, ours: stored.report.formationOurs },
    goals: stored.goals.flatMap((goal) =>
      goal.appearanceId === null || !players.has(goal.appearanceId)
        ? []
        : [
            {
              assistId: goal.assistAppearanceId,
              minute: goal.minute,
              ours: goal.ours,
              ownGoal: goal.ownGoal,
              penalty: goal.penalty,
              playerId: goal.appearanceId,
              stoppageMinutes: goal.stoppageMinutes,
            },
          ],
    ),
    goalsAgainst: match.goalsAgainst ?? 0,
    goalsFor: match.goalsFor ?? 0,
    home: match.home,
    incidents: stored.incidents.map((incident) => ({
      kind: incident.kind,
      minute: incident.minute,
      playerId: incident.appearanceId,
      stoppageMinutes: incident.stoppageMinutes,
    })),
    kicks: stored.shootout.map((kick) => ({
      ours: kick.ours,
      playerId: kick.appearanceId,
      result: kick.outcome,
      round: kick.round,
    })),
    opponent: match.opponent,
    opponentComplete: stored.report.opponentComplete,
    penalties:
      match.penaltiesFor !== null && match.penaltiesAgainst !== null
        ? { against: match.penaltiesAgainst, for: match.penaltiesFor }
        : null,
    players: stored.appearances.map((player) => ({
      captain: player.captain,
      id: player.id,
      name: nameOfPlayer(player.name, names.get(player.id)),
      ours: player.ours,
      shirtNumber: player.shirtNumber,
      starter: player.starter,
    })),
    substitutions: stored.substitutions.map((substitution) => ({
      inId: substitution.appearanceInId,
      minute: substitution.minute,
      outId: substitution.appearanceOutId,
      stoppageMinutes: substitution.stoppageMinutes,
    })),
  }
}

/**
 * The name of a player of the report in the two parts `PlayerName` shows. A player of ours
 * takes the name the importer kept of his person, and otherwise the search term of his row in
 * `players` as the surname when the name ends with it. A player of the opponent, or one we know
 * no parts of, is one name in the normal weight: nothing is guessed.
 */
export function nameOfPlayer(name: string, known: ReportedPlayerName | undefined): MatchPlayerName {
  if (known === undefined) {
    return { givenName: name, surname: '' }
  }

  const kept: NameParts | undefined = personNameParts({
    personFamilyName: known.familyName,
    personFamilyNamePrefix: known.familyNamePrefix,
    personGivenName: known.givenName,
  })

  if (kept !== undefined) {
    return kept
  }

  const term = known.searchTerm

  if (term !== null && term !== '' && name.endsWith(term)) {
    const given = name.slice(0, name.length - term.length).trim()

    return given === '' ? { surname: term } : { givenName: given, surname: term }
  }

  return { givenName: name, surname: '' }
}
