import type { ReportedMatch, ReportedPlayerName } from '@fansite/db/match-reports'
import type { MatchLineupPlayer, MatchPlayerName, MatchTimelineEvent } from '@fansite/design-system'

import { type NameParts, personNameParts } from './player-name'

// What the page of a match shows, worked out from a report that has passed the rules: the
// events in the order of the clock, the line-ups with what happened to each player in words,
// and the facts under the result. The page only places them.

/** The name of our own club. */
export const ourClub = 'sc Heerenveen'

/** A minute as a visitor says it: "de 61e minuut", and "de 45e minuut (+2)" with added time. */
export function minuteWords(minute: number, stoppageMinutes: null | number) {
  return `de ${minute}e minuut${stoppageMinutes === null ? '' : ` (+${stoppageMinutes})`}`
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

/** The surname of a name, or the whole name when it has no surname: for a sentence. */
const shortName = (name: MatchPlayerName) => (name.surname === '' ? (name.givenName ?? '') : name.surname)

/**
 * The events of a report as the timeline shows them, in the order of the clock: goals, missed
 * and stopped penalties, cards and substitutions, and for two at the same moment in that order.
 * A goal is of the team that gets it, except an own goal: that has the team of the player who
 * scored it, so the line says whose player made it.
 */
export function eventsOf(reported: ReportedMatch): MatchTimelineEvent[] {
  const { names, stored } = reported
  const players = new Map(stored.appearances.map((player) => [player.id, player]))
  const nameOf = (id: number) => {
    const player = players.get(id)

    return player === undefined ? { surname: '' } : nameOfPlayer(player.name, names.get(id))
  }
  const teamOf = (ours: boolean) => (ours ? ourClub : reported.match.opponent)
  const events: MatchTimelineEvent[] = []

  for (const goal of stored.goals) {
    const scorer = goal.appearanceId === null ? undefined : players.get(goal.appearanceId)

    if (goal.appearanceId === null || scorer === undefined) {
      continue
    }

    const ours = goal.ownGoal ? scorer.ours : goal.ours

    events.push({
      ...(goal.assistAppearanceId === null ? {} : { assist: nameOf(goal.assistAppearanceId) }),
      kind: 'goal',
      minute: goal.minute,
      ours,
      ownGoal: goal.ownGoal,
      penalty: goal.penalty,
      player: nameOf(goal.appearanceId),
      stoppageMinutes: goal.stoppageMinutes,
      team: teamOf(ours),
    })
  }

  for (const incident of stored.incidents) {
    events.push({
      kind: incident.kind === 'strafschop-gemist' ? 'penalty-missed' : 'penalty-saved',
      minute: incident.minute,
      ours: incident.ours,
      player: nameOf(incident.appearanceId),
      stoppageMinutes: incident.stoppageMinutes,
      team: teamOf(incident.ours),
    })
  }

  for (const card of stored.cards) {
    events.push({
      kind: card.kind === 'geel' ? 'yellow-card' : card.kind === 'rood' ? 'red-card' : 'yellow-red-card',
      minute: card.minute,
      ours: card.ours,
      player: nameOf(card.appearanceId),
      stoppageMinutes: card.stoppageMinutes,
      team: teamOf(card.ours),
    })
  }

  for (const substitution of stored.substitutions) {
    events.push({
      kind: 'substitution',
      minute: substitution.minute,
      ours: substitution.ours,
      playerIn: nameOf(substitution.appearanceInId),
      playerOut: nameOf(substitution.appearanceOutId),
      stoppageMinutes: substitution.stoppageMinutes,
      team: teamOf(substitution.ours),
    })
  }

  // A stable sort keeps the order above for two events at the same moment. Added time of a half
  // comes before the next half, so 45+2 is earlier than 46.
  const clock = (event: MatchTimelineEvent) => event.minute + (event.stoppageMinutes ?? 0) / 100

  return events.toSorted((a, b) => clock(a) - clock(b))
}

const cardWords = { geel: 'Gele kaart', 'geel-rood': 'Geel-rode kaart', rood: 'Rode kaart' } as const

/**
 * The line-up and the bench of one team, with what happened to each player in sentences: the
 * substitution, with the surname of the other player, and the cards. The captain has the word
 * behind his name. A team that is not `complete` shows the players the report has.
 */
export function lineupOf(reported: ReportedMatch, ours: boolean) {
  const { names, stored } = reported
  const players = new Map(stored.appearances.map((player) => [player.id, player]))
  const nameOf = (id: number) => {
    const player = players.get(id)

    return player === undefined ? { surname: '' } : nameOfPlayer(player.name, names.get(id))
  }
  const player = (id: number): MatchLineupPlayer => {
    const found = players.get(id)!
    const notes: string[] = []
    const out = stored.substitutions.find((substitution) => substitution.appearanceOutId === id)
    const entered = stored.substitutions.find((substitution) => substitution.appearanceInId === id)

    if (entered !== undefined) {
      notes.push(
        `Ingevallen in ${minuteWords(entered.minute, entered.stoppageMinutes)} voor ${shortName(nameOf(entered.appearanceOutId))}`,
      )
    }

    if (out !== undefined) {
      notes.push(
        `Gewisseld in ${minuteWords(out.minute, out.stoppageMinutes)}, vervangen door ${shortName(nameOf(out.appearanceInId))}`,
      )
    }

    for (const card of stored.cards.filter((candidate) => candidate.appearanceId === id)) {
      notes.push(`${cardWords[card.kind]} in ${minuteWords(card.minute, card.stoppageMinutes)}`)
    }

    return { captain: found.captain, name: nameOf(id), notes, shirtNumber: found.shirtNumber }
  }
  const team = stored.appearances.filter((candidate) => candidate.ours === ours)

  return {
    bench: team.filter((candidate) => !candidate.starter).map((candidate) => player(candidate.id)),
    starters: team.filter((candidate) => candidate.starter).map((candidate) => player(candidate.id)),
  }
}
