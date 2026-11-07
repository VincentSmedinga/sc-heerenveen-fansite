import { describe, expect, it } from 'vitest'

import { eventsOf, lineupOf, minuteWords, nameOfPlayer, ourClub } from './report-view'
import { reportedMatch } from './test-reports'

describe('minuteWords', () => {
  it('says the minute as a visitor does, with the added time behind it', () => {
    expect(minuteWords(61, null)).toBe('de 61e minuut')
    expect(minuteWords(45, 2)).toBe('de 45e minuut (+2)')
  })
})

describe('nameOfPlayer', () => {
  it('takes the parts of the person the importer kept, with the prefix before the family name', () => {
    expect(
      nameOfPlayer('Ruben ten Hove', {
        familyName: 'Hove',
        familyNamePrefix: 'ten',
        givenName: 'Ruben',
        searchTerm: 'ten Hove',
      }),
    ).toEqual({ givenName: 'Ruben', surname: 'ten Hove' })
  })

  it('takes the search term as the surname when there is no person, and the rest as the given name', () => {
    const known = { familyName: null, familyNamePrefix: null, givenName: null, searchTerm: 'van der Kooi' }

    expect(nameOfPlayer('Jurre van der Kooi', known)).toEqual({ givenName: 'Jurre', surname: 'van der Kooi' })
    expect(nameOfPlayer('Dinho', { ...known, searchTerm: 'Dinho' })).toEqual({ surname: 'Dinho' })
  })

  it('shows a name it can not split, and the name of an opponent, as one name in the normal weight', () => {
    expect(nameOfPlayer('Jan Bank', undefined)).toEqual({ givenName: 'Jan Bank', surname: '' })
    expect(
      nameOfPlayer('Jan Bank', { familyName: null, familyNamePrefix: null, givenName: null, searchTerm: 'Vos' }),
    ).toEqual({ givenName: 'Jan Bank', surname: '' })
  })
})

describe('eventsOf', () => {
  const events = eventsOf(reportedMatch())

  it('puts the goals, the substitutions, the cards and the missed penalties in the order of the clock', () => {
    expect(events.map((event) => [event.minute, event.stoppageMinutes ?? null, event.kind])).toEqual([
      [12, null, 'goal'],
      [30, null, 'yellow-card'],
      [40, null, 'goal'],
      [45, 2, 'substitution'],
      [55, null, 'penalty-missed'],
      [60, null, 'substitution'],
      [78, null, 'goal'],
      [90, 3, 'red-card'],
    ])
  })

  it('gives the assist with a goal, and the penalty', () => {
    expect(events[0]).toMatchObject({ assist: { givenName: 'Thijs', surname: 'Idzenga' }, kind: 'goal', ours: true })
    expect(events[2]).toMatchObject({ kind: 'goal', ours: false, penalty: true, team: 'Testdorp FC' })
    expect(events[2]).not.toHaveProperty('assist')
  })

  it('gives an own goal the team of the player who scored it, and not the team that gets it', () => {
    expect(events[6]).toMatchObject({ kind: 'goal', ours: false, ownGoal: true, team: 'Testdorp FC' })
  })

  it('names the team of every event, with sc Heerenveen for ours', () => {
    expect(events[0]?.team).toBe(ourClub)
    expect(events[7]).toMatchObject({ ours: false, team: 'Testdorp FC' })
  })

  it('names who comes on and who goes off in a substitution', () => {
    expect(events[5]).toMatchObject({
      kind: 'substitution',
      playerIn: { givenName: 'Gerrit Nepper', surname: '' },
      playerOut: { givenName: 'Thijs', surname: 'Idzenga' },
    })
  })

  it('leaves out a goal without a player, since the page only exists for a report that has them', () => {
    const reported = reportedMatch()

    reported.stored.goals[0]!.appearanceId = null

    expect(eventsOf(reported).filter((event) => event.kind === 'goal')).toHaveLength(2)
  })

  it('puts the added time of the first half before the next minute', () => {
    const reported = reportedMatch()

    reported.stored.cards[0] = { ...reported.stored.cards[0]!, minute: 46 }

    const order = eventsOf(reported).map(
      (event) =>
        `${event.minute}${event.stoppageMinutes === undefined || event.stoppageMinutes === null ? '' : `+${event.stoppageMinutes}`}`,
    )

    expect(order.indexOf('45+2')).toBeLessThan(order.indexOf('46'))
  })
})

describe('lineupOf', () => {
  const ours = lineupOf(reportedMatch(), true)
  const theirs = lineupOf(reportedMatch(), false)

  it('splits a team in the line-up and the bench, in the order of the report', () => {
    expect(ours.starters.map((player) => player.shirtNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(ours.bench.map((player) => player.shirtNumber)).toEqual([12, 13])
    expect(theirs.starters).toHaveLength(11)
    expect(theirs.bench).toHaveLength(1)
  })

  it('marks the captain', () => {
    expect(ours.starters.filter((player) => player.captain === true).map((player) => player.shirtNumber)).toEqual([10])
    expect(theirs.starters.filter((player) => player.captain === true).map((player) => player.shirtNumber)).toEqual([5])
  })

  it('writes the substitution in words for the player who went off and for the player who came on', () => {
    expect(ours.starters.find((player) => player.shirtNumber === 10)?.notes).toEqual([
      'Gewisseld in de 60e minuut, vervangen door Gerrit Nepper',
    ])
    expect(ours.bench.find((player) => player.shirtNumber === 12)?.notes).toEqual([
      'Ingevallen in de 60e minuut voor Idzenga',
    ])
    expect(theirs.bench[0]?.notes).toEqual(['Ingevallen in de 45e minuut (+2) voor Ronald Proefveld'])
  })

  it('writes the cards in words, with the minute', () => {
    expect(ours.starters.find((player) => player.shirtNumber === 4)?.notes).toEqual(['Gele kaart in de 30e minuut'])
    expect(theirs.starters.find((player) => player.shirtNumber === 5)?.notes).toEqual([
      'Rode kaart in de 90e minuut (+3)',
    ])
  })

  it('gives a player nothing to note when nothing happened to him', () => {
    expect(ours.starters.find((player) => player.shirtNumber === 2)?.notes).toEqual([])
  })
})
