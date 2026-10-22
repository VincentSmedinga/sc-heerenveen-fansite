import type { LookupAddress, LookupOptions } from 'node:dns'
import type { LookupFunction } from 'node:net'

import { lookup } from 'node:dns/promises'
import { BlockList, isIP } from 'node:net'
import { buildConnector } from 'undici'

/** Finds the addresses of a host name, as `lookup` of `node:dns` does with `all: true`. */
export type Resolve = (hostname: string, options: LookupOptions) => Promise<LookupAddress[]>

/** Raised while connecting to an address that is not on the public internet, so the fetcher can say so. */
export class PrivateAddressError extends Error {
  override name = 'PrivateAddressError'
}

/** The DNS of this computer. */
export const resolveInDns: Resolve = (hostname, options) => lookup(hostname, { ...options, all: true })

/**
 * The IPv4 addresses that are not on the public internet, from the IANA registry of special-purpose addresses
 * (RFC 6890).
 */
const notPublicIpv4 = new BlockList()

for (const [network, prefix] of [
  ['0.0.0.0', 8], // This network, with the unspecified address 0.0.0.0
  ['10.0.0.0', 8], // Private
  ['100.64.0.0', 10], // Shared, for carrier-grade NAT
  ['127.0.0.0', 8], // Loopback
  ['169.254.0.0', 16], // Link-local, where a cloud keeps its metadata
  ['172.16.0.0', 12], // Private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // Documentation
  ['192.88.99.0', 24], // The old 6to4 relay
  ['192.168.0.0', 16], // Private
  ['198.18.0.0', 15], // Benchmarking
  ['198.51.100.0', 24], // Documentation
  ['203.0.113.0', 24], // Documentation
  ['224.0.0.0', 4], // Multicast
  ['240.0.0.0', 4], // Reserved, with the broadcast address 255.255.255.255
] as const) {
  notPublicIpv4.addSubnet(network, prefix, 'ipv4')
}

/**
 * The IPv6 addresses that are not on the public internet. Only global unicast, `2000::/3`, is public, so the first
 * three ranges are everything else: unspecified, loopback, an IPv4 address in IPv6 form (`::ffff:0:0/96` and NAT64),
 * unique local, link-local, multicast and what is reserved. The others are the special ranges inside `2000::/3`.
 *
 * A list of its own, because a `BlockList` also checks an IPv4 address against the IPv6 ranges, in its IPv6 form.
 */
const notPublicIpv6 = new BlockList()

for (const [network, prefix] of [
  ['::', 3],
  ['4000::', 2],
  ['8000::', 1],
  ['2001::', 23], // IETF protocol assignments, with Teredo, which carries an IPv4 address
  ['2001:db8::', 32], // Documentation
  ['2002::', 16], // 6to4, which carries an IPv4 address
  ['3fff::', 20], // Documentation
] as const) {
  notPublicIpv6.addSubnet(network, prefix, 'ipv6')
}

/**
 * Makes the connections of a fetcher, and refuses an address that is not on the public internet. It checks the address
 * it really connects to: the address in the URL, or each address of the name at the moment of connecting. A check of
 * the name before the request would miss a name that points elsewhere by the time we connect.
 *
 * `testOrigins` are origins it connects to without a check, for a test with a web server of its own on this computer.
 */
export function checkedConnector(resolve: Resolve, testOrigins: string[]): buildConnector.connector {
  // HTTP/1.1, as the `fetch` of Node itself. undici would also offer HTTP/2.
  const connectChecked = buildConnector({ allowH2: false, lookup: checkedLookup(resolve) })
  const connectUnchecked = buildConnector({ allowH2: false })
  const unchecked = new Set(testOrigins.map((origin) => new URL(origin).origin))

  return (options, callback) => {
    if (unchecked.has(`${options.protocol}//${options.host}`)) {
      connectUnchecked(options, callback)
      return
    }
    // `net.connect` asks no lookup for an address, so an address in the URL is checked here. undici gives an IPv6
    // address without its brackets.
    if (isIP(options.hostname) !== 0 && !isPublicAddress(options.hostname)) {
      callback(new PrivateAddressError(`${options.hostname} is not on the public internet`), null)
      return
    }
    connectChecked(options, callback)
  }
}

/**
 * A lookup for `net.connect` that refuses a name with an address that is not on the public internet. One such address
 * is enough: we don't pick the good ones from a name that also points into a network of its own.
 */
export function checkedLookup(resolve: Resolve): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname, options).then(
      (addresses) => {
        const refused = addresses.find(({ address }) => !isPublicAddress(address))
        const [first] = addresses

        if (refused !== undefined) {
          callback(
            new PrivateAddressError(`${hostname} points to ${refused.address}, which is not on the public internet`),
            '',
          )
        } else if (first === undefined) {
          callback(new Error(`${hostname} has no address`), '')
        } else if (options.all) {
          callback(null, addresses)
        } else {
          callback(null, first.address, first.family)
        }
      },
      (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), ''),
    )
  }
}

/**
 * Whether an address is on the public internet. Anything else, such as `127.0.0.1`, `10.0.0.1`, `169.254.169.254`,
 * `::1` or `::ffff:127.0.0.1`, is on a network of its own, and so is text that is not an address.
 */
export function isPublicAddress(address: string): boolean {
  switch (isIP(address)) {
    case 4:
      return !notPublicIpv4.check(address, 'ipv4')
    case 6:
      return !notPublicIpv6.check(address, 'ipv6')
    default:
      return false
  }
}
