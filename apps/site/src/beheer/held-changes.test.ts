import type { Match, MatchGoal } from '@fansite/db/schema'

import { encodeProposal, type ReadMatch } from '@fansite/db/match-changes'
import { describe, expect, it } from 'vitest'

import { describeHeldChange, describeWithoutDecision, explainHold } from './held-changes'

const stored = {
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  attendance: null,
  competition: 'KNVB Beker',
  dateText: null,
  extraTime: false,
  goalsAgainst: 0,
  goalsFor: 2,
  home: true,
  kickoffAt: new Date('2014-02-05T19:45:00Z'),
  matchDate: '2014-02-05',
  note: null,
  opponent: 'Ajax',
  penaltiesAgainst: null,
  penaltiesFor: null,
  referee: null,
  round: 'Achtste finales',
  stadium: null,
  status: 'played',
} as unknown as Match

const wikipedia = { ...stored, factsProblem: null, goals: null, goalsProblem: null, opponentPage: null } as ReadMatch

const goal = (overrides: Partial<MatchGoal> = {}) =>
  ({
    minute: 12,
    ours: true,
    ownGoal: false,
    penalty: false,
    player: 'Hakim Ziyech',
    stoppageMinutes: null,
    ...overrides,
  }) as MatchGoal

const proposal = (match: Partial<ReadMatch>, goals: Parameters<typeof encodeProposal>[0]['goals'] = []) =>
  encodeProposal({ clubId: 1, goals, match: { ...wikipedia, ...match } })

describe('describeHeldChange', () => {
  it('names the part that differs, with what the site has and what Wikipedia says', () => {
    const summary = describeHeldChange(
      { newValue: 'x', proposal: proposal({ goalsFor: 3, stadium: 'Abe Lenstra Stadion' }) },
      stored,
      [],
    )

    expect(summary.removal).toBe(false)
    expect(summary.differences).toEqual([
      { label: 'Uitslag', site: 'sc Heerenveen 2–0 Ajax', wikipedia: 'sc Heerenveen 3–0 Ajax' },
      { label: 'Stadion', site: 'geen', wikipedia: 'Abe Lenstra Stadion' },
    ])
  })

  it('shows a goal that became a penalty in words', () => {
    const { differences } = describeHeldChange(
      {
        newValue: 'x',
        proposal: proposal({}, [
          {
            minute: 12,
            ours: true,
            ownGoal: false,
            penalty: true,
            personId: null,
            player: 'Hakim Ziyech',
            playerId: null,
            playerPage: null,
            stoppageMinutes: null,
          },
        ]),
      },
      stored,
      [goal()],
    )

    expect(differences).toEqual([
      { label: 'Doelpunten', site: "12' Hakim Ziyech", wikipedia: "12' Hakim Ziyech (strafschop)" },
    ])
  })

  it('shows nothing that differs when only a link does, and the removal when Wikipedia drops the match', () => {
    expect(
      describeHeldChange({ newValue: 'x', proposal: proposal({ opponentPage: 'Ajax (club)' }) }, stored, []),
    ).toEqual({ differences: [], removal: false })
    expect(describeHeldChange({ newValue: null, proposal: null }, stored, [])).toEqual({
      differences: [],
      removal: true,
    })
    expect(describeHeldChange({ newValue: 'x', proposal: 'geen json' }, stored, [])).toEqual({
      differences: [],
      removal: false,
    })
  })
})

describe('describeWithoutDecision', () => {
  const firstSeenAt = new Date('2026-11-01T10:00:00Z')

  it('says the import takes a change of the season that is on over after seven days', () => {
    expect(describeWithoutDecision({ firstSeenAt, season: '2026/27' }, new Date('2026-11-05T10:00:00Z'))).toEqual({
      at: new Date('2026-11-08T10:00:00Z'),
      kind: 'taken-over',
    })
  })

  it('says that nothing happens in a season that is over', () => {
    expect(describeWithoutDecision({ firstSeenAt, season: '2013/14' }, new Date('2026-11-05T10:00:00Z'))).toEqual({
      kind: 'stays',
    })
    // The season turns on 1 July, also for the weekly read of July and August (#1025).
    expect(describeWithoutDecision({ firstSeenAt, season: '2025/26' }, new Date('2026-07-02T10:00:00Z'))).toEqual({
      kind: 'stays',
    })
  })

  it('says that nothing happens when the seven days end after the last day of the season', () => {
    const june = new Date('2027-06-25T10:00:00Z')

    expect(describeWithoutDecision({ firstSeenAt: june, season: '2026/27' }, new Date('2027-06-26T10:00:00Z'))).toEqual(
      { kind: 'stays' },
    )
  })
})

describe('explainHold', () => {
  it.each([
    [
      'the season is over, and its matches do not change',
      'Het seizoen is afgelopen, en de wedstrijden daarin veranderen niet meer.',
    ],
    ['the match is no longer on the page', 'De wedstrijd staat niet meer op de pagina.'],
    ['a change that was rejected has come back', 'Een wijziging die eerder is afgewezen, is terug.'],
    [
      '7 matches changed at once: it looks like an edit of the page',
      '7 wedstrijden veranderden tegelijk: het lijkt een bewerking van de hele pagina.',
    ],
    ['the result changed after 30 hours', 'De uitslag veranderde nadat hij 30 uur had gestaan.'],
    [
      'the goals changed in a match played 4 days ago',
      'De doelpunten van een wedstrijd die 4 dagen geleden werd gespeeld, zijn veranderd.',
    ],
    [
      'the stadium of a match played 1 hour ago changed',
      'Het stadion van een wedstrijd die 1 uur geleden werd gespeeld, is veranderd.',
    ],
    ['the result came 5 days after the match', 'De uitslag kwam pas 5 dagen na de wedstrijd.'],
    ['a played match is no longer played', 'Een gespeelde wedstrijd is volgens de pagina niet meer gespeeld.'],
  ])('says "%s" in Dutch', (reason, said) => {
    expect(explainHold(reason)).toBe(said)
  })

  it('gives a general reason for one it does not know, and never shows the English', () => {
    expect(explainHold('something new')).toBe(
      'De regels van de import kennen deze wijziging niet, en wat ze niet kennen, wacht.',
    )
  })
})
