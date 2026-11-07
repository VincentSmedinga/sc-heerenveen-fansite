/*
 * How long a browser may keep the files that the site serves from `public/` (#799). They are
 * files without a hash in their name, so the file may change under the same address: a short
 * cache, and not the year of a file whose name comes from its content.
 *
 * Next.js already sends `public, max-age=31536000, immutable` for `/_next/static`, which holds
 * the scripts, the styles and the fonts. A page is rendered on each request, so Next.js sends
 * `private, no-cache, no-store` for it. Neither is set here. A page gets no `s-maxage` and no
 * other cache for a station between the server and the visitor: a cache in front of the site
 * keeps the proxy from running, so the visits would not be counted (see visits.ts).
 */

/** A day, for icons and the picture for shared links: they change when the club changes. */
export const iconCache = 'public, max-age=86400'

/**
 * An hour, for the script that puts the chosen theme on the page. It blocks the first paint, so
 * a browser that asks each time whether it changed waits for the answer before it draws, and it
 * must not stay old for long when it changes.
 */
export const themeScriptCache = 'public, max-age=3600'

/** The files in `public/` and the `Cache-Control` of each. */
export const publicFileCaches: readonly { cacheControl: string; path: string }[] = [
  { cacheControl: iconCache, path: '/apple-touch-icon.png' },
  { cacheControl: iconCache, path: '/favicon.ico' },
  { cacheControl: iconCache, path: '/icon-192.png' },
  { cacheControl: iconCache, path: '/icon-512.png' },
  { cacheControl: iconCache, path: '/icon-maskable-512.png' },
  { cacheControl: iconCache, path: '/icon.svg' },
  { cacheControl: iconCache, path: '/share-image.png' },
  { cacheControl: themeScriptCache, path: '/theme.js' },
]

/** The `headers` of next.config.ts: a rule for each file, so no page or admin path matches. */
export const cacheHeaders = () =>
  Promise.resolve(
    publicFileCaches.map(({ cacheControl, path }) => ({
      headers: [{ key: 'Cache-Control', value: cacheControl }],
      source: path,
    })),
  )
