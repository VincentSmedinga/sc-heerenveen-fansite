import type { Match, MatchGoal } from '@fansite/db/schema'

import { decodeProposal } from '@fansite/db/match-changes'
import { conflictStandsMs } from '@fansite/db/match-conflicts'
import { describeEntryGoals, describeEntryKickoff, describeEntryResult } from '@fansite/db/match-edits'
import { seasonOf } from '@fansite/db/season'

import type { HeldChange } from './match-entries'

// What a beheerder reads of a change of Wikipedia that the importer holds back: what the site
// shows and what Wikipedia says now, in words, why the change waits and what happens when
// nobody decides. The importer keeps its reason and its values in English, as one line for the
// machine; this file builds the Dutch from the match itself and from the proposal.

/** One thing that differs: what it is, what the site has and what Wikipedia says now. */
export type HeldDifference = { label: string; site: string; wikipedia: string }

/** What the screen says of a held change. */
export type HeldSummary = {
  /** What differs. Empty when the change is only about links or the proposal is unreadable. */
  differences: HeldDifference[]
  /** Whether the match is gone from the page, so taking over deletes it. */
  removal: boolean
}

/** The text for a thing the match does not have. */
const none = 'geen'

/** What happens without a decision: the import takes it over at a moment, or the site stays. */
export type HeldOutcome = { at: Date; kind: 'taken-over' } | { kind: 'stays' }

/**
 * What differs between the match as the site has it and as the change proposes it. A change
 * that removes the match has no differences, only `removal`. The comparison is of the words,
 * so a change that only touches a link or a player of the squad shows nothing here.
 */
export function describeHeldChange(
  change: Pick<HeldChange, 'newValue' | 'proposal'>,
  match: Match,
  goals: MatchGoal[],
): HeldSummary {
  if (change.newValue === null) {
    return { differences: [], removal: true }
  }

  const proposal = decodeProposal(change.proposal)

  if (proposal === undefined) {
    return { differences: [], removal: false }
  }

  const wikipedia = proposal.match
  const pairs: [string, string, string][] = [
    ['Uitslag', describeEntryResult(match), describeEntryResult(wikipedia)],
    ['Doelpunten', describeEntryGoals([...goals]), describeEntryGoals(proposal.goals)],
    ['Aanvang', describeEntryKickoff(match), describeEntryKickoff(wikipedia)],
    ['Tegenstander', clubOf(match), clubOf(wikipedia)],
    ['Stadion', match.stadium ?? none, wikipedia.stadium ?? none],
    ['Toeschouwers', text(match.attendance), text(wikipedia.attendance)],
    ['Scheidsrechter', match.referee ?? none, wikipedia.referee ?? none],
    ['Opmerking', match.note ?? none, wikipedia.note ?? none],
  ]

  return {
    differences: pairs
      .filter(([, site, other]) => site !== other)
      .map(([label, site, other]) => ({ label, site, wikipedia: other })),
    removal: false,
  }
}

/**
 * What happens to a held change when nobody decides, in a sentence. In the season that is on,
 * the import takes the change over after seven days if the page still says the same. In a
 * season that is over the import does not read the page any more, so nothing happens.
 */
export function describeWithoutDecision(change: Pick<HeldChange, 'firstSeenAt' | 'season'>, now: Date): HeldOutcome {
  return change.season < seasonOf(now)
    ? { kind: 'stays' }
    : { at: new Date(change.firstSeenAt.getTime() + conflictStandsMs), kind: 'taken-over' }
}

/**
 * The reason the importer gave, in Dutch. The importer writes its reasons in English, with a
 * span in hours or days, so the known sentences are translated and any other one gets a
 * general reason: the rules of the import do not know this change, and what they do not know
 * waits.
 */
export function explainHold(reason: string): string {
  const span = (text: string) => {
    const found = /^(\d+) (hours?|days)$/u.exec(text)
    const amount = Number(found?.[1])

    return found === null ? text : found[2] === 'days' ? `${amount} ${amount === 1 ? 'dag' : 'dagen'}` : `${amount} uur`
  }
  const subjects: Record<string, string> = {
    'the date': 'De datum',
    'the name of the opponent': 'De naam van de tegenstander',
    'the note': 'De opmerking',
    'the opponent or the venue': 'De tegenstander of de plaats van de wedstrijd',
    'the referee': 'De scheidsrechter',
    'the stadium': 'Het stadion',
  }
  const played = /^(.+) of a match played (.+) ago changed$/u.exec(reason)

  if (played?.[1] !== undefined && played[2] !== undefined && subjects[played[1]] !== undefined) {
    return `${subjects[played[1]]} van een wedstrijd die ${span(played[2])} geleden werd gespeeld, is veranderd.`
  }

  const patterns: [RegExp, (match: RegExpExecArray) => string][] = [
    [/^the season is over/u, () => 'Het seizoen is afgelopen, en de wedstrijden daarin veranderen niet meer.'],
    [/^the match is no longer on the page$/u, () => 'De wedstrijd staat niet meer op de pagina.'],
    [
      /^the match is back at a value it had before/u,
      () => 'De wedstrijd heeft weer een waarde die hij in de laatste week had. Dat kan een bewerkingsoorlog zijn.',
    ],
    [/^a change that was rejected has come back$/u, () => 'Een wijziging die eerder is afgewezen, is terug.'],
    [
      /^(\d+) matches changed at once/u,
      (match) => `${match[1]} wedstrijden veranderden tegelijk: het lijkt een bewerking van de hele pagina.`,
    ],
    [
      /^the date of a match played (.+) ago changed$/u,
      (match) => `De datum van een wedstrijd die ${span(match[1] ?? '')} geleden werd gespeeld, is veranderd.`,
    ],
    [
      /^the goals changed in a match played (.+) ago$/u,
      (match) => `De doelpunten van een wedstrijd die ${span(match[1] ?? '')} geleden werd gespeeld, zijn veranderd.`,
    ],
    [
      /^the result changed after (.+)$/u,
      (match) => `De uitslag veranderde nadat hij ${span(match[1] ?? '')} had gestaan.`,
    ],
    [
      /^the result changed and we do not know how long it stood$/u,
      () => 'De uitslag veranderde, en we weten niet hoe lang hij had gestaan.',
    ],
    [
      /^the result came (.+) after the match$/u,
      (match) => `De uitslag kwam pas ${span(match[1] ?? '')} na de wedstrijd.`,
    ],
    [/^a played match is no longer played$/u, () => 'Een gespeelde wedstrijd is volgens de pagina niet meer gespeeld.'],
    [
      /^the attendance of a played match is no longer on the page$/u,
      () => 'Het aantal toeschouwers van een gespeelde wedstrijd staat niet meer op de pagina.',
    ],
    [
      /^the referee is no longer on the page$/u,
      () => 'De scheidsrechter van een gespeelde wedstrijd staat niet meer op de pagina.',
    ],
  ]

  for (const [pattern, say] of patterns) {
    const match = pattern.exec(reason)

    if (match !== null) {
      return say(match)
    }
  }

  return 'De regels van de import kennen deze wijziging niet, en wat ze niet kennen, wacht.'
}

const clubOf = (match: Pick<Match, 'home' | 'opponent'>) =>
  match.home ? `thuis tegen ${match.opponent}` : `uit bij ${match.opponent}`

const text = (value: null | number) => (value === null ? none : String(value))
