import type {
  adminLoginAttempts,
  adminLoginLinks,
  adminSessions,
  adminUsers,
  supporterLoginAttempts,
  supporterLoginLinks,
  supporters,
  supporterSessions,
} from '@fansite/db/schema'

// The tables of a kind of account all have the columns of the tables of the admin: an account
// with an address and a switch for turning it off, the login links with their codes, the
// sessions and the requests for the rate limit. The module makes no tables and knows nothing
// of what else an account has, such as a role or a screen name. The tables of supporters have
// more: a link without an account (a sign-up) and a request without an address (for the
// ceiling of sign-ups). The module leaves those rows alone.

/**
 * Everything that differs between one kind of account and another (the admin, or later the
 * supporters): the tables, the cookie, how long a link and a session work, and the limits.
 */
export type AccountKind = {
  /** A session ends this long after it began, however often it was used. */
  absoluteLifetime: number
  /** How many wrong codes a login code takes; the next try, right or wrong, is refused. */
  codeAttempts: number
  /**
   * Whether the last wrong code that `codeAttempts` takes ends the link of the mail too, so
   * neither works after it. The admin keeps its link working.
   */
  codeFailuresEndLink: boolean
  cookie: {
    /** How long the browser keeps the cookie, in seconds. */
    maxAge: number
    name: string
    path: string
  }
  /** A session ends after this long without a request. */
  idleLifetime: number
  limits: LoginLimits
  /** How long a login link works. */
  linkLifetime: number
  /**
   * The answer to a request for a login link takes at least this long, so an address with an
   * account can't be told from one without by how long the answer takes.
   */
  minimumAnswerMilliseconds: number
  /**
   * A session counts a request only when the last one it counted is at least this long ago,
   * so a busy session doesn't write to the database at every page. 0 counts every request.
   */
  renewAfter: number
  tables: AccountTables
  /**
   * Whether an account that is turned off can still log in and keep its session. The admin
   * can't. A blocked supporter can, to see and close the account; the site decides what else
   * it may do.
   */
  turnedOffLogsIn: boolean
}

/** An account of a kind, as its table holds it. */
export type AccountOf<Kind extends AccountKind> = Kind['tables']['users']['$inferSelect']

/** What the module needs of the tables of a kind of account: of the admin or of supporters. */
export type AccountTables =
  | {
      attempts: typeof adminLoginAttempts
      links: typeof adminLoginLinks
      sessions: typeof adminSessions
      users: typeof adminUsers
    }
  | {
      attempts: typeof supporterLoginAttempts
      links: typeof supporterLoginLinks
      sessions: typeof supporterSessions
      users: typeof supporters
    }

/**
 * The rate limit: so many login links per address, and for the whole site, in one window.
 * Without `perSite` the kind keeps a ceiling for the whole site of its own.
 */
export type LoginLimits = { perAddress: number; perSite?: number; windowMilliseconds: number }

/**
 * What the cookie of a kind of account is made of. It holds the token of the session and
 * nothing else. It is `Secure` everywhere but in the development server, because Safari doesn't
 * keep a `Secure` cookie on http://localhost. The choice comes from `NODE_ENV` and never from
 * the `Host` header or the protocol of the request, which the sender picks.
 */
export function cookieOptionsOf(kind: AccountKind) {
  return {
    httpOnly: true,
    maxAge: kind.cookie.maxAge,
    path: kind.cookie.path,
    sameSite: 'lax',
    secure: process.env.NODE_ENV !== 'development',
  } as const
}
