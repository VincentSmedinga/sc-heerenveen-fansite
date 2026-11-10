import { sendMail } from '@fansite/shared/mail'
import { readMailEnv } from '@fansite/shared/mail-env'
import { siteOrigins } from '@fansite/shared/site-env'
import { and, asc, eq, isNotNull, isNull, notInArray, or } from 'drizzle-orm'

// The mails to the beheerders about a difference between Wikipedia and an entry of the editors
// (issue 577): one when the importer sees the difference, and one when it takes Wikipedia over
// after seven days. The importer calls this after a run, outside the transaction that stores
// the matches, so a mail that does not go out never undoes a match.
import type { AlertOptions } from './alerts.ts'
import type { Database } from './client.ts'
import type { Match, MatchChange } from './schema.ts'

import { describeProblem, environmentNames, formatDateTime } from './alerts.ts'
import { partLabels, quietReasons, takenOverAt } from './match-conflicts.ts'
import { adminUsers, matchChanges, matches } from './schema.ts'

/** How a run mails about the differences. A test gives its own mailer: nothing real is sent. */
export type ConflictMailOptions = Pick<AlertOptions, 'clock' | 'env' | 'send' | 'write'>

type Kind = 'difference' | 'taken-over'

type Waiting = { change: MatchChange; kind: Kind; match: Match }

/**
 * Mails the beheerders about the differences that have not been mailed yet, and records that it
 * did. Each beheerder who is not turned off gets a mail of their own, with the match, both
 * values and the link to the page in the admin; no name or address of an editor is in it. It
 * never throws: a mail that cannot go out is a line in the log of the import, and is tried
 * again at the next run, because the difference stays unmailed. A difference is marked as
 * mailed as soon as one mail went out.
 */
export async function mailConflicts(db: Pick<Database, 'select' | 'update'>, options: ConflictMailOptions) {
  const write = options.write ?? console.log

  try {
    const waiting = await unmailed(db)

    if (waiting.length === 0) {
      return
    }

    const recipients = (
      await db
        .select({ email: adminUsers.email })
        .from(adminUsers)
        .where(and(eq(adminUsers.role, 'beheerder'), isNull(adminUsers.disabledAt)))
        .orderBy(asc(adminUsers.id))
    ).map((row) => row.email)

    if (recipients.length === 0) {
      write(
        'Conflict mail: no beheerder to mail about a difference between Wikipedia and the editors, so none is sent.',
      )

      return
    }

    const env = options.env ?? process.env
    const { SITE_ENV } = readMailEnv(env)
    const now = (options.clock ?? (() => new Date()))()

    for (const { change, kind, match } of waiting) {
      const mail = compose(
        kind,
        change,
        match,
        { address: siteOrigins[SITE_ENV], environment: environmentNames[SITE_ENV] },
        now,
      )
      let sent = 0

      for (const to of recipients) {
        try {
          await (options.send ?? ((mailed) => sendMail(mailed, env)))({ ...mail, to })
          sent++
        } catch (error) {
          write(`Conflict mail: the mail about match ${match.id} could not be sent: ${describeProblem(error)}`)
        }
      }

      if (sent > 0) {
        await db
          .update(matchChanges)
          .set(kind === 'difference' ? { mailedAt: now } : { takenOverMailedAt: now })
          .where(eq(matchChanges.id, change.id))
      }
    }
  } catch (error) {
    write(`Conflict mail: could not mail the differences: ${describeProblem(error)}`)
  }
}

function compose(
  kind: Kind,
  change: MatchChange,
  match: Match,
  context: { address: string; environment: string },
  now: Date,
) {
  const clubs = match.home ? `sc Heerenveen - ${match.opponent}` : `${match.opponent} - sc Heerenveen`
  const title = `${match.round} (${match.competition}): ${clubs}`
  const part = change.part === null ? '' : partLabels[change.part]
  const link = `${context.address}/beheer/wedstrijden/${match.id}`
  const values = [`Onze invoer: ${change.oldValue}`, `Wikipedia: ${change.newValue ?? 'niets'}`]
  const footer = ['', `Omgeving: ${context.environment} (${context.address}).`, '']
  const takenOver = takenOverAt(change, now)

  if (kind === 'taken-over') {
    return {
      subject: `[${context.environment}] De import nam Wikipedia over: ${title}`,
      text: [
        `Niemand besliste in zeven dagen over de ${part} van ${title}, dus de import heeft de waarde van Wikipedia overgenomen.`,
        '',
        ...values,
        '',
        `De wedstrijd in het beheer: ${link}`,
        ...footer,
      ].join('\n'),
    }
  }

  return {
    subject: `[${context.environment}] Wikipedia wijkt af van onze invoer: ${title}`,
    text: [
      `Wikipedia zegt iets anders dan onze redactie over de ${part} van ${title}.`,
      '',
      ...values,
      '',
      'Onze invoer blijft staan tot iemand beslist.',
      `Beslis op de pagina van de wedstrijd: ${link}`,
      takenOver === undefined
        ? 'Het seizoen is voorbij of bijna voorbij, dus de import neemt de waarde van Wikipedia niet vanzelf over.'
        : `Beslist niemand, dan neemt de import de waarde van Wikipedia over vanaf ${formatDateTime(takenOver)}, als Wikipedia die dan nog zegt.`,
      ...footer,
    ].join('\n'),
  }
}

/** The differences nobody was mailed about yet, oldest first. */
async function unmailed(db: Pick<Database, 'select'>): Promise<Waiting[]> {
  const rows = await db
    .select({ change: matchChanges, match: matches })
    .from(matchChanges)
    .innerJoin(matches, eq(matchChanges.matchId, matches.id))
    .where(
      and(
        isNotNull(matchChanges.part),
        // The kept goals of the old fansite and a difference between two sources are no
        // difference between Wikipedia and an entry of the editors.
        notInArray(matchChanges.reason, [...quietReasons]),
        or(
          and(eq(matchChanges.status, 'pending'), isNull(matchChanges.mailedAt)),
          and(
            eq(matchChanges.status, 'accepted'),
            eq(matchChanges.resolution, 'stood'),
            isNull(matchChanges.takenOverMailedAt),
          ),
        ),
      ),
    )
    .orderBy(asc(matchChanges.id))

  return rows.map(({ change, match }) => ({
    change,
    kind: change.status === 'pending' ? 'difference' : 'taken-over',
    match,
  }))
}
