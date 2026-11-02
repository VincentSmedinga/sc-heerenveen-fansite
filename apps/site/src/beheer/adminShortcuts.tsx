import { AdminBar } from './AdminBar'

/**
 * What the slot `@shortcuts` draws on a page under /beheer, given the parts of the path after
 * it: the bar with the screens of the admin, except on the login pages, where nobody is logged
 * in. The slot is where the bar goes because it sits between the main menu and the Page.Body,
 * and a layout under /beheer can only draw inside the Page.Body.
 */
export function adminShortcuts(rest: readonly string[] = []) {
  if (rest[0] === 'inloggen') {
    return null
  }

  return <AdminBar pathname={`/beheer${rest.map((part) => `/${part}`).join('')}`} />
}
