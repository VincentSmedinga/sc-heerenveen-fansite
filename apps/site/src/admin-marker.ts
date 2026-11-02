/**
 * The mark that tells the main menu "an editor is logged in here", so it can show the item
 * Beheer. The cookie of the admin can't do that: it is `HttpOnly`, it only goes to /beheer, and
 * the public pages are the same for every visitor, so the server never knows who is logged in.
 * So the admin (app/beheer/layout.tsx) keeps a mark in localStorage when it sees a valid
 * session, and takes it away when it doesn't, and the menu reads it in the browser, like the
 * choice for light or dark (theme.ts).
 *
 * The mark holds no secret and nothing about the account, and it never goes to the server. It
 * only decides whether a link is shown: somebody who makes it by hand gets a link to /beheer
 * and ends up at the login page.
 */

/** The key in localStorage. */
export const adminMarkerKey = 'fansite-beheer'

/**
 * The event that tells the menu in the same tab the mark changed. A `storage` event only
 * reaches the other tabs.
 */
export const adminMarkerEvent = 'fansite-beheer-change'

const adminMarkerValue = '1'

// A test passes its own storage. Otherwise localStorage is read inside the try, because merely
// touching it throws when the browser blocks storage (Safari with "Block all cookies").

export function readAdminMarker(storage?: Storage): boolean {
  try {
    return (storage ?? localStorage).getItem(adminMarkerKey) === adminMarkerValue
  } catch {
    return false
  }
}

/** Sets the mark when an editor is logged in and takes it away when not, and tells the menu. */
export function saveAdminMarker(loggedIn: boolean, storage?: Storage) {
  try {
    const store = storage ?? localStorage

    if (loggedIn) {
      store.setItem(adminMarkerKey, adminMarkerValue)
    } else {
      store.removeItem(adminMarkerKey)
    }
  } catch {
    // Storage can be blocked: the menu then has no item Beheer.
  }

  try {
    window.dispatchEvent(new Event(adminMarkerEvent))
  } catch {
    // No window (a test of the storage alone).
  }
}

/**
 * For useSyncExternalStore: calls `onChange` when the mark changes in this tab (the event) or
 * in another one (`storage`).
 */
export function subscribeToAdminMarker(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === adminMarkerKey) {
      onChange()
    }
  }

  window.addEventListener(adminMarkerEvent, onChange)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(adminMarkerEvent, onChange)
    window.removeEventListener('storage', onStorage)
  }
}
