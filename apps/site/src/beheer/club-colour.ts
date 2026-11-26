import type { Database } from '@fansite/db/client'

import { clubColourOf, isClubColour, noClubColour } from '@fansite/db/club-colours'
import { clubs } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

import { recordAction } from './audit-log'
import { type ClubColourMode, clubColourModes } from './club-colour-fields'

// The colour of a club in the admin (#1677): the choice of an editor between the colour of the
// list in the code, an own colour and none. A choice and its row in the log of the admin are
// one transaction. The importer never touches it.

/** A choice as the form sent it, checked: what to store, or what is wrong and where. */
export type ClubColourInput = { choice: null | string } | { error: string; field: 'keuze' | 'kleur' }

/** What a choice did: `done` saved it, `unchanged` found it already, or `missing`. */
export type ClubColourOutcome = { colour: null | string; status: 'done' | 'unchanged' } | { status: 'missing' }

/**
 * Stores the choice of an editor for a club: null for the list, `none` or a checked colour. It
 * writes `club.edit` in the log, as "AFC, kleur van de club: uit de lijst → #e30613". The same
 * choice again changes nothing and writes nothing.
 */
export async function chooseClubColour(
  db: Database,
  userId: number,
  clubId: number,
  choice: null | string,
  now = new Date(),
): Promise<ClubColourOutcome> {
  if (choice !== null && choice !== noClubColour && !isClubColour(choice)) {
    throw new Error(`Not a choice of a colour: ${choice}`)
  }

  return db.transaction(async (transaction) => {
    const [club] = await transaction
      .select({ choice: clubs.colourChoice, name: clubs.name, slug: clubs.slug })
      .from(clubs)
      .where(eq(clubs.id, clubId))
      .for('update')

    if (club === undefined) {
      return { status: 'missing' }
    }

    const colour = clubColourOf(club.slug, choice)

    if (club.choice === choice) {
      return { colour, status: 'unchanged' }
    }

    await transaction.update(clubs).set({ colourChoice: choice }).where(eq(clubs.id, clubId))
    await recordAction(
      transaction,
      {
        action: 'club.edit',
        detail: `${club.name}, kleur van de club: ${words(club.choice)} → ${words(choice)}`,
        itemId: clubId,
        userId,
      },
      now,
    )

    return { colour, status: 'done' }
  })
}

/** The colour of a club now as `#rrggbb`, or null for none. */
export async function findClubColour(db: Pick<Database, 'select'>, clubId: number): Promise<null | string> {
  const [club] = await db
    .select({ choice: clubs.colourChoice, slug: clubs.slug })
    .from(clubs)
    .where(eq(clubs.id, clubId))

  return club === undefined ? null : clubColourOf(club.slug, club.choice)
}

/**
 * Checks what the form sent: the choice `lijst`, `eigen` or `geen`, and for an own colour six
 * hexadecimal digits after `#` (capitals become small letters). The text field counts only for
 * an own colour.
 */
export function readClubColour(mode: unknown, colour: unknown): ClubColourInput {
  if (!clubColourModes.includes(mode as ClubColourMode)) {
    return { error: 'Kies de kleur uit de lijst, een eigen kleur of geen kleur.', field: 'keuze' }
  }
  if (mode === 'lijst') {
    return { choice: null }
  }
  if (mode === 'geen') {
    return { choice: noClubColour }
  }

  const text = typeof colour === 'string' ? colour.trim().toLowerCase() : ''

  return isClubColour(text)
    ? { choice: text }
    : { error: 'Vul een kleur in als # met zes hexadecimale tekens, zoals #e30613.', field: 'kleur' }
}

/** A choice in words for the log. */
const words = (choice: null | string) => (choice === null ? 'uit de lijst' : choice === noClubColour ? 'geen' : choice)
