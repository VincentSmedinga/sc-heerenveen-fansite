// The match report of a match of the old fansite, worked out from the files: the players
// of both teams, the substitutions, the cards and the links from goals and assists to the
// players. It is pure: it reads no database, so the tests can cover every rule, and the
// check report (#880) can read the same result as the step `opstellingen` does. The step
// that stores it is in `old-site-lineups.ts`.
import type { CardKind, MatchReport, ReportCheck, ReportMatch } from '@fansite/shared/match-report'

import { playerNameMaxLength } from '@fansite/db/schema'
import { checkMatchReport } from '@fansite/shared/match-report'

import type { OldSiteEvent, OldSiteLine, OldSiteMatch, OldSitePlayer } from './old-site-file.ts'
import type { DerivedOldSiteGoal } from './old-site-goals.ts'

import { deriveOldSiteFormation } from './old-site-formation.ts'
import { cleanOldSiteName } from './old-site-names.ts'
import { isOurCode, oldSitePlayerKey, resolveOldSiteCode } from './old-site-players.ts'

/** The last minute the database accepts for a substitution or a card. */
const lastMinute = 120

/** A player in the line-up of a match, ours or the opponent's. */
export type DerivedOldSiteAppearance = {
  /** The line of a player of ours in the old table (`line` of the players file), else null. */
  line: null | OldSiteLine
  /** The minute he came on, 0 for a player in the line-up. */
  minuteIn: number
  /** The minute he went off, as the file has it. */
  minuteOut: number
  name: string
  ours: boolean
  /** The key of a player of ours in `players` (`oldSitePlayerKey`), else null. */
  playerKey: null | string
  starter: boolean
}

/** A card, pointing to a player by his place in `appearances`. */
export type DerivedOldSiteCard = {
  appearance: number
  kind: CardKind
  /** Empty for a yellow card whose minute the old fansite did not know. */
  minute: null | number
}

/** A goal of the match with the place of the scorer and of the assist in `appearances`. */
export type DerivedOldSiteGoalLink = { appearance: null | number; assist: null | number }

export type DerivedOldSiteReport = {
  anomalies: OldSiteReportAnomaly[]
  appearances: DerivedOldSiteAppearance[]
  cards: DerivedOldSiteCard[]
  /**
   * The formation of our team when the order of the eleven starters and their lines agree
   * (`deriveOldSiteFormation`), else null.
   */
  formationOurs: null | string
  /** One for each goal that was given, in the same order. */
  goalLinks: DerivedOldSiteGoalLink[]
  notes: OldSiteReportNote[]
  /** True when the opponent has exactly eleven players in the line-up. */
  opponentComplete: boolean
  substitutions: DerivedOldSiteSubstitution[]
}

/** A substitution, pointing to the players by their place in `appearances`. */
export type DerivedOldSiteSubstitution = {
  in: number
  minute: number
  ours: boolean
  out: number
}

/** The goals of a match, each with its event, in the order the goals are stored. */
export type OldSiteGoalWithEvent = { event: OldSiteEvent; goal: DerivedOldSiteGoal }

/**
 * What a notice is about, as data: the check report (#880) words it in Dutch from this, since
 * `text` is the English line of the log. `subject` is the player (or the code or the assist)
 * it names, `minute` the minute it speaks of, `kind` the kind of card or goal or the reason,
 * and `other` the scorer of the goal it belongs to.
 */
export type OldSiteReportAbout = { kind?: string; minute?: null | number; other?: string; subject: string }

export type OldSiteReportAnomaly = { about: OldSiteReportAbout; code: OldSiteReportAnomalyCode; text: string }

/**
 * Why a report stays `bezig` although the rules of a report do not mind, or what was left
 * out. `duplicate-player`: a name twice in a team, the second is left out. `early-exit`: a
 * player goes off before the end without a substitute and without a red card.
 * `no-player-row`: a player of ours has no row in `players`. `no-substitute-out`: a
 * substitute whom nobody replaces.
 * `red-card-without-minute`: a red or yellow-red card that has no minute and no minute of
 * leaving, so it is left out. `unusable-minute`: a minute that the database does not accept.
 */
export type OldSiteReportAnomalyCode =
  | 'duplicate-player'
  | 'early-exit'
  | 'no-player-row'
  | 'no-substitute-out'
  | 'red-card-without-minute'
  | 'unusable-minute'

export type OldSiteReportNote = { about: OldSiteReportAbout; code: OldSiteReportNoteCode; text: string }

/**
 * What was left out of the report or added to it, and does not make it `bezig`, each with a
 * line. `yellow-derived`: a yellow-red card whose player has no yellow card in the match gets
 * one, without a minute, because a yellow-red card is a second yellow card.
 */
export type OldSiteReportNoteCode =
  'assist-empty' | 'assist-not-found' | 'card-not-in-lineup' | 'card-twice' | 'goal-scorer-not-found' | 'yellow-derived'

/** A name as the report compares it: without accents, capitals and punctuation. */
export function looseNameKey(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/** The name in a field of the file with single spaces, and the owner's spelling of it. */
const cleanName = cleanOldSiteName

/** What the rules of a report make of it. */
export type OldSiteReportVerdict = {
  check: ReportCheck
  /** `klaar` when the rules find no error and nothing is left out or doubtful. */
  status: 'bezig' | 'klaar'
}

/** A goal as it is stored, for the check of the rules. */
export type OldSiteStoredGoal = { minute: null | number; ours: boolean; ownGoal: boolean; penalty: boolean }

/**
 * The report of a match with a line-up. `season` is the season of the match (`1999/00`),
 * `extraTime` says whether it had extra time. `goals` are the goals as the step `doelpunten`
 * stores them, or none when that step stores none. `hasPlayerRow` says whether a player of ours
 * has a row in `players` for the season.
 */
export function deriveOldSiteReport(
  match: OldSiteMatch,
  {
    extraTime,
    goals,
    hasPlayerRow,
    oldPlayers,
    season,
  }: {
    extraTime: boolean
    goals: readonly OldSiteGoalWithEvent[]
    hasPlayerRow: (playerKey: string) => boolean
    oldPlayers: ReadonlyMap<string, OldSitePlayer>
    season: string
  },
): DerivedOldSiteReport {
  const anomalies: OldSiteReportAnomaly[] = []
  const notes: OldSiteReportNote[] = []
  const appearances: DerivedOldSiteAppearance[] = []
  const found = new Map<string, number>()

  // The players, in the order of the file. A name twice in a team is left out the second time.
  for (const entry of match.lineup) {
    const player = isOurCode(entry.playerCode) ? resolveOldSiteCode(entry.playerCode, oldPlayers, season) : undefined
    const ours = player !== undefined
    const name = player === undefined ? cleanName(entry.playerName ?? entry.playerCode) : player.name

    if (isOurCode(entry.playerCode) && player === undefined) {
      anomalies.push({
        about: { kind: 'code', subject: entry.playerCode! },
        code: 'no-player-row',
        text: `the code '${entry.playerCode}' in the line-up is not a player`,
      })
      continue
    }
    if (name === '' || name.length > playerNameMaxLength) {
      anomalies.push({
        about: { kind: name === '' ? 'no-name' : 'long-name', subject: name },
        code: 'no-player-row',
        text: name === '' ? 'a player in the line-up has no name' : `the name '${name}' is too long`,
      })
      continue
    }

    const playerKey = ours ? oldSitePlayerKey(season, name) : null

    if (playerKey !== null && !hasPlayerRow(playerKey)) {
      anomalies.push({
        about: { kind: 'no-row', subject: name },
        code: 'no-player-row',
        text: `${name} has no row in players for ${season}`,
      })
      continue
    }
    if (entry.minuteIn > lastMinute || entry.minuteOut > lastMinute) {
      anomalies.push({
        about: { kind: 'lineup', subject: name },
        code: 'unusable-minute',
        text: `${name} comes on or goes off after minute ${lastMinute}`,
      })
      continue
    }

    const key = `${ours ? 'ours' : 'theirs'}|${looseNameKey(name)}`

    if (found.has(key)) {
      anomalies.push({
        about: { subject: name },
        code: 'duplicate-player',
        text: `${name} is twice in the line-up, the second is left out`,
      })
      continue
    }

    found.set(key, appearances.length)
    appearances.push({
      line: player === undefined ? null : (oldPlayers.get(player.code)?.line ?? null),
      minuteIn: entry.minuteIn,
      minuteOut: entry.minuteOut,
      name,
      ours,
      playerKey,
      starter: entry.minuteIn === 0,
    })
  }

  const cards = deriveCards(match, season, oldPlayers, appearances, found, anomalies, notes)
  const substitutions = deriveSubstitutions(appearances, cards, extraTime, anomalies)

  return {
    anomalies,
    appearances,
    cards,
    formationOurs: deriveOldSiteFormation(appearances.filter((one) => one.ours && one.starter).map((one) => one.line)),
    goalLinks: goals.map(({ event, goal }) => linkGoal(event, goal, season, oldPlayers, appearances, found, notes)),
    notes,
    opponentComplete: appearances.filter((one) => !one.ours && one.starter).length === 11,
    substitutions,
  }
}

/**
 * Runs the rules of `@fansite/shared/match-report` on the report, as they would run on the
 * stored report, and gives the status. `goals` are the goals of the match as stored, in the
 * order of `links`; a goal without a link has no player.
 */
export function judgeOldSiteReport(
  report: DerivedOldSiteReport,
  match: ReportMatch,
  goals: readonly OldSiteStoredGoal[],
  links: readonly DerivedOldSiteGoalLink[],
): OldSiteReportVerdict {
  const toCheck: MatchReport = {
    appearances: report.appearances.map((one, id) => ({
      captain: false,
      id,
      name: one.name,
      ours: one.ours,
      shirtNumber: null,
      starter: one.starter,
    })),
    cards: report.cards.map((card) => ({
      appearanceId: card.appearance,
      kind: card.kind,
      minute: card.minute,
      stoppageMinutes: null,
    })),
    goals: goals.map((goal, index) => ({
      appearanceId: links[index]?.appearance ?? null,
      assistId: links[index]?.assist ?? null,
      minute: goal.minute,
      ours: goal.ours,
      ownGoal: goal.ownGoal,
      penalty: goal.penalty,
      stoppageMinutes: null,
    })),
    incidents: [],
    opponentComplete: report.opponentComplete,
    status: 'klaar',
    substitutions: report.substitutions.map((one) => ({
      inId: one.in,
      minute: one.minute,
      outId: one.out,
      stoppageMinutes: null,
    })),
  }
  const check = checkMatchReport(toCheck, match)

  return { check, status: check.errors.length === 0 && report.anomalies.length === 0 ? 'klaar' : 'bezig' }
}

/** The cards of the match, each at a player in the line-up. */
function deriveCards(
  match: OldSiteMatch,
  season: string,
  oldPlayers: ReadonlyMap<string, OldSitePlayer>,
  appearances: readonly DerivedOldSiteAppearance[],
  found: ReadonlyMap<string, number>,
  anomalies: OldSiteReportAnomaly[],
  notes: OldSiteReportNote[],
): DerivedOldSiteCard[] {
  const cards: DerivedOldSiteCard[] = []
  const kinds: Record<number, CardKind> = { 2: 'geel', 3: 'geel-rood', 4: 'rood' }

  for (const event of match.events) {
    const kind = kinds[event.event]

    if (kind === undefined) {
      continue
    }

    const who = { code: event.playerCode, name: event.playerName }
    const label = cleanName(isOurCode(event.playerCode) ? event.playerCode : (event.playerName ?? event.playerCode))
    const place = findAppearance(who, isOurCode(event.playerCode), season, oldPlayers, appearances, found)

    if (place === undefined) {
      notes.push({
        about: { kind, subject: label },
        code: 'card-not-in-lineup',
        text: `the ${kind} card for '${label}' is left out: he is not in the line-up, so he is the trainer or not a player`,
      })
      continue
    }

    const player = appearances[place]!
    let minute: null | number = event.minute === 0 ? null : event.minute

    if (minute === null && kind !== 'geel') {
      // A red card decides how long a player played: it takes the minute he left.
      if (player.minuteOut >= 1) {
        minute = player.minuteOut
      } else {
        anomalies.push({
          about: { kind, subject: player.name },
          code: 'red-card-without-minute',
          text: `the ${kind} card for ${player.name} is left out: it has no minute and he has no minute of leaving`,
        })
        continue
      }
    }
    if (minute !== null && minute > lastMinute) {
      anomalies.push({
        about: { kind, minute, subject: player.name },
        code: 'unusable-minute',
        text: `the ${kind} card for ${player.name} is after minute ${lastMinute}`,
      })
      continue
    }
    if (cards.some((card) => card.appearance === place && card.kind === kind)) {
      notes.push({
        about: { kind, subject: player.name },
        code: 'card-twice',
        text: `${player.name} has two ${kind} cards, the second is left out`,
      })
      continue
    }

    cards.push({ appearance: place, kind, minute })
  }

  // The old fansite wrote a yellow-red card as one card, without the yellow card before it.
  // That yellow card follows from the card itself, so it is added, without a minute, before it.
  for (let index = cards.length - 1; index >= 0; index -= 1) {
    const card = cards[index]!

    if (
      card.kind === 'geel-rood' &&
      !cards.some((other) => other.appearance === card.appearance && other.kind === 'geel')
    ) {
      const name = appearances[card.appearance]!.name

      cards.splice(index, 0, { appearance: card.appearance, kind: 'geel', minute: null })
      notes.push({
        about: { kind: 'geel', subject: name },
        code: 'yellow-derived',
        text: `${name} has a yellow-red card and no yellow card, so a yellow card without a minute is added`,
      })
    }
  }

  return cards
}

/**
 * The substitutions: the file has the minute in and the minute out of every player, not who
 * replaced whom. Someone who comes on at minute m replaces a player of the same team who goes
 * off at minute m, is on the pitch and has not been replaced yet; with more than one such
 * player the order of the file decides. Someone who is sent off is not replaced.
 */
function deriveSubstitutions(
  appearances: readonly DerivedOldSiteAppearance[],
  cards: readonly DerivedOldSiteCard[],
  extraTime: boolean,
  anomalies: OldSiteReportAnomaly[],
): DerivedOldSiteSubstitution[] {
  const substitutions: DerivedOldSiteSubstitution[] = []
  const sentOff = new Set(cards.filter((card) => card.kind !== 'geel').map((card) => card.appearance))

  for (const ours of [true, false]) {
    const team = appearances.flatMap((one, place) => (one.ours === ours ? [place] : []))
    // The end of a match of 90 minutes is minute 90. After extra time the old editors wrote the
    // end as 90, 91, 96 or 120, so there it is the last minute anyone of the team played.
    const end = extraTime ? Math.max(90, ...team.map((place) => appearances[place]!.minuteOut)) : 90
    const entered = new Set(team.filter((place) => appearances[place]!.starter))
    const replaced = new Set<number>()
    const substitutes = team
      .filter((place) => !appearances[place]!.starter)
      .toSorted((a, b) => appearances[a]!.minuteIn - appearances[b]!.minuteIn)

    for (const place of substitutes) {
      const sub = appearances[place]!
      const out = team.find(
        (other) =>
          other !== place &&
          entered.has(other) &&
          !replaced.has(other) &&
          !sentOff.has(other) &&
          appearances[other]!.minuteOut === sub.minuteIn &&
          (appearances[other]!.starter || appearances[other]!.minuteIn < sub.minuteIn),
      )

      if (out === undefined) {
        anomalies.push({
          about: { minute: sub.minuteIn, subject: sub.name },
          code: 'no-substitute-out',
          text: `${sub.name} comes on in minute ${sub.minuteIn} and nobody of the team goes off then`,
        })
        continue
      }

      replaced.add(out)
      entered.add(place)
      substitutions.push({ in: place, minute: sub.minuteIn, ours, out })
    }

    for (const place of team) {
      const player = appearances[place]!

      if (entered.has(place) && !replaced.has(place) && !sentOff.has(place) && player.minuteOut < end) {
        anomalies.push({
          about: { minute: player.minuteOut, subject: player.name },
          code: 'early-exit',
          text: `${player.name} goes off in minute ${player.minuteOut} without a substitute and without a red card`,
        })
      }
    }
  }

  return substitutions.toSorted((a, b) => a.minute - b.minute)
}

/** The place of a player of the event in `appearances`, else undefined. */
function findAppearance(
  who: { code: null | string; name: null | string },
  ours: boolean | undefined,
  season: string,
  oldPlayers: ReadonlyMap<string, OldSitePlayer>,
  appearances: readonly DerivedOldSiteAppearance[],
  found: ReadonlyMap<string, number>,
): number | undefined {
  const sides = ours === undefined ? [true, false] : [ours]

  for (const side of sides) {
    // A code of ours gives the full name; else the name is what the editors typed.
    const name =
      (side && isOurCode(who.code) ? resolveOldSiteCode(who.code, oldPlayers, season)?.name : undefined) ??
      cleanName(who.name ?? who.code)

    if (name === undefined || name === '') {
      continue
    }

    const place = found.get(`${side ? 'ours' : 'theirs'}|${looseNameKey(name)}`)

    if (place !== undefined && appearances[place] !== undefined) {
      return place
    }
  }

  return undefined
}

/** The scorer and the assist of a goal as places in `appearances`. */
function linkGoal(
  event: OldSiteEvent,
  goal: DerivedOldSiteGoal,
  season: string,
  oldPlayers: ReadonlyMap<string, OldSitePlayer>,
  appearances: readonly DerivedOldSiteAppearance[],
  found: ReadonlyMap<string, number>,
  notes: OldSiteReportNote[],
): DerivedOldSiteGoalLink {
  // The team of the scorer: an own goal is of a player of the team that does not benefit.
  const scorerOurs = goal.ownGoal ? !goal.ours : goal.ours
  const at = `${goal.minute ?? '?'} ${goal.player}`
  const scorer = found.get(`${scorerOurs ? 'ours' : 'theirs'}|${looseNameKey(goal.player)}`)

  if (scorer === undefined) {
    notes.push({
      about: { minute: goal.minute, subject: goal.player },
      code: 'goal-scorer-not-found',
      text: `the scorer of the goal (${at}) is not in the line-up`,
    })
  }

  const assistName = cleanName(event.assist)

  if (assistName === '') {
    return { appearance: scorer ?? null, assist: null }
  }
  if (goal.penalty || goal.ownGoal) {
    notes.push({
      about: {
        kind: goal.penalty ? 'penalty' : 'own-goal',
        minute: goal.minute,
        other: goal.player,
        subject: assistName,
      },
      code: 'assist-empty',
      text: `the assist '${assistName}' of the ${goal.penalty ? 'penalty' : 'own goal'} (${at}) is left out`,
    })

    return { appearance: scorer ?? null, assist: null }
  }

  const assist = findAppearance(
    { code: isOurCode(event.assist) ? event.assist : null, name: event.assist },
    scorerOurs,
    season,
    oldPlayers,
    appearances,
    found,
  )

  if (assist === undefined) {
    notes.push({
      about: { minute: goal.minute, other: goal.player, subject: assistName },
      code: 'assist-not-found',
      text: `the assist '${assistName}' of the goal (${at}) is not in the line-up of the team of the scorer, so it is left empty`,
    })
  } else if (assist === scorer) {
    notes.push({
      about: { kind: 'scorer', minute: goal.minute, other: goal.player, subject: assistName },
      code: 'assist-empty',
      text: `the assist '${assistName}' is the scorer (${at}), so it is left empty`,
    })

    return { appearance: scorer ?? null, assist: null }
  }

  return { appearance: scorer ?? null, assist: assist ?? null }
}
