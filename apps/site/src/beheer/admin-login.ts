import { adminLoginAttempts, adminLoginLinks, adminSessions, adminUsers } from '@fansite/db/schema'

import type { AccountKind } from '../login/account-kind'

const minute = 60 * 1000

/** A session ends this long after it began, however often it was used. */
const absoluteLifetime = 14 * 24 * 60 * minute

/** The settings of the admin for the shared code of the login (`src/login`). */
export const adminKind = {
  absoluteLifetime,
  codeAttempts: 5,
  codeFailuresEndLink: false,
  // It lasts as long as a session can, but the server decides: a session that has ended or been
  // revoked doesn't work, whatever the browser still holds. The browser sends it only under
  // /beheer, never to a page of the site. The only other cookie is that of supporters, under
  // /fans.
  cookie: { maxAge: absoluteLifetime / 1000, name: 'beheer-sessie', path: '/beheer' },
  idleLifetime: 9 * 24 * 60 * minute,
  limits: { perAddress: 5, perSite: 30, windowMilliseconds: 15 * minute },
  linkLifetime: 15 * minute,
  minimumAnswerMilliseconds: 400,
  tables: { attempts: adminLoginAttempts, links: adminLoginLinks, sessions: adminSessions, users: adminUsers },
} as const satisfies AccountKind
