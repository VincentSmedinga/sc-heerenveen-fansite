import type { LookupAddress, LookupOptions } from 'node:dns'

import { describe, expect, it } from 'vitest'

import { checkedLookup, isPublicAddress, PrivateAddressError } from './address-check.ts'

describe('isPublicAddress', () => {
  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '93.184.215.14',
    '100.63.255.255',
    '100.128.0.0',
    '172.15.255.255',
    '172.32.0.0',
    '2a00:1450:4001:82a::2004',
    '2606:4700::6810:84e5',
  ])('takes %s for public', (address) => {
    expect(isPublicAddress(address)).toBe(true)
  })

  it.each([
    // IPv4
    ['0.0.0.0', 'unspecified'],
    ['10.0.0.1', 'private'],
    ['100.64.0.1', 'shared'],
    ['100.127.255.255', 'shared'],
    ['127.0.0.1', 'loopback'],
    ['127.255.255.254', 'loopback'],
    ['169.254.169.254', 'link-local, with the metadata of a cloud'],
    ['172.16.0.1', 'private'],
    ['172.31.255.255', 'private'],
    ['192.0.0.8', 'IETF protocol assignments'],
    ['192.0.2.1', 'documentation'],
    ['192.168.1.1', 'private'],
    ['198.18.0.1', 'benchmarking'],
    ['224.0.0.1', 'multicast'],
    ['240.0.0.1', 'reserved'],
    ['255.255.255.255', 'broadcast'],
    // IPv6
    ['::', 'unspecified'],
    ['::1', 'loopback'],
    ['fc00::1', 'unique local'],
    ['fd12:3456::1', 'unique local'],
    ['fe80::1', 'link-local'],
    ['fe80::1%en0', 'link-local, with a zone'],
    ['ff02::1', 'multicast'],
    ['2001:db8::1', 'documentation'],
    ['100::1', 'discard'],
    // An IPv4 address in IPv6 form, also a public one
    ['::ffff:127.0.0.1', 'IPv4-mapped loopback'],
    ['::ffff:7f00:1', 'IPv4-mapped loopback, in hex'],
    ['::ffff:10.0.0.1', 'IPv4-mapped private'],
    ['::ffff:169.254.169.254', 'IPv4-mapped link-local'],
    ['::ffff:8.8.8.8', 'IPv4-mapped public'],
    ['::127.0.0.1', 'IPv4-compatible'],
    ['64:ff9b::7f00:1', 'NAT64'],
    ['2002:7f00:1::1', '6to4'],
    ['2001::1', 'Teredo'],
    // No address at all
    ['localhost', 'a name'],
    ['', 'nothing'],
    ['999.1.1.1', 'no valid address'],
  ])('takes %s for not public: %s', (address) => {
    expect(isPublicAddress(address)).toBe(false)
  })
})

describe('checkedLookup', () => {
  /** Asks the lookup what `net.connect` would ask, with a DNS that gives these addresses. */
  function look(addresses: LookupAddress[], options: LookupOptions = { all: true }) {
    return new Promise<{ address: LookupAddress[] | string; error: Error | null; family?: number | undefined }>(
      (resolve) => {
        checkedLookup(async () => addresses)('bron.test', options, (error, address, family) =>
          resolve({ address, error, family }),
        )
      },
    )
  }

  it('gives every address of a name that only points to the public internet', async () => {
    const addresses = [
      { address: '2a00:1450:4001:82a::2004', family: 6 },
      { address: '93.184.215.14', family: 4 },
    ]

    expect(await look(addresses)).toEqual({ address: addresses, error: null, family: undefined })
    expect(await look(addresses, { all: false })).toEqual({ address: addresses[0]?.address, error: null, family: 6 })
  })

  it.each(['127.0.0.1', '::1', '10.0.0.1', '169.254.169.254', '::ffff:127.0.0.1'])(
    'refuses a name that points to %s',
    async (address) => {
      const { error } = await look([{ address, family: address.includes(':') ? 6 : 4 }])

      expect(error).toBeInstanceOf(PrivateAddressError)
      expect(error?.message).toBe(`bron.test points to ${address}, which is not on the public internet`)
    },
  )

  it('refuses a name with one public address and one that is not', async () => {
    const { error } = await look([
      { address: '93.184.215.14', family: 4 },
      { address: '10.0.0.1', family: 4 },
    ])

    expect(error).toBeInstanceOf(PrivateAddressError)
  })

  it('passes on what the DNS says when it finds nothing', async () => {
    const notFound = Object.assign(new Error('getaddrinfo ENOTFOUND bron.test'), { code: 'ENOTFOUND' })
    const result = await new Promise<Error | null>((resolve) => {
      checkedLookup(() => Promise.reject(notFound))('bron.test', { all: true }, (error) => resolve(error))
    })

    expect(result).toBe(notFound)
    expect((await look([])).error?.message).toBe('bron.test has no address')
  })
})
