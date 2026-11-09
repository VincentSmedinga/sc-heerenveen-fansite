import type { Database } from '@fansite/db/client'
import type { Match } from '@fansite/db/schema'

import { recordAction } from '@fansite/db/audit-log'
import { createClubBook } from '@fansite/db/clubs'
import { describeEntryKickoff, describeEntryResult } from '@fansite/db/match-edits'
import { findMatchByDate } from '@fansite/db/match-lookup'
import { clubs, competitions, matches, matchLimits } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, asc, eq } from 'drizzle-orm'

import { type AddErrors, type AddValues, emptyAddValues, newClubChoice } from './match-add-fields'
import { emptyFields, type MatchValues } from './match-fields'
import { statusChoices, validate } from './match-form'

// Adding a match in the admin (issue 970): a match that no import reads, with the source the
// editors took it from. The checks repeat what the database enforces, so an editor gets a
// sentence at the field, and they use the checks of the form of a match for the kick-off and
// the result. The match, its club and its row in the log are one transaction.

/** What an editor entered, understood and in the shape of the tables. */
export type AddEntry = {
  club: { id: number } | { name: string }
  competition: Match['competition']
  home: boolean
  kickoff: Pick<Match, 'dateText' | 'kickoffAt' | 'matchDate'>
  result: Pick<
    Match,
    | 'afterNinetyAgainst'
    | 'afterNinetyFor'
    | 'extraTime'
    | 'goalsAgainst'
    | 'goalsFor'
    | 'penaltiesAgainst'
    | 'penaltiesFor'
    | 'status'
  >
  round: string
  season: string
  sourceLine: string
}

/** What adding did: the match is there, or the form is refused with the errors. */
export type AddOutcome = { errors: AddErrors; status: 'refused' } | { id: number; status: 'added' }

/** What deleting did: it is gone, there is no such match, or it is not one of the editors. */
export type DeleteOutcome = 'done' | 'missing' | 'not-ours'

/** The errors of a match that is refused, thrown to roll back the transaction. */
class Refusal extends Error {
  errors: AddErrors

  constructor(errors: AddErrors) {
    super('The match is refused')
    this.errors = errors
  }
}

/**
 * Adds the match: its club is found or made (`clubs.ts`), a match that is there already on the
 * season, the competition, the club and the day is refused (`findMatchByDate`, with a day of
 * slack, whatever its source), and so is a round that is taken. Writes `match.add` with the
 * source line as its reason, so there is no match without a row and no row without a match.
 */
export async function addMatch(db: Database, userId: number, entry: AddEntry, now = new Date()): Promise<AddOutcome> {
  try {
    return await addInTransaction(db, userId, entry, now)
  } catch (error) {
    // A refused match rolls the transaction back, so a club made on the way is not kept.
    if (error instanceof Refusal) {
      return { errors: error.errors, status: 'refused' }
    }

    throw error
  }
}

/**
 * Deletes a match the editors added, with its goals, report and entry (they go with it), and
 * writes `match.delete` with the reason. A match from an import is never deleted here.
 */
export async function deleteAddedMatch(
  db: Database,
  userId: number,
  id: number,
  reason: string,
  now = new Date(),
): Promise<DeleteOutcome> {
  return db.transaction(async (transaction) => {
    const [match] = await transaction.select().from(matches).where(eq(matches.id, id)).for('update')

    if (match === undefined) {
      return 'missing'
    }
    if (match.dataSource !== 'redactie') {
      return 'not-ours'
    }

    await transaction.delete(matches).where(eq(matches.id, id))
    await recordAction(
      transaction,
      {
        action: 'match.delete',
        detail: `Verwijderd: ${match.season} ${match.competition} ${match.round}: ${match.opponent}, ${match.matchDate} (bron: ${match.sourceLine ?? 'onbekend'})`,
        itemId: id,
        reason,
        userId,
      },
      now,
    )

    return 'done'
  })
}

/** The clubs to choose from, by name. */
export async function listClubChoices(db: Pick<Database, 'select'>) {
  return db.select({ id: clubs.id, name: clubs.name }).from(clubs).orderBy(asc(clubs.name))
}

/** What the request holds, as text. */
export function readAddValues(formData: FormData): AddValues {
  return Object.fromEntries(
    Object.keys(emptyAddValues).map((name) => {
      const value = formData.get(name)

      return [name, typeof value === 'string' ? value.trim() : '']
    }),
  ) as AddValues
}

/**
 * Checks what an editor filled in. Returns the errors by `id`, or, when there are none, the
 * entry as the tables hold it. The kick-off and the result are checked as the form of a match
 * checks them, with the goals left for the form of the match itself.
 */
export function validateAdd(
  values: AddValues,
  clubChoices: readonly { id: number; name: string }[],
): { entry: AddEntry; errors?: undefined } | { entry?: undefined; errors: AddErrors } {
  const errors: AddErrors = {}
  const season = /^(\d{4})\/(\d{2})$/u.exec(values.seizoen)
  const competition = competitions.find((choice) => choice === values.competitie)

  if (season === null || (Number(season[1]) + 1) % 100 !== Number(season[2])) {
    errors.seizoen = 'Vul het seizoen in zoals 2008/09.'
  }
  if (competition === undefined) {
    errors.competitie = 'Kies de competitie.'
  }
  if (values.ronde === '') {
    errors.ronde = 'Vul de ronde in, zoals Speelronde 12 of Kwartfinale.'
  } else if (values.ronde.length > matchLimits.round) {
    errors.ronde = `Schrijf hoogstens ${matchLimits.round} tekens.`
  }

  let club: AddEntry['club'] | undefined
  let opponent = ''

  if (values.tegenstander === newClubChoice) {
    if (values['nieuwe-club'] === '') {
      errors['nieuwe-club'] = 'Schrijf de naam van de club.'
    } else if (values['nieuwe-club'].length > matchLimits.opponent) {
      errors['nieuwe-club'] = `Schrijf hoogstens ${matchLimits.opponent} tekens.`
    } else {
      club = { name: values['nieuwe-club'] }
      opponent = values['nieuwe-club']
    }
  } else {
    const chosen = clubChoices.find((choice) => String(choice.id) === values.tegenstander)

    if (chosen === undefined) {
      errors.tegenstander = 'Kies de tegenstander, of een nieuwe club.'
    } else {
      club = { id: chosen.id }
      opponent = chosen.name
    }
  }
  if (values.thuis !== 'thuis' && values.thuis !== 'uit') {
    errors.thuis = 'Kies of sc Heerenveen thuis of uit speelde.'
  }
  if (values.bron === '') {
    errors.bron = 'Vul de bron in, zoals Leeuwarder Courant, 12 mei 2009.'
  } else if (values.bron.length > matchLimits.sourceLine) {
    errors.bron = `Schrijf hoogstens ${matchLimits.sourceLine} tekens.`
  }

  const checked = validate(
    {
      doelpunten: [],
      reden: values.bron === '' ? 'bron' : values.bron,
      velden: {
        ...emptyFields,
        'aftrap-datum': values['aftrap-datum'],
        'aftrap-tekst': values['aftrap-tekst'],
        'aftrap-tijd': values['aftrap-tijd'],
        status: values.status,
        'uitslag-wij': values['uitslag-wij'],
        'uitslag-zij': values['uitslag-zij'],
        verlenging: 'nee',
      },
    } satisfies MatchValues,
    { competition: competition ?? 'Eredivisie', dataSource: 'redactie', opponent, squad: [] },
  )

  for (const [id, message] of Object.entries(checked.errors ?? {})) {
    if (id !== 'reden' && message !== undefined && id in emptyAddValues) {
      errors[id as keyof AddErrors] = message
    }
  }
  if (
    errors['aftrap-datum'] === undefined &&
    season !== null &&
    errors.seizoen === undefined &&
    seasonOf(new Date(`${values['aftrap-datum']}T12:00:00Z`)) !== values.seizoen
  ) {
    errors['aftrap-datum'] =
      `Deze datum valt niet in het seizoen ${values.seizoen}. Een seizoen loopt van 1 juli tot 30 juni.`
  }

  if (
    Object.keys(errors).length > 0 ||
    checked.entry === undefined ||
    club === undefined ||
    competition === undefined ||
    !statusChoices.some((choice) => choice.value === values.status)
  ) {
    return { errors }
  }

  return {
    entry: {
      club,
      competition,
      home: values.thuis === 'thuis',
      kickoff: checked.entry.kickoff,
      result: checked.entry.result,
      round: values.ronde,
      season: values.seizoen,
      sourceLine: values.bron,
    },
  }
}

async function addInTransaction(db: Database, userId: number, entry: AddEntry, now: Date) {
  return db.transaction(async (transaction) => {
    const book = await createClubBook(transaction)
    const club =
      'id' in entry.club
        ? entry.club.id
        : (await book.resolve({ name: entry.club.name, page: null, season: entry.season })).id
    const [named] = await transaction.select({ name: clubs.name }).from(clubs).where(eq(clubs.id, club))

    if (named === undefined) {
      throw new Refusal({ tegenstander: 'Kies een club uit de lijst.' })
    }

    const found = await findMatchByDate(transaction, {
      clubId: club,
      competition: entry.competition,
      date: entry.kickoff.matchDate,
      season: entry.season,
    })

    if (found.kind !== 'none') {
      const [first] = found.kind === 'found' ? [found.match] : found.matches

      throw new Refusal({
        'aftrap-datum': `Deze wedstrijd staat er al: ${first?.round} op ${first?.matchDate}. Pas die aan in plaats van een nieuwe toe te voegen.`,
      })
    }

    const [taken] = await transaction
      .select({ id: matches.id })
      .from(matches)
      .where(
        and(
          eq(matches.season, entry.season),
          eq(matches.competition, entry.competition),
          eq(matches.round, entry.round),
        ),
      )

    if (taken !== undefined) {
      throw new Refusal({
        ronde: `Er is in ${entry.season} al een wedstrijd in ${entry.competition} met deze ronde.`,
      })
    }

    const [{ insertId }] = await transaction.insert(matches).values({
      ...entry.kickoff,
      ...entry.result,
      clubId: club,
      competition: entry.competition,
      dataSource: 'redactie',
      home: entry.home,
      opponent: named.name,
      resultSetAt: entry.result.status === 'played' ? now : null,
      round: entry.round,
      season: entry.season,
      sourceLine: entry.sourceLine,
    })

    await recordAction(
      transaction,
      {
        action: 'match.add',
        detail: `Toegevoegd: ${entry.season} ${entry.competition} ${entry.round}: ${entry.home ? `sc Heerenveen - ${named.name}` : `${named.name} - sc Heerenveen`}, ${describeEntryKickoff(entry.kickoff)}, ${describeEntryResult({ ...entry.result, home: entry.home, opponent: named.name })}`,
        itemId: insertId,
        reason: entry.sourceLine,
        userId,
      },
      now,
    )

    return { id: insertId, status: 'added' } as const
  })
}
