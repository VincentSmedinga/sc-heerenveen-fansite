import type { AdminRole } from '@fansite/db/schema'

// The roles are written out here instead of imported from the schema, because the bar is a
// client component and the schema must not go into the browser. `screens.test.ts` keeps them
// the same.

/** Every role: the owner, an editor and an author. */
export const allRoles: readonly AdminRole[] = ['owner', 'editor', 'author']

/** The roles that do the work of the editors (`editorRoles` in the schema). */
export const workRoles: readonly AdminRole[] = ['owner', 'editor']

/** The address of Mijn account, whose link in the bar is the first name of the account. */
export const myAccountHref = '/beheer/mijn-account'

/** A screen of the admin, as the bar under the main menu lists it. */
export type Screen = {
  href: string
  label: string
  /** Whether the screen is for the accounts of supporters: it is hidden while they are off. */
  needsAccounts?: boolean
  roles: readonly AdminRole[]
}

/**
 * Every screen of the admin, in the order the bar shows them, and the roles that may see it.
 * A new screen is one line here. The bar is a map and no guard: the page of the screen still
 * calls requireRole() itself.
 */
export const screens: readonly Screen[] = [
  { href: '/beheer', label: 'Beheer', roles: allRoles },
  { href: '/beheer/berichten', label: 'Berichten', roles: workRoles },
  { href: '/beheer/artikelen', label: 'Artikelen', roles: allRoles },
  { href: '/beheer/wedstrijden', label: 'Wedstrijden', roles: workRoles },
  { href: '/beheer/spelers', label: 'Spelers', roles: workRoles },
  { href: '/beheer/stadions', label: 'Stadions', roles: workRoles },
  { href: '/beheer/clubs', label: 'Clubs', roles: workRoles },
  { href: '/beheer/bezoek', label: 'Bezoek', roles: workRoles },
  { href: '/beheer/supporters', label: 'Fans', needsAccounts: true, roles: workRoles },
  { href: '/beheer/accounts', label: 'Accounts', roles: ['owner'] },
  { href: myAccountHref, label: 'Mijn account', roles: allRoles },
]

/**
 * The screen a path belongs to, as its href: the screen itself and every page below it, such as
 * `/beheer/artikelen/12`. Beheer is the start page alone, because every address of the admin
 * starts with it. A path that is no screen's has none.
 */
export function currentScreen(pathname: string): string | undefined {
  return screens
    .filter((screen) => (screen.href === '/beheer' ? pathname === screen.href : isAtOrBelow(pathname, screen.href)))
    .toSorted((a, b) => b.href.length - a.href.length)[0]?.href
}

/**
 * Whether a path is one of the login pages, where nobody is logged in and so the bar has no
 * place. It is the address of `loginPath` (src/beheer/require-role.ts), written out because
 * that file can't go into the browser.
 */
export function isLoginPage(pathname: string): boolean {
  return isAtOrBelow(pathname, '/beheer/inloggen')
}

/**
 * The screens a role may see. `accountsOn` is whether the accounts of supporters are on (the
 * server knows, the browser does not); while they are off, their screen is not in the bar.
 */
export function screensFor(role: AdminRole, accountsOn = true): Screen[] {
  return screens.filter((screen) => screen.roles.includes(role) && (accountsOn || screen.needsAccounts !== true))
}

function isAtOrBelow(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
