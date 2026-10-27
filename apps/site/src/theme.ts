/**
 * The theme follows the system unless a visitor presses the theme button in the header; that
 * choice is kept on the device, in localStorage, and never goes to the server. A script in the
 * head of every page, public/theme.js, puts it on the html element before the first paint; this
 * module keeps it up to date afterwards. Keep the key and the rule of the two the same.
 *
 * Behind the button are three states, `system`, `light` and `dark`, and `system` is no key
 * at all. See chooseTheme(). The idea is from
 * https://lea.verou.me/blog/2026/dark-mode-toggles-two-states-are-enough/.
 */

export type Theme = 'dark' | 'light'

export type ThemePreference = 'system' | Theme

/** The key in localStorage. Keep it the same in public/theme.js. */
export const themeStorageKey = 'fansite-theme'

export const darkQuery = '(prefers-color-scheme: dark)'

/**
 * Where applyPreference() keeps the colour a meta tag had before it was changed, so following
 * the system restores it.
 */
const originalAttribute = 'data-original-content'

// A test passes its own storage. Otherwise localStorage is read inside the try, because merely
// touching it throws when the browser blocks storage (Safari with "Block all cookies").

/**
 * Puts the preference on the page. With a choice, `data-theme` is on the html element, and the
 * browser's own bars get the colour of the header, which a media query on the tags can't give
 * when the choice differs from the system. Following the system, there is no `data-theme` and
 * the tags are as the server wrote them. When the theme changes, Safari is told to look at the
 * colour of the top of the page again (refreshTopEdge()).
 */
export function applyPreference(preference: ThemePreference, doc: Document = document) {
  const before = doc.documentElement.dataset['theme']

  setPreference(preference, doc)

  if (doc.documentElement.dataset['theme'] !== before) {
    refreshTopEdge(doc)
  }
}

/**
 * What to keep when a visitor presses a button: the theme they wanted, unless it is what the
 * system gives anyway, which goes back to following the system. So a kept choice is always a
 * deliberate difference from the system, and the system is never out of reach. Only the button
 * calls this: a kept choice that happens to match the system later on (the system changed, not
 * the visitor) stays.
 */
export function chooseTheme(wanted: Theme, systemIsDark: boolean): ThemePreference {
  return wanted === (systemIsDark ? 'dark' : 'light') ? 'system' : wanted
}

export function readPreference(storage?: Storage): ThemePreference {
  try {
    const value = (storage ?? localStorage).getItem(themeStorageKey)

    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/**
 * Safari on an iPhone colours its status bar from the strip fixed to the top of the page (see
 * .hf-page-top-edge in page.css), and only looks at the strip again when it comes back on the
 * page: a new colour alone, a changed height or taking it out and putting it back at once don't
 * make it look. So the strip is taken off for two frames, which Safari does notice.
 */
export function refreshTopEdge(doc: Document = document) {
  const edge = doc.querySelector<HTMLElement>('.hf-page-top-edge')
  const view = doc.defaultView

  if (edge === null || view === null) {
    return
  }

  edge.style.display = 'none'
  view.requestAnimationFrame(() => {
    view.requestAnimationFrame(() => {
      edge.style.removeProperty('display')
    })
  })
}

export function resolveTheme(preference: ThemePreference, systemIsDark: boolean): Theme {
  if (preference === 'system') {
    return systemIsDark ? 'dark' : 'light'
  }

  return preference
}

export function savePreference(preference: ThemePreference, storage?: Storage) {
  try {
    const store = storage ?? localStorage

    if (preference === 'system') {
      store.removeItem(themeStorageKey)
    } else {
      store.setItem(themeStorageKey, preference)
    }
  } catch {
    // Storage can be blocked: the choice then lasts until the page loads again.
  }
}

function setPreference(preference: ThemePreference, doc: Document) {
  const root = doc.documentElement
  const metas = doc.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')

  if (preference === 'system') {
    root.removeAttribute('data-theme')

    for (const meta of metas) {
      const original = meta.getAttribute(originalAttribute)

      if (original !== null) {
        meta.content = original
        meta.removeAttribute(originalAttribute)
      }
    }

    return
  }

  root.dataset['theme'] = preference

  const header = doc.querySelector('header')
  const colour = header === null ? '' : (doc.defaultView?.getComputedStyle(header).backgroundColor ?? '')

  // An empty or transparent colour means the styles are not there (a test), and then the tags
  // stay as they are.
  if (colour === '' || colour === 'rgba(0, 0, 0, 0)') {
    return
  }

  for (const meta of metas) {
    if (!meta.hasAttribute(originalAttribute)) {
      meta.setAttribute(originalAttribute, meta.content)
    }
    meta.content = colour
  }
}
