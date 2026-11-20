import { supporterLoginAttempts, supporterLoginLinks, supporters, supporterSessions } from '@fansite/db/schema'

import type { AccountKind } from '../login/account-kind'

const minute = 60 * 1000
const day = 24 * 60 * minute

/** A session ends this long after it began, however often it was used (issue 1448). */
const absoluteLifetime = 365 * day

/**
 * The settings of supporters for the shared code of the login (`src/login`), apart from those
 * of the admin: other tables, another cookie, other times and limits.
 */
export const supporterKind = {
  absoluteLifetime,
  codeAttempts: 5,
  // After five wrong codes the link of the same mail stops too.
  codeFailuresEndLink: true,
  // The browser sends it only under /fans, never to another page of the site or to /beheer.
  cookie: { maxAge: absoluteLifetime / 1000, name: 'fans-sessie', path: '/fans' },
  idleLifetime: 90 * day,
  // 3 mails an address in 15 minutes, signing up and logging in together, and 60 login mails
  // for the whole site (issue 1448). Sign-ups have a ceiling of their own (see sign-up.ts).
  limits: { perAddress: 3, perSite: 60, windowMilliseconds: 15 * minute },
  linkLifetime: 15 * minute,
  minimumAnswerMilliseconds: 400,
  tables: {
    attempts: supporterLoginAttempts,
    links: supporterLoginLinks,
    sessions: supporterSessions,
    users: supporters,
  },
} as const satisfies AccountKind
