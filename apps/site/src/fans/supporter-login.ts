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
  // 3 mails an address in 15 minutes, signing up and logging in together. The ceiling of the
  // whole site counts per quarter of the clock, apart from this (see noteMail in log-in.ts),
  // and sign-ups have a ceiling of their own (see sign-up.ts).
  limits: { perAddress: 3, windowMilliseconds: 15 * minute },
  linkLifetime: 15 * minute,
  minimumAnswerMilliseconds: 400,
  // A session counts a visit at most once a day, together with the day of the last visit of
  // the account (see currentSupporter).
  renewAfter: day,
  tables: {
    attempts: supporterLoginAttempts,
    links: supporterLoginLinks,
    sessions: supporterSessions,
    users: supporters,
  },
  // A blocked supporter logs in, to see the page that says so, and to close the account.
  turnedOffLogsIn: true,
} as const satisfies AccountKind
