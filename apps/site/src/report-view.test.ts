import { oldSiteReportSource } from '@fansite/db/schema'
import { describe, expect, it } from 'vitest'

import { matchPageDataOf, nameOfPlayer } from './report-view'
import { reportedMatch } from './test-reports'

describe('nameOfPlayer', () => {
  it('takes the parts of the person the importer kept, with the prefix before the family name', () => {
    expect(
      nameOfPlayer('Ruben ten Hove', {
        familyName: 'Hove',
        familyNamePrefix: 'ten',
        givenName: 'Ruben',
        searchTerm: 'ten Hove',
        slug: null,
      }),
    ).toEqual({ givenName: 'Ruben', surname: 'ten Hove' })
  })

  it('takes the search term as the surname when there is no person, and the rest as the given name', () => {
    const known = { familyName: null, familyNamePrefix: null, givenName: null, searchTerm: 'van der Kooi', slug: null }

    expect(nameOfPlayer('Jurre van der Kooi', known)).toEqual({ givenName: 'Jurre', surname: 'van der Kooi' })
    expect(nameOfPlayer('Dinho', { ...known, searchTerm: 'Dinho', slug: null })).toEqual({ surname: 'Dinho' })
  })

  it('shows a name it can not split, and the name of an opponent, as one name in the normal weight', () => {
    expect(nameOfPlayer('Jan Bank', undefined)).toEqual({ givenName: 'Jan Bank', surname: '' })
    expect(
      nameOfPlayer('Jan Bank', {
        familyName: null,
        familyNamePrefix: null,
        givenName: null,
        searchTerm: 'Vos',
        slug: null,
      }),
    ).toEqual({ givenName: 'Jan Bank', surname: '' })
  })
})

describe('matchPageDataOf', () => {
  const data = matchPageDataOf(reportedMatch(), [], true)

  it('keeps the players in the order of the report, ours and then the opponent, with the bench after the line-up', () => {
    expect(data.players.map((player) => player.id)).toEqual([
      ...Array.from({ length: 13 }, (_, index) => index + 1),
      ...Array.from({ length: 12 }, (_, index) => index + 101),
    ])
    expect(data.players.filter((player) => player.ours && player.starter)).toHaveLength(11)
  })

  it('names the players in two parts, for ours from what the importer kept and for the opponent as one name', () => {
    expect(data.players[0]?.name).toEqual({ givenName: 'Tjerk', href: '/spelers/tjerk-brandsma', surname: 'Brandsma' })
    expect(data.players[3]?.name).toEqual({ givenName: 'Ruben', href: '/spelers/ruben-ten-hove', surname: 'ten Hove' })
    expect(data.players.find((player) => player.id === 103)?.name).toEqual({
      givenName: 'Dirk Proefland',
      surname: '',
    })
  })

  it('takes the captain, the shirt number and the line-up of each player', () => {
    expect(data.players.filter((player) => player.captain).map((player) => player.id)).toEqual([10, 105])
    expect(data.players.find((player) => player.id === 12)).toMatchObject({
      ours: true,
      shirtNumber: 12,
      starter: false,
    })
  })

  it('takes the formations, whether the opponent is complete and the result from the match and the report', () => {
    expect(data).toMatchObject({
      afterNinety: null,
      extraTime: false,
      formations: { opponent: '4-4-2', ours: '4-3-3' },
      goalsAgainst: 1,
      goalsFor: 2,
      home: true,
      opponent: 'Testdorp FC',
      opponentComplete: true,
      penalties: null,
    })
  })

  it('says that the formation was derived only for a report of the old fansite that the editors did not save', () => {
    const derived = (report: Partial<ReturnType<typeof reportedMatch>['stored']['report']>) => {
      const reported = reportedMatch()

      Object.assign(reported.stored.report, report)

      return matchPageDataOf(reported, [], true).formationOursDerived
    }

    expect(derived({ savedBy: null, source: oldSiteReportSource })).toBe(true)
    expect(derived({ savedBy: 3, source: oldSiteReportSource })).toBe(false)
    expect(derived({ formationOurs: null, savedBy: null, source: oldSiteReportSource })).toBe(false)
    expect(derived({ savedBy: null, source: 'het wedstrijdformulier' })).toBe(false)
    expect(data.formationOursDerived).toBe(false)
  })

  it('takes the score after 90 minutes and the shoot-out from the match', () => {
    const reported = reportedMatch()

    Object.assign(reported.match, {
      afterNinetyAgainst: 1,
      afterNinetyFor: 1,
      extraTime: true,
      penaltiesAgainst: 3,
      penaltiesFor: 4,
    })

    expect(matchPageDataOf(reported, [], true)).toMatchObject({
      afterNinety: { against: 1, for: 1 },
      extraTime: true,
      penalties: { against: 3, for: 4 },
    })
  })

  it('gives the goals with the team that gets them, and leaves out a goal without a player', () => {
    expect(data.goals.map((goal) => [goal.minute, goal.ours, goal.ownGoal, goal.assistId])).toEqual([
      [12, true, false, 10],
      [40, false, false, null],
      [78, true, true, null],
    ])

    const reported = reportedMatch()

    reported.stored.goals[0]!.appearanceId = null

    expect(matchPageDataOf(reported, [], true).goals).toHaveLength(2)
  })

  it('takes the kicks of the shoot-out with their player, and the rest of the events by player', () => {
    const reported = reportedMatch()

    reported.stored.shootout = [
      { appearanceId: 9, id: 1, matchId: 7, ours: true, outcome: 'raak', round: 1 },
      { appearanceId: null, id: 2, matchId: 7, ours: false, outcome: 'naast', round: 1 },
    ]

    expect(matchPageDataOf(reported, [], true).kicks).toEqual([
      { ours: true, playerId: 9, result: 'raak', round: 1 },
      { ours: false, playerId: null, result: 'naast', round: 1 },
    ])
    expect(data.cards.map((card) => [card.playerId, card.kind])).toEqual([
      [4, 'geel'],
      [105, 'rood'],
    ])
    expect(data.incidents).toEqual([{ kind: 'strafschop-gemist', minute: 55, playerId: 9, stoppageMinutes: null }])
    expect(data.substitutions).toHaveLength(2)
  })
})
