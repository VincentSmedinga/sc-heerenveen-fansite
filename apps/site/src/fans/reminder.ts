import type { Database } from '@fansite/db/client'

import { supporters } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

// The choice "Herinnering per e-mail" of a supporter (issue 1459): one message the day before a
// match, for a supporter who didn't predict yet. It is off until the supporter turns it on. The
// message itself comes with issue 1461; this only keeps the choice.

/** Turns the reminder of a supporter on or off; at once, both ways. */
export async function setReminder(db: Database, supporterId: number, on: boolean) {
  await db.update(supporters).set({ remindByEmail: on }).where(eq(supporters.id, supporterId))
  console.info(`Supporter ${supporterId} changed the choice for the reminder.`)
}
