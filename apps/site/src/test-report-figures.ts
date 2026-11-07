import type { PlayerReportStats } from '@fansite/db/match-reports'

import type { ReportFigures } from './report-figures'

// Made-up figures from the match reports, for the tests of the page Spelers (#832).

const none = {
  assists: 0,
  goals: 0,
  matches: 0,
  minutes: 0,
  personFamilyName: null,
  personFamilyNamePrefix: null,
  personGivenName: null,
  redCards: 0,
  starts: 0,
  substitutions: 0,
  yellowCards: 0,
  yellowRedCards: 0,
}

/** A player of the reports, with the figures in `values`. */
export const reportPlayer = (
  playerId: number,
  name: string,
  values: Partial<PlayerReportStats> = {},
): PlayerReportStats => ({ ...none, name, playerId, ...values })

/**
 * Five players of ours: Oyen with the most minutes, Vos and Mees with the same minutes and Vos
 * with the same assists as Bank, and Reserve who was on the bench and never came on.
 */
export const reportPlayers: PlayerReportStats[] = [
  reportPlayer(1, 'Luca Oyen', {
    assists: 2,
    goals: 5,
    matches: 12,
    minutes: 930,
    personFamilyName: 'Oyen',
    personGivenName: 'Luca',
    starts: 10,
    substitutions: 2,
    yellowCards: 3,
  }),
  reportPlayer(2, 'Sander Vos', {
    assists: 4,
    goals: 1,
    matches: 10,
    minutes: 900,
    personFamilyName: 'Vos',
    personGivenName: 'Sander',
    redCards: 1,
    starts: 10,
    yellowCards: 1,
    yellowRedCards: 1,
  }),
  reportPlayer(3, 'Jan Bank', {
    assists: 4,
    matches: 6,
    minutes: 120,
    personFamilyName: 'Bank',
    personGivenName: 'Jan',
    substitutions: 6,
  }),
  reportPlayer(4, 'Kees Reserve', { personFamilyName: 'Reserve', personGivenName: 'Kees' }),
  reportPlayer(5, 'Pim Mees', {
    matches: 10,
    minutes: 900,
    personFamilyName: 'Mees',
    personGivenName: 'Pim',
    starts: 10,
  }),
]

/** Twelve of the fourteen played matches have a report that is klaar. */
export const figuresData: ReportFigures = { known: 12, played: 14, players: reportPlayers, seasonHasReports: true }

/** A season without a report that is klaar. */
export const noReports: ReportFigures = { known: 0, played: 14, players: [], seasonHasReports: false }
