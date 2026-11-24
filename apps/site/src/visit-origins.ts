import type { visitOrigins } from '@fansite/db/schema'

/**
 * Where a visitor comes from when it is another site, as a kind and never as an address: the
 * hosts of each kind, in one place. A host is meant with its subdomains (`m.facebook.com`).
 * Everything that is on no list is `overig`. Add a host here when a source of visitors shows up
 * under `overig` and is worth its own count.
 */
export const originHosts = {
  forum: ['forum.heerenveen.org'],
  sociaal: [
    'facebook.com',
    'instagram.com',
    'x.com',
    'twitter.com',
    't.co',
    'reddit.com',
    'linkedin.com',
    'bsky.app',
    'threads.net',
    'threads.com',
  ],
  zoekmachine: [
    'bing.com',
    'duckduckgo.com',
    'ecosia.org',
    'startpage.com',
    'qwant.com',
    'yahoo.com',
    'search.yahoo.com',
  ],
} as const satisfies Partial<Record<(typeof visitOrigins)[number], readonly string[]>>

/** Google has a host for every country (`google.nl`, `google.co.uk`). */
const google = /^(?:[a-z0-9-]+\.)*google\.[a-z]{2,3}(?:\.[a-z]{2})?$/u

const hostIn = (host: string, hosts: readonly string[]) =>
  hosts.some((known) => host === known || host.endsWith(`.${known}`))

/** The kind of origin of a host of another site. The host itself is not kept. */
export function originOf(host: string): (typeof visitOrigins)[number] {
  const lower = host.toLowerCase()

  if (hostIn(lower, originHosts.forum)) {
    return 'forum'
  }

  if (google.test(lower) || hostIn(lower, originHosts.zoekmachine)) {
    return 'zoekmachine'
  }

  return hostIn(lower, originHosts.sociaal) ? 'sociaal' : 'overig'
}
