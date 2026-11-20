import type { adminLoginAttempts, adminLoginLinks, adminSessions, adminUsers } from '@fansite/db/schema'

// The tables of a kind of account all have the shape of the tables of the admin: an account
// with an address and a switch for turning it off, the login links with their codes, the
// sessions and the requests for the rate limit. The module makes no tables and knows nothing
// of what else an account has, such as a role.

/**
 * Everything that differs between one kind of account and another (the admin, or later the
 * supporters): the tables, the cookie, how long a link and a session work, and the limits.
 */
export type AccountKind = {
  /** A session ends this long after it began, however often it was used. */
  absoluteLifetime: number
  /** How many wrong codes a login code takes; the next try, right or wrong, is refused. */
  codeAttempts: number
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
  tables: AccountTables
}

/** What the module needs of the tables of one kind of account. */
export type AccountTables = {
  attempts: typeof adminLoginAttempts
  links: typeof adminLoginLinks
  sessions: typeof adminSessions
  users: typeof adminUsers
}

/** The rate limit: so many login links per address, and for the whole site, in one window. */
export type LoginLimits = { perAddress: number; perSite: number; windowMilliseconds: number }

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
