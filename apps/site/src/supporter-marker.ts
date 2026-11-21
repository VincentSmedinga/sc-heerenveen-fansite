/**
 * The mark that tells the header "a supporter is logged in here", so it can show the initials
 * on the account button. The cookie of the session can't do that: it is `HttpOnly`, it only
 * goes to /fans, and the public pages are the same for every visitor, so the server never knows
 * who is logged in. So the pages under /fans (app/fans/layout.tsx) keep a mark in localStorage
 * when they see a valid session, and take it away when they don't, and the header reads it in
 * the browser, like the mark of the admin (admin-marker.ts).
 *
 * The mark holds the screen name, which the supporter chose to show to others, and no secret.
 * It never goes to the server and never is HTML: the header only draws the initials. It is no
 * access: somebody who makes it by hand sees initials on a button that leads to the login.
 */

/** The key in localStorage. */
export const supporterMarkerKey = 'fansite-fans'

/**
 * The event that tells the header in the same tab the mark changed. A `storage` event only
 * reaches the other tabs.
 */
export const supporterMarkerEvent = 'fansite-fans-change'

/** More than any screen name has (20); a longer value is not one of ours. */
const longestValue = 40

// A test passes its own storage. Otherwise localStorage is read inside the try, because merely
// touching it throws when the browser blocks storage (Safari with "Block all cookies").

/**
 * The screen name in the mark, or `undefined` for no mark, a value that isn't a name, or
 * storage that can't be read.
 */
export function readSupporterMarker(storage?: Storage): string | undefined {
  try {
    const value = (storage ?? localStorage).getItem(supporterMarkerKey)

    return value === null || value.trim() === '' || value.length > longestValue ? undefined : value
  } catch {
    return undefined
  }
}

/**
 * Sets the mark to the screen name of the supporter who is logged in, or takes it away, and
 * tells the header.
 */
export function saveSupporterMarker(screenName: string | undefined, storage?: Storage) {
  try {
    const store = storage ?? localStorage

    if (screenName === undefined) {
      store.removeItem(supporterMarkerKey)
    } else {
      store.setItem(supporterMarkerKey, screenName)
    }
  } catch {
    // Storage can be blocked: the button then stays the link Inloggen.
  }

  try {
    window.dispatchEvent(new Event(supporterMarkerEvent))
  } catch {
    // No window (a test of the storage alone).
  }
}

/**
 * For useSyncExternalStore: calls `onChange` when the mark changes in this tab (the event) or
 * in another one (`storage`).
 */
export function subscribeToSupporterMarker(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === supporterMarkerKey) {
      onChange()
    }
  }

  window.addEventListener(supporterMarkerEvent, onChange)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(supporterMarkerEvent, onChange)
    window.removeEventListener('storage', onStorage)
  }
}
