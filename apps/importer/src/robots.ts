/**
 * A small reader for robots.txt, following RFC 9309 (https://www.rfc-editor.org/rfc/rfc9309). It knows the groups
 * for a product token or `*`, `Allow` and `Disallow`, `*` and `$` in a path, and the longest
 * rule wins. Other lines, such as `Sitemap` and `Crawl-delay`, are ignored and do not end a
 * group.
 */

export type RobotsRule = {
  allow: boolean
  /** The path pattern, normalised: see `normalise`. */
  pattern: string
}

const encoder = new TextEncoder()

/**
 * Is the URL allowed? The longest matching rule wins, `Allow` wins a tie, and no match means
 * allowed. The path includes the query, so `/news?page=2` is matched as written. `/robots.txt`
 * itself is always allowed.
 */
export function isAllowed(rules: readonly RobotsRule[], url: URL): boolean {
  if (url.pathname === '/robots.txt') {
    return true
  }
  // A literal `*` or `$` in the path is percent-encoded, so it can't be taken for a special
  // character in a rule.
  const path = normalise(url.pathname + url.search)
    .replaceAll('*', '%2A')
    .replaceAll('$', '%24')
  let best: RobotsRule | undefined

  for (const rule of rules) {
    if (!matches(rule.pattern, path)) {
      continue
    }
    if (
      best === undefined ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow && !best.allow)
    ) {
      best = rule
    }
  }

  return best?.allow ?? true
}

/**
 * Reads the rules that apply to a product token: the groups for that token, or else the groups
 * for `*`.
 */
export function parseRobots(text: string, productToken: string): RobotsRule[] {
  const token = productToken.toLowerCase()
  const forToken: RobotsRule[] = []
  const forEveryone: RobotsRule[] = []
  let foundToken = false

  // The agents of the group being read, and whether we are still reading its user-agent lines.
  let agents: string[] = []
  let readingAgents = false

  for (const rawLine of text.replace(/^\uFEFF/u, '').split(/\r\n|\r|\n/u)) {
    const line = rawLine.replace(/#.*$/u, '').trim()
    const separator = line.indexOf(':')
    if (separator === -1) {
      continue
    }
    const field = line.slice(0, separator).trim().toLowerCase()
    const value = line.slice(separator + 1).trim()

    if (field === 'user-agent') {
      if (!readingAgents) {
        agents = []
        readingAgents = true
      }
      agents.push(value.toLowerCase())
      if (value.toLowerCase() === token) {
        foundToken = true
      }
    } else if (field === 'allow' || field === 'disallow') {
      readingAgents = false
      // An empty path, as in `Disallow:`, allows everything and so adds no rule. A path must
      // start at the root, or with `*`.
      if (value !== '' && /^[/*]/u.test(value)) {
        const rule = { allow: field === 'allow', pattern: normalise(value) }
        if (agents.includes(token)) {
          forToken.push(rule)
        }
        if (agents.includes('*')) {
          forEveryone.push(rule)
        }
      }
    }
  }

  return foundToken ? forToken : forEveryone
}

/**
 * Does a pattern match the start of a path? `*` is any run of characters, and `$` at the end
 * anchors the end.
 */
function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith('$')
  const body = anchored ? pattern.slice(0, -1) : pattern
  let pathIndex = 0
  let bodyIndex = 0
  let star = -1
  let starPathIndex = 0

  // Walks both strings, and falls back to the last `*` that can still take another character.
  // That stays within the length of the pattern times the length of the path, however hostile
  // the pattern is.
  for (;;) {
    if (bodyIndex === body.length && (!anchored || pathIndex === path.length)) {
      return true
    }
    if (body[bodyIndex] === '*') {
      star = bodyIndex
      starPathIndex = pathIndex
      bodyIndex++
    } else if (pathIndex < path.length && body[bodyIndex] === path[pathIndex]) {
      pathIndex++
      bodyIndex++
    } else if (star !== -1 && starPathIndex < path.length) {
      starPathIndex++
      pathIndex = starPathIndex
      bodyIndex = star + 1
    } else {
      return false
    }
  }
}

/**
 * Brings a path in the form RFC 9309 compares in: octets outside printable ASCII are
 * percent-encoded, and a percent-encoded octet is decoded when it is an unreserved character
 * (letters, digits, `-`, `.`, `_` and `~`).
 */
function normalise(path: string): string {
  return path
    .replace(/[^\x21-\x7e]/gu, (character) =>
      Array.from(encoder.encode(character), (byte) => `%${byte.toString(16).toUpperCase().padStart(2, '0')}`).join(''),
    )
    .replace(/%([0-9a-f]{2})/giu, (_, hex: string) => {
      const character = String.fromCharCode(Number.parseInt(hex, 16))
      return /[\w.~-]/u.test(character) ? character : `%${hex.toUpperCase()}`
    })
}
