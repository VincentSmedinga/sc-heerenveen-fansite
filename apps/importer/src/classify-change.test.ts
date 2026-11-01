import { describe, expect, it } from 'vitest'

import type { ChangeInput, GoalState, MatchState } from './classify-change.ts'

import {
  classifyChange,
  classifyRemoval,
  describeSpan,
  describeState,
  isMassChange,
  reliability,
  startOf,
} from './classify-change.ts'

const hour = 60 * 60 * 1000
const day = 24 * hour

/** The match started on Saturday 24 October 2026, 19:00 UTC. */
const kickoff = new Date('2026-10-24T19:00:00Z')

const played: MatchState = {
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  attendance: null,
  clubId: 1,
  dateText: null,
  extraTime: false,
  goalsAgainst: 0,
  goalsFor: 1,
  home: true,
  kickoffAt: kickoff,
  matchDate: '2026-10-24',
  note: null,
  opponent: 'FC Twente',
  penaltiesAgainst: null,
  penaltiesFor: null,
  referee: null,
  stadium: 'Abe Lenstra Stadion',
  status: 'played',
}

const planned: MatchState = { ...played, goalsAgainst: null, goalsFor: null, status: 'scheduled' }

const goal = (minute: number, player = 'Van Bergen', rest: Partial<GoalState> = {}): GoalState => ({
  minute,
  ours: true,
  ownGoal: false,
  page: null,
  penalty: false,
  player,
  playerId: null,
  stoppageMinutes: null,
  ...rest,
})

/** Judges a change found `after` the kick-off, of a result first seen `stood` before. */
function judge({ after = hour * 3, ...input }: Partial<ChangeInput> & { after?: number }, stood: null | number = hour) {
  const at = new Date(kickoff.getTime() + after)

  return classifyChange({
    at,
    before: { ...played, resultSetAt: stood === null ? null : new Date(at.getTime() - stood) },
    beforeGoals: [],
    firstRead: false,
    history: { rejected: [], returnedTo: [] },
    now: played,
    nowGoals: [],
    pastSeason: false,
    previousReadAt: new Date(at.getTime() - hour),
    ...input,
  })
}

describe('a result that appears', () => {
  const appears = { before: { ...planned, resultSetAt: null }, now: played }

  it('is new information while the match is less than three days old', () => {
    expect(judge({ ...appears, after: 3 * day - 1 }).class).toBe('new')
    expect(judge({ ...appears, after: hour }).class).toBe('new')
  })

  it('is still new when the import had no chance to see the page in the first days', () => {
    const previous = new Date(kickoff.getTime() + day)

    expect(judge({ ...appears, after: 5 * day, previousReadAt: previous }).class).toBe('new')
    expect(judge({ ...appears, after: 5 * day, previousReadAt: null }).class).toBe('new')
  })

  it('is suspicious when the import looked after the first days and saw no result', () => {
    const previous = new Date(kickoff.getTime() + 3 * day)
    const judgement = judge({ ...appears, after: 5 * day, previousReadAt: previous })

    expect(judgement).toMatchObject({ class: 'suspicious', reason: 'the result came 5 days after the match' })
    expect(judge({ ...appears, after: 5 * day, previousReadAt: new Date(previous.getTime() - 1) }).class).toBe('new')
  })

  it('never overwrites anything', () => {
    expect(judge(appears).overwrites).toBe(false)
  })
})

describe('a result that changes', () => {
  const lost = { ...played, goalsAgainst: 2 }

  it('is a correction when it comes less than 24 hours after the result was first seen', () => {
    const judgement = judge({ now: lost }, day - 1)

    expect(judgement).toMatchObject({ changed: ['result'], class: 'improvement', overwrites: true })
    expect(judgement.reason).toBe('the result changed after 23 hours')
  })

  it('is suspicious from exactly 24 hours', () => {
    expect(judge({ now: lost }, day)).toMatchObject({
      class: 'suspicious',
      reason: 'the result changed after 24 hours',
    })
  })

  it('is suspicious in the gap between 24 hours and three days, and from three days', () => {
    expect(judge({ now: lost }, 2 * day).class).toBe('suspicious')
    expect(judge({ now: lost }, 3 * day - 1).class).toBe('suspicious')
    expect(judge({ now: lost }, 3 * day).reason).toBe('the result changed after 3 days')
  })

  it('is suspicious when the match is three days old or older, however recent the result is', () => {
    expect(judge({ after: 3 * day - 1, now: lost }, hour).class).toBe('improvement')
    expect(judge({ after: 3 * day, now: lost }, hour).class).toBe('suspicious')
  })

  it('is suspicious when we do not know since when the result stood', () => {
    expect(judge({ now: lost }, null)).toMatchObject({
      class: 'suspicious',
      reason: 'the result changed and we do not know how long it stood',
    })
  })

  it('is suspicious in a season that is over, and counts as an overwrite', () => {
    expect(judge({ now: lost, pastSeason: true })).toMatchObject({ class: 'suspicious', overwrites: true })
    expect(judge({ now: { ...played, kickoffAt: new Date(kickoff.getTime() + hour) }, pastSeason: true }).class).toBe(
      'suspicious',
    )
  })

  it('is new in a season that is over when it only fills in what was empty', () => {
    expect(judge({ nowGoals: [goal(12)], pastSeason: true })).toMatchObject({ class: 'new', overwrites: false })
    expect(
      judge({
        before: { ...played, resultSetAt: kickoff, stadium: null },
        now: { ...played, stadium: 'Elders' },
        pastSeason: true,
      }).class,
    ).toBe('new')
  })

  it('is new on the first read of a season, whatever it is', () => {
    expect(judge({ after: 30 * day, firstRead: true, now: lost }, null)).toMatchObject({
      class: 'new',
      overwrites: false,
    })
  })

  it('is suspicious when a played match is planned again', () => {
    expect(judge({ now: planned })).toMatchObject({
      class: 'suspicious',
      reason: 'a played match is no longer played',
    })
  })
})

describe('extra time and a shoot-out', () => {
  const cup: MatchState = { ...played, extraTime: true, goalsAgainst: 1, goalsFor: 1 }

  it('are news when they arrive with the same score', () => {
    expect(
      judge({ after: 30 * day, before: { ...played, goalsAgainst: 1, resultSetAt: kickoff }, now: cup }).class,
    ).toBe('new')
    expect(
      judge({
        after: 30 * day,
        before: { ...cup, resultSetAt: kickoff },
        now: { ...cup, penaltiesAgainst: 3, penaltiesFor: 4 },
      }).class,
    ).toBe('new')
  })

  it('arrive with the score after 90 minutes as news, and a score after 90 minutes that changes is a change', () => {
    const level = { ...cup, afterNinetyAgainst: 1, afterNinetyFor: 1 }

    expect(judge({ after: 30 * day, before: { ...cup, resultSetAt: kickoff }, now: level }).class).toBe('new')
    expect(
      judge({
        after: 30 * day,
        before: { ...level, resultSetAt: kickoff },
        now: { ...level, afterNinetyAgainst: 0 },
      }).class,
    ).toBe('suspicious')
    expect(judge({ after: 30 * day, before: { ...level, resultSetAt: kickoff }, now: cup }).class).toBe('suspicious')
  })

  it('are a change when they differ or go away', () => {
    const shootout = { ...cup, penaltiesAgainst: 3, penaltiesFor: 4 }

    expect(
      judge({
        after: 30 * day,
        before: { ...shootout, resultSetAt: kickoff },
        now: { ...shootout, penaltiesAgainst: 4, penaltiesFor: 3 },
      }).class,
    ).toBe('suspicious')
    expect(judge({ after: 30 * day, before: { ...shootout, resultSetAt: kickoff }, now: cup }).class).toBe('suspicious')
  })
})

describe('the goals', () => {
  const some = [goal(12), goal(55, 'Meerveld')]

  it('are new when there were none, however old the match', () => {
    expect(judge({ after: 40 * day, nowGoals: some }, 40 * day)).toMatchObject({
      changed: ['goals'],
      class: 'new',
      overwrites: false,
    })
  })

  it('are new when goals come and the ones we have stay', () => {
    expect(judge({ after: 40 * day, beforeGoals: [some[0] as GoalState], nowGoals: some }, 40 * day).class).toBe('new')
  })

  it('are new when only the player or the page they are linked to is set', () => {
    const linked = [goal(12, 'Van Bergen', { page: 'Mats van Bergen', playerId: 7 })]

    expect(judge({ after: 40 * day, beforeGoals: [goal(12)], nowGoals: linked }, 40 * day).class).toBe('new')
  })

  it('are a correction when a goal changes in a match of the last three days', () => {
    const replaced = [goal(12, 'Een ander'), some[1] as GoalState]

    expect(judge({ beforeGoals: some, nowGoals: replaced }, 40 * day)).toMatchObject({
      changed: ['goals'],
      class: 'improvement',
      overwrites: true,
    })
    expect(judge({ after: 3 * day - 1, beforeGoals: some, nowGoals: replaced }, 40 * day).class).toBe('improvement')
  })

  it.each([
    ['a scorer replaced', [goal(12, 'Een ander'), goal(55, 'Meerveld')]],
    ['a minute changed', [goal(13), goal(55, 'Meerveld')]],
    ['an own goal flag changed', [goal(12, 'Van Bergen', { ownGoal: true }), goal(55, 'Meerveld')]],
    ['a penalty flag changed', [goal(12, 'Van Bergen', { penalty: true }), goal(55, 'Meerveld')]],
    ['a goal gone', [goal(12)]],
    ['all goals gone', []],
  ])('are suspicious in a match of three days or older when %s', (_name, now) => {
    expect(judge({ after: 3 * day, beforeGoals: some, nowGoals: now }, 40 * day)).toMatchObject({
      changed: ['goals'],
      class: 'suspicious',
      reason: 'the goals changed in a match played 3 days ago',
    })
  })
})

describe('the rest of a match', () => {
  it('is new when a match that is not played gets a time, a date or a postponement', () => {
    const before = { ...planned, dateText: '24-25 oktober 2026', kickoffAt: null, resultSetAt: null }

    expect(judge({ after: -30 * day, before, now: planned })).toMatchObject({ class: 'new', overwrites: false })
    expect(
      judge({ after: -30 * day, before: { ...planned, resultSetAt: null }, now: { ...planned, status: 'postponed' } }),
    ).toMatchObject({
      class: 'new',
    })
  })

  it('overwrites when the match had a time already', () => {
    const moved = { ...planned, kickoffAt: new Date(kickoff.getTime() + hour) }

    expect(judge({ after: -30 * day, before: { ...planned, resultSetAt: null }, now: moved })).toMatchObject({
      class: 'new',
      overwrites: true,
    })
  })

  it('is suspicious when the date or the opponent of an old played match changes, and a correction when recent', () => {
    const moved = { ...played, kickoffAt: new Date(kickoff.getTime() + hour) }
    const other = { ...played, clubId: 2, opponent: 'Ajax' }

    expect(judge({ after: 10 * day, now: moved }).class).toBe('suspicious')
    expect(judge({ after: 10 * day, now: other }).class).toBe('suspicious')
    expect(judge({ now: moved }).class).toBe('improvement')
    expect(judge({ now: other }).class).toBe('improvement')
  })

  it('is new when only the article of the opponent changes, or the stadium comes', () => {
    expect(judge({ after: 10 * day, now: { ...played, clubId: 2 } })).toMatchObject({ class: 'new', overwrites: false })
    expect(
      judge({
        after: 10 * day,
        before: { ...played, resultSetAt: kickoff, stadium: null },
        now: { ...played, stadium: 'De Grolsch Veste' },
      }),
    ).toMatchObject({ class: 'new', overwrites: false })
  })

  it('overwrites when the name of the opponent, the stadium or the date text had a value', () => {
    const renamed = { ...played, opponent: 'Twente' }
    const moved = { ...played, stadium: 'De Grolsch Veste' }
    const text = { ...played, dateText: '24-25 oktober 2026', kickoffAt: null }

    expect(judge({ after: 10 * day, now: renamed })).toMatchObject({ class: 'suspicious', overwrites: true })
    expect(judge({ after: 10 * day, now: moved })).toMatchObject({
      changed: ['stadium'],
      class: 'suspicious',
      overwrites: true,
      reason: 'the stadium of a match played 10 days ago changed',
    })
    expect(judge({ now: renamed })).toMatchObject({ class: 'improvement', overwrites: true })
    expect(judge({ now: moved })).toMatchObject({ class: 'improvement', overwrites: true })
    expect(
      judge({
        after: -30 * day,
        before: { ...planned, resultSetAt: null },
        now: { ...planned, ...renamed, goalsAgainst: null, goalsFor: null, status: 'scheduled' },
      }),
    ).toMatchObject({ class: 'new', overwrites: true })
    expect(
      judge({
        after: 10 * day,
        before: { ...text, resultSetAt: kickoff },
        now: { ...text, dateText: '25 oktober 2026' },
      }).class,
    ).toBe('suspicious')
    expect(judge({ now: moved, pastSeason: true })).toMatchObject({ class: 'suspicious', overwrites: true })
  })

  it('is news when a weekend that was text becomes another text for a match that is not played', () => {
    const before = { ...planned, dateText: '24-25 oktober 2026', kickoffAt: null, resultSetAt: null }

    expect(judge({ after: -30 * day, before, now: { ...before, dateText: '25 oktober 2026' } })).toMatchObject({
      class: 'new',
      overwrites: false,
    })
  })
})

describe('the note of a match', () => {
  it('is new when it comes, and overwrites when it changes or goes', () => {
    const noted = { ...played, note: 'Gestaakt, de volgende dag afgemaakt' }

    expect(judge({ after: 10 * day, now: noted })).toMatchObject({ changed: ['note'], class: 'new', overwrites: false })
    expect(
      judge({ after: 10 * day, before: { ...noted, resultSetAt: kickoff }, now: { ...noted, note: 'Anders' } }),
    ).toMatchObject({ changed: ['note'], class: 'suspicious', overwrites: true })
    expect(judge({ after: 10 * day, before: { ...noted, resultSetAt: kickoff }, now: played }).class).toBe('suspicious')
    expect(judge({ before: { ...noted, resultSetAt: kickoff }, now: played }).class).toBe('improvement')
  })
})

describe('the spectators and the referee of a match', () => {
  const known = { ...played, attendance: 21022, referee: 'Sander van der Eijk', resultSetAt: kickoff }

  it('are new when they come, however old the match and even in a season that is over', () => {
    expect(judge({ after: 10 * day, now: { ...played, attendance: 21022 } })).toMatchObject({
      changed: ['attendance'],
      class: 'new',
      overwrites: false,
    })
    expect(judge({ after: 10 * day, now: { ...played, referee: 'Sander van der Eijk' } })).toMatchObject({
      changed: ['referee'],
      class: 'new',
      overwrites: false,
    })
    expect(
      judge({ after: 10 * day, now: { ...played, attendance: 0, referee: 'Sander van der Eijk' }, pastSeason: true }),
    ).toMatchObject({ changed: ['attendance', 'referee'], class: 'new', overwrites: false })
  })

  it('are new for a match that is not played yet', () => {
    expect(
      judge({ before: { ...planned, resultSetAt: null }, now: { ...planned, referee: 'Sander van der Eijk' } }),
    ).toMatchObject({ changed: ['referee'], class: 'new', overwrites: false })
  })

  it('count a revised attendance as a correction, also after days', () => {
    expect(judge({ before: known, now: { ...known, attendance: 21100 } })).toMatchObject({
      changed: ['attendance'],
      class: 'improvement',
      overwrites: true,
      reason: 'the attendance was revised',
    })
    expect(judge({ after: 10 * day, before: known, now: { ...known, attendance: 0 } }).class).toBe('improvement')
  })

  it('count a revised attendance in a season that is over as a change that waits', () => {
    expect(judge({ before: known, now: { ...known, attendance: 21100 }, pastSeason: true })).toMatchObject({
      class: 'suspicious',
      overwrites: true,
    })
  })

  it('count another referee as a correction for a match of the last three days, and as a change that waits after that', () => {
    const other = { ...known, referee: 'Serdar Gözübüyük' }

    expect(judge({ before: known, now: other })).toMatchObject({
      changed: ['referee'],
      class: 'improvement',
      overwrites: true,
      reason: 'the referee of a match played 3 hours ago changed',
    })
    expect(judge({ after: 3 * day - 1, before: known, now: other }).class).toBe('improvement')
    expect(judge({ after: 3 * day, before: known, now: other })).toMatchObject({
      changed: ['referee'],
      class: 'suspicious',
      overwrites: true,
    })
  })

  it('wait when a field that had a value is empty again', () => {
    expect(judge({ before: known, now: { ...known, attendance: null } })).toMatchObject({
      changed: ['attendance'],
      class: 'suspicious',
      overwrites: true,
      reason: 'the attendance of a played match is no longer on the page',
    })
    expect(judge({ before: known, now: { ...known, referee: null } })).toMatchObject({
      changed: ['referee'],
      class: 'suspicious',
      overwrites: true,
      reason: 'the referee is no longer on the page',
    })
  })

  it('make the worse of the two decide when both change', () => {
    expect(
      judge({ after: 10 * day, before: known, now: { ...known, attendance: 21100, referee: 'Serdar Gözübüyük' } }),
    ).toMatchObject({ changed: ['attendance', 'referee'], class: 'suspicious' })
  })
})

describe('a difference no rule knows', () => {
  it('is suspicious, and counts as an overwrite', () => {
    // The two matches are told apart by the caller, but nothing the rules look at differs.
    expect(judge({ now: { ...played } })).toMatchObject({
      changed: ['unknown'],
      class: 'suspicious',
      overwrites: true,
      reason: 'the match differs in a way the rules do not know',
    })
  })

  it('is still new on the first read of a season', () => {
    expect(judge({ firstRead: true, now: { ...played } }).class).toBe('new')
  })
})

describe('a match that goes back and forth', () => {
  const lost = { ...played, goalsAgainst: 2 }

  it('is suspicious when the value it gets is one it had before', () => {
    const history = { rejected: [], returnedTo: [describeState(lost, [])] }

    expect(judge({ history, now: lost })).toMatchObject({
      class: 'suspicious',
      reason: 'the match is back at a value it had before: it may be an edit war',
    })
    expect(judge({ history: { rejected: [], returnedTo: [describeState(played, [])] }, now: lost }).class).toBe(
      'improvement',
    )
  })

  it('is suspicious when the value is one that was rejected', () => {
    const history = { rejected: [describeState(lost, [])], returnedTo: [] }

    expect(judge({ history, now: lost })).toMatchObject({
      class: 'suspicious',
      reason: 'a change that was rejected has come back',
    })
  })

  it('does not count on the first read of a season', () => {
    expect(
      judge({ firstRead: true, history: { rejected: [], returnedTo: [describeState(lost, [])] }, now: lost }).class,
    ).toBe('new')
  })
})

describe('a match that leaves the page', () => {
  it('is suspicious', () => {
    expect(classifyRemoval(false, false)).toMatchObject({
      changed: ['removed'],
      class: 'suspicious',
      overwrites: true,
      reason: 'the match is no longer on the page',
    })
    expect(classifyRemoval(false, true).reason).toBe('the season is over, and its matches do not change')
  })

  it('is no more than a replacement on the first read of a season', () => {
    expect(classifyRemoval(true, false)).toMatchObject({ class: 'new', overwrites: false })
  })
})

describe('the boundaries', () => {
  it('are a day for a correction, three days for a recent match, seven days for a change that waits, and six matches', () => {
    expect(reliability).toMatchObject({
      correctionWithin: day,
      mostChangesInARun: 6,
      recentMatch: 3 * day,
      suspiciousStands: 7 * day,
      warLookback: 7 * day,
    })
  })

  it('call a run an edit of the page from the seventh match', () => {
    expect(isMassChange(6)).toBe(false)
    expect(isMassChange(7)).toBe(true)
  })
})

describe('the helpers', () => {
  it('start a match at its kick-off, or at the start of its day while the time is unknown', () => {
    expect(startOf(played)).toEqual(kickoff)
    expect(startOf({ kickoffAt: null, matchDate: '2026-10-24' })).toEqual(new Date('2026-10-24T00:00:00Z'))
  })

  it('say a span in hours below two days and in days after', () => {
    expect(describeSpan(hour)).toBe('1 hour')
    expect(describeSpan(47 * hour + 59 * 60 * 1000)).toBe('47 hours')
    expect(describeSpan(48 * hour)).toBe('2 days')
    expect(describeSpan(4 * day + 5 * hour)).toBe('4 days')
  })

  it('describe a state without the links of the goals', () => {
    const text = describeState(played, [goal(45, 'Van Bergen', { page: 'Mats', playerId: 3, stoppageMinutes: 2 })])

    expect(text).toBe("home FC Twente, 2026-10-24T19:00:00.000Z, Abe Lenstra Stadion: 1-0; 45+2' Van Bergen (ours)")
    expect(describeState({ ...played, attendance: 0, referee: 'Sander van der Eijk' }, [])).toBe(
      'home FC Twente, 2026-10-24T19:00:00.000Z, Abe Lenstra Stadion, 0 spectators, referee Sander van der Eijk: 1-0',
    )
    expect(describeState(planned, [])).toBe('home FC Twente, 2026-10-24T19:00:00.000Z, Abe Lenstra Stadion: scheduled')
  })
})
