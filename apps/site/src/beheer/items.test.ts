import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, items } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { findItem, hideItem, listItems, listLength, parseItemId, parseReason, parseSearch, showItem } from './items'
import { addItem, addSource } from './test-items'

let database: TestDatabase
let userId: number
let ids: Awaited<ReturnType<typeof addSource>>

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM sources')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  ids = await addSource(database)
})

const titles = async (search = '') => (await listItems(database.db, search)).map((item) => item.title)

describe('listItems', () => {
  it('gives the items newest first, hidden ones too', async () => {
    await addItem(database, ids, 'oud', { publishedAt: new Date('2026-10-18T08:00:00Z') })
    await addItem(database, ids, 'nieuw', { publishedAt: new Date('2026-10-21T08:00:00Z') })
    await addItem(database, ids, 'verborgen', {
      hiddenAt: new Date('2026-10-22T08:00:00Z'),
      hiddenReason: 'Fout in het bericht',
      publishedAt: new Date('2026-10-20T08:00:00Z'),
    })

    expect(await titles()).toEqual(['Kop nieuw', 'Kop verborgen', 'Kop oud'])
  })

  it('gives the newest 50 and no more', async () => {
    for (let number = 0; number < listLength + 5; number++) {
      await addItem(database, ids, `k${number}`, { publishedAt: new Date(Date.UTC(2026, 9, 1, 0, number)) })
    }

    const found = await titles()

    expect(listLength).toBe(50)
    expect(found).toHaveLength(50)
    expect(found[0]).toBe('Kop k54')
    expect(found.at(-1)).toBe('Kop k5')
  })

  it('gives the source, the headline, the link, the time, the paywall and whether it is hidden, and no key', async () => {
    await addItem(database, ids, 'een', { paywalled: true })

    const [item] = await listItems(database.db, '')

    expect(Object.keys(item ?? {}).toSorted()).toEqual([
      'hiddenAt',
      'hiddenReason',
      'id',
      'paywalled',
      'publishedAt',
      'sourceName',
      'title',
      'url',
    ])
    expect(item).toMatchObject({ hiddenAt: null, paywalled: true, sourceName: 'krant.test', title: 'Kop een' })
  })

  describe('with a search', () => {
    beforeEach(async () => {
      await addItem(database, ids, 'a', { title: 'Heerenveen wint van Ajax', url: 'https://krant.test/sport/1' })
      await addItem(database, ids, 'b', { title: 'Bestuur kiest nieuwe voorzitter', url: 'https://krant.test/club/2' })
      await addItem(database, ids, 'c', { title: '100% zeker: uitslag', url: 'https://krant.test/sport/3_x' })
    })

    it('finds a part of the headline, in any case', async () => {
      expect(await titles('wint van')).toEqual(['Heerenveen wint van Ajax'])
      expect(await titles('VOORZITTER')).toEqual(['Bestuur kiest nieuwe voorzitter'])
    })

    it('finds a part of the link', async () => {
      expect(await titles('/club/')).toEqual(['Bestuur kiest nieuwe voorzitter'])
      expect((await titles('krant.test/sport')).toSorted()).toEqual(['100% zeker: uitslag', 'Heerenveen wint van Ajax'])
    })

    it('finds a hidden item too, so a request to remove it can be answered', async () => {
      await database.db.update(items).set({ hiddenAt: new Date() }).where(eq(items.key, 'b'))

      expect(await titles('voorzitter')).toEqual(['Bestuur kiest nieuwe voorzitter'])
    })

    it('takes % and _ as themselves and no pattern', async () => {
      expect(await titles('100%')).toEqual(['100% zeker: uitslag'])
      expect(await titles('%')).toEqual(['100% zeker: uitslag'])
      expect(await titles('_')).toEqual(['100% zeker: uitslag'])
      expect(await titles('a_x')).toEqual([])
      expect(await titles('|')).toEqual([])
    })

    it('takes a quote or a backslash as text, and does not break the query', async () => {
      expect(await titles("' OR '1'='1")).toEqual([])
      expect(await titles('\\')).toEqual([])
    })

    it('gives nothing for a text that is nowhere', async () => {
      expect(await titles('bestaat niet')).toEqual([])
    })

    it('gives all items for no text', async () => {
      expect(await titles('')).toHaveLength(3)
    })
  })
})

describe('hideItem', () => {
  it('hides the item with the time, the account and the reason, and writes one row in the log', async () => {
    const id = await addItem(database, ids, 'een')
    const now = new Date('2026-10-26T10:00:00Z')

    expect(await hideItem(database.db, userId, id, 'Fout in het bericht', now)).toBe('done')

    const [item] = await database.db.select().from(items).where(eq(items.id, id))

    expect(item).toMatchObject({ hiddenAt: now, hiddenBy: userId, hiddenReason: 'Fout in het bericht' })
    expect(await database.db.select().from(auditLog)).toEqual([
      {
        action: 'item.hide',
        createdAt: now,
        id: expect.any(Number),
        itemId: id,
        reason: 'Fout in het bericht',
        userId,
      },
    ])
  })

  it('changes no other item', async () => {
    const id = await addItem(database, ids, 'een')

    await addItem(database, ids, 'twee')
    await hideItem(database.db, userId, id, 'Fout in het bericht')

    expect((await database.db.select().from(items).where(eq(items.key, 'twee')))[0]?.hiddenAt).toBeNull()
  })

  it('leaves an item that is hidden already as it is, with its first reason, and writes nothing', async () => {
    const id = await addItem(database, ids, 'een')

    await hideItem(database.db, userId, id, 'Eerste reden', new Date('2026-10-26T10:00:00Z'))

    expect(await hideItem(database.db, userId, id, 'Tweede reden', new Date('2026-10-26T11:00:00Z'))).toBe('unchanged')
    expect(await database.db.select().from(auditLog)).toHaveLength(1)
    expect((await database.db.select().from(items))[0]).toMatchObject({
      hiddenAt: new Date('2026-10-26T10:00:00Z'),
      hiddenReason: 'Eerste reden',
    })
  })

  it('says so for an item that does not exist, and writes nothing', async () => {
    expect(await hideItem(database.db, userId, 99_999, 'Fout in het bericht')).toBe('missing')
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('writes nothing and hides nothing when the account does not exist', async () => {
    const id = await addItem(database, ids, 'een')

    await expect(hideItem(database.db, 99_999, id, 'Fout in het bericht')).rejects.toBeDefined()
    expect((await database.db.select().from(items))[0]?.hiddenAt).toBeNull()
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('does not hide the item when the log refuses its row, so there is no change without a row', async () => {
    const id = await addItem(database, ids, 'een')

    // A reason of 301 characters passes the column of items only if it fits; both columns are
    // 300, so make the log refuse the row.
    await database.pool.query('ALTER TABLE audit_log MODIFY reason varchar(5)')

    try {
      await expect(hideItem(database.db, userId, id, 'Fout in het bericht')).rejects.toBeDefined()
      expect((await database.db.select().from(items))[0]?.hiddenAt).toBeNull()
    } finally {
      await database.pool.query('ALTER TABLE audit_log MODIFY reason varchar(300)')
    }
  })

  it('holds a reason of 300 characters', async () => {
    const id = await addItem(database, ids, 'een')

    expect(await hideItem(database.db, userId, id, 'x'.repeat(300))).toBe('done')
  })
})

describe('showItem', () => {
  it('shows the item again, clears who, when and why, and writes one row in the log without a reason', async () => {
    const id = await addItem(database, ids, 'een')

    await hideItem(database.db, userId, id, 'Fout in het bericht', new Date('2026-10-26T10:00:00Z'))

    const now = new Date('2026-10-26T12:00:00Z')

    expect(await showItem(database.db, userId, id, now)).toBe('done')
    expect((await database.db.select().from(items))[0]).toMatchObject({
      hiddenAt: null,
      hiddenBy: null,
      hiddenReason: null,
    })
    expect(await database.db.select().from(auditLog).orderBy(auditLog.id)).toMatchObject([
      { action: 'item.hide', reason: 'Fout in het bericht' },
      { action: 'item.show', createdAt: now, itemId: id, reason: null, userId },
    ])
  })

  it('writes nothing for an item that is shown already or does not exist', async () => {
    const id = await addItem(database, ids, 'een')

    expect(await showItem(database.db, userId, id)).toBe('unchanged')
    expect(await showItem(database.db, userId, 99_999)).toBe('missing')
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})

describe('findItem', () => {
  it('gives the headline and whether the item is hidden, or nothing for no item', async () => {
    const id = await addItem(database, ids, 'een')

    expect(await findItem(database.db, id)).toEqual({ hiddenAt: null, title: 'Kop een' })
    expect(await findItem(database.db, 99_999)).toBeUndefined()
  })
})

describe('parseItemId', () => {
  it.each([
    [1, 1],
    [42, 42],
    ['42', 42],
    [4_294_967_295, 4_294_967_295],
    ['4294967295', 4_294_967_295],
  ])('gives %j as %j', (value, expected) => {
    expect(parseItemId(value)).toBe(expected)
  })

  it.each([
    0,
    -1,
    1.5,
    4_294_967_296,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    '',
    '0',
    '-1',
    '1.5',
    '1e3',
    '0x10',
    '010',
    ' 1',
    '1 ',
    'abc',
    '99999999999',
    undefined,
    null,
    {},
    [1],
    ['1', '2'],
  ])('gives nothing for %j', (value) => {
    expect(parseItemId(value)).toBeUndefined()
  })
})

describe('parseReason', () => {
  it('gives the reason as one line, trimmed', () => {
    expect(parseReason('  Fout in het bericht ')).toEqual({ reason: 'Fout in het bericht' })
    expect(parseReason('Op verzoek\n van\tde   bron\u0000')).toEqual({ reason: 'Op verzoek van de bron' })
  })

  it.each([undefined, null, '', '   ', '\n\t', '\u0000', 42, {}, new File([], 'x')])(
    'says %j is no reason',
    (value) => {
      expect(parseReason(value)).toEqual({ error: 'leeg' })
    },
  )

  it('allows 300 characters and refuses 301, counted as the column counts them', () => {
    expect(parseReason('x'.repeat(300))).toEqual({ reason: 'x'.repeat(300) })
    expect(parseReason('x'.repeat(301))).toEqual({ error: 'lang' })
    expect(parseReason('😀'.repeat(300))).toEqual({ reason: '😀'.repeat(300) })
    expect(parseReason('😀'.repeat(301))).toEqual({ error: 'lang' })
  })

  it('keeps markup as text: the page shows it escaped', () => {
    expect(parseReason('<script>alert(1)</script>')).toEqual({ reason: '<script>alert(1)</script>' })
  })
})

describe('parseSearch', () => {
  it('gives the text of one `q`, cleaned like a reason', () => {
    expect(parseSearch(' wint   van\n')).toBe('wint van')
  })

  it('cuts a text off at 100 characters', () => {
    expect(parseSearch('x'.repeat(150))).toBe('x'.repeat(100))
    expect([...parseSearch('😀'.repeat(150))]).toHaveLength(100)
  })

  it.each([undefined, '', '   ', ['a', 'b'], ['a']])('gives nothing for %j', (value) => {
    expect(parseSearch(value)).toBe('')
  })
})
