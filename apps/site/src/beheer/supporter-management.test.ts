import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, supporterBlockedAddresses, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { blockedAddressHash } from '../fans/blocked-addresses'
import { changeScreenName } from '../fans/change-name'
import { closeAccount } from '../fans/close-account'
import { screenNameKey } from '../fans/screen-name'
import { createAccount } from './accounts'
import {
  blockSupporter,
  checkBlock,
  findSupporter,
  forgetBlockedAddress,
  listSupporters,
  renameSupporter,
  supportersPerPage,
  unblockSupporter,
} from './supporter-management'

const start = new Date('2026-11-21T10:00:00Z')

let database: TestDatabase
let editor = 0

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.db.delete(supporterBlockedAddresses)
  await database.db.delete(supporters)
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'redacteur@example.test', 'editor', 'Ruben')
  editor = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

async function add(screenName: string, email: string, createdAt = start) {
  const [inserted] = await database.db
    .insert(supporters)
    .values({ createdAt, email, screenName, screenNameKey: screenNameKey(screenName) })

  return inserted.insertId
}

describe('the list', () => {
  it('has the newest first and no address', async () => {
    await add('Oud', 'oud@example.test', new Date('2026-10-01T10:00:00Z'))
    await add('Nieuw', 'nieuw@example.test', new Date('2026-11-20T10:00:00Z'))

    const { rows, total } = await listSupporters(database.db, '', 1)

    expect(total).toBe(2)
    expect(rows.map(({ screenName }) => screenName)).toEqual(['Nieuw', 'Oud'])
    expect(JSON.stringify(rows)).not.toContain('example.test')
    expect(Object.keys(rows[0] ?? {}).toSorted()).toEqual(['blocked', 'createdAt', 'id', 'lastVisitOn', 'screenName'])
  })

  it('finds a part of a name, without capitals, accents and spaces, and takes the characters of a pattern literally', async () => {
    await add('Tjalle_Dé 99', 'a@example.test')
    await add('Sietske', 'b@example.test')

    const names = async (query: string) =>
      (await listSupporters(database.db, query, 1)).rows.map(({ screenName }) => screenName)

    expect(await names('TJALLE')).toEqual(['Tjalle_Dé 99'])
    expect(await names('de 9')).toEqual(['Tjalle_Dé 99'])
    expect(await names('tjálle')).toEqual(['Tjalle_Dé 99'])
    expect(await names('xyz')).toEqual([])
    // A query without a letter or a digit shows everything, and a % is no wildcard.
    expect(await names('-')).toHaveLength(2)
    expect(await names('%')).toEqual([])
    expect(await names('s%tske')).toEqual([])
  })

  it('divides the accounts into pages', async () => {
    for (let number = 0; number < supportersPerPage + 3; number += 1) {
      await add(`Naam${number}`, `n${number}@example.test`, new Date(start.getTime() + number * 1000))
    }

    const first = await listSupporters(database.db, '', 1)
    const second = await listSupporters(database.db, '', 2)
    const far = await listSupporters(database.db, '', 99)

    expect([first.rows.length, second.rows.length, first.pages]).toEqual([supportersPerPage, 3, 2])
    expect(second.rows[0]?.screenName).toBe('Naam2')
    expect(far.page).toBe(2)
  })
})

describe('one account', () => {
  it('gives the address only when it is asked for', async () => {
    const id = await add('Tjalle99', 'tjalle@example.test')

    expect(await findSupporter(database.db, id, true)).toMatchObject({ email: 'tjalle@example.test' })
    expect(JSON.stringify(await findSupporter(database.db, id, false))).not.toContain('example.test')
    expect(await findSupporter(database.db, id + 1, false)).toBeUndefined()
  })
})

describe('changing a name', () => {
  it('changes it with the rules of signing up, outside the own limit of the supporter, and says so once', async () => {
    const id = await add('Rotzak99', 'a@example.test')

    expect(await renameSupporter(database.db, editor, id, 'Vriendelijk', start)).toEqual({ answer: 'changed' })
    expect((await database.db.select().from(supporters))[0]).toMatchObject({
      screenName: 'Vriendelijk',
      screenNameChangedAt: null,
      screenNameEditedByEditors: true,
    })
    // The supporter can still change the name once, as it was not their own change.
    expect(await changeScreenName(database.db, id, 'Mijn eigen', start)).toEqual({ answer: 'changed' })
  })

  it('refuses a name that is refused, bad, or taken, and keeps the old one', async () => {
    const id = await add('Rotzak99', 'a@example.test')

    await add('Sietske', 'b@example.test')

    expect(await renameSupporter(database.db, editor, id, 'Fansite redactie', start)).toEqual({
      answer: 'invalid',
      error: { problem: 'refused' },
    })
    expect(await renameSupporter(database.db, editor, id, 'ab', start)).toMatchObject({ answer: 'invalid' })
    expect(await renameSupporter(database.db, editor, id, 'SIETSKE', start)).toEqual({
      answer: 'invalid',
      error: { problem: 'taken' },
    })
    expect(await renameSupporter(database.db, editor, id, 'Rotzak99', start)).toEqual({ answer: 'unchanged' })
    expect(await renameSupporter(database.db, editor, id + 99, 'Nieuwe naam', start)).toEqual({ answer: 'missing' })
    expect((await database.db.select().from(supporters).where(eq(supporters.id, id)))[0]).toMatchObject({
      screenName: 'Rotzak99',
      screenNameEditedByEditors: false,
    })
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('writes a line without the old and the new name', async () => {
    const id = await add('Rotzak99', 'a@example.test')

    await renameSupporter(database.db, editor, id, 'Vriendelijk', start)

    expect(await database.db.select().from(auditLog)).toEqual([
      {
        action: 'supporter.rename',
        createdAt: start,
        detail: null,
        id: expect.any(Number) as number,
        itemId: id,
        reason: null,
        userId: editor,
      },
    ])
  })
})

describe('blocking', () => {
  it('needs a reason from the list, and for "anders" an explanation', () => {
    expect(checkBlock({ reden: '', toelichting: '' })).toEqual({ errors: { reden: 'Kies een reden.' } })
    expect(checkBlock({ reden: 'iets', toelichting: '' })).toEqual({ errors: { reden: 'Kies een reden.' } })
    expect(checkBlock({ reden: 'schermnaam', toelichting: '' })).toEqual({ reason: 'ongepaste schermnaam' })
    expect(checkBlock({ reden: 'nadoen', toelichting: 'x' })).toEqual({ reason: 'doet zich voor als een ander' })
    expect(checkBlock({ reden: 'misbruik', toelichting: '' })).toEqual({ reason: 'misbruik van een spel' })
    expect(checkBlock({ reden: 'anders', toelichting: '  ' })).toMatchObject({
      errors: { toelichting: expect.any(String) as string },
    })
    expect(checkBlock({ reden: 'anders', toelichting: 'x'.repeat(301) })).toMatchObject({
      errors: { toelichting: expect.any(String) as string },
    })
    expect(checkBlock({ reden: 'anders', toelichting: ' Spam in de naam ' })).toEqual({
      reason: 'anders: Spam in de naam',
    })
  })

  it('blocks and lifts, each with a line with the number and the reason, and never a name or an address', async () => {
    const id = await add('Rotzak99', 'rotzak@example.test')

    expect(await blockSupporter(database.db, editor, id, 'ongepaste schermnaam', start)).toBe('blocked')
    expect(await blockSupporter(database.db, editor, id, 'ongepaste schermnaam', start)).toBe('already')
    expect((await findSupporter(database.db, id, false))?.blocked).toBe(true)
    expect(await unblockSupporter(database.db, editor, id, start)).toBe('unblocked')
    expect(await unblockSupporter(database.db, editor, id, start)).toBe('not-blocked')
    expect((await findSupporter(database.db, id, false))?.blocked).toBe(false)
    expect(await blockSupporter(database.db, editor, id + 99, 'x', start)).toBe('missing')
    expect(await unblockSupporter(database.db, editor, id + 99, start)).toBe('missing')

    const lines = await database.db.select().from(auditLog)

    expect(lines.map(({ action, itemId, reason, userId }) => ({ action, itemId, reason, userId }))).toEqual([
      { action: 'supporter.block', itemId: id, reason: 'ongepaste schermnaam', userId: editor },
      { action: 'supporter.unblock', itemId: id, reason: null, userId: editor },
    ])
    expect(JSON.stringify(lines)).not.toMatch(/rotzak/iu)
  })
})

describe('the hash of a blocked address', () => {
  it('is kept when a blocked account closes, and is removed by the owner with a line without the address', async () => {
    const id = await add('Rotzak99', 'rotzak@example.test')

    await blockSupporter(database.db, editor, id, 'misbruik van een spel', start)
    await closeAccount(database.db, id, start)

    expect(await forgetBlockedAddress(database.db, editor, 'niet-een-adres', start)).toBe('invalid')
    expect(await forgetBlockedAddress(database.db, editor, 'anders@example.test', start)).toBe('none')
    expect(await database.db.select().from(supporterBlockedAddresses)).toHaveLength(1)
    expect(await forgetBlockedAddress(database.db, editor, ' Rotzak@Example.test ', start)).toBe('removed')
    expect(await database.db.select().from(supporterBlockedAddresses)).toEqual([])

    const lines = (await database.db.select().from(auditLog)).filter(
      ({ action }) => action === 'supporter.forget-address',
    )

    expect(lines).toHaveLength(1)
    expect(JSON.stringify(lines)).not.toMatch(/rotzak|example/iu)
    expect(blockedAddressHash('rotzak@example.test')).toMatch(/^[0-9a-f]{64}$/u)
  })

  it('is not kept for an account that was not blocked, or whose block was lifted', async () => {
    const plain = await add('Gewoon', 'gewoon@example.test')
    const lifted = await add('Weer goed', 'goed@example.test')

    await blockSupporter(database.db, editor, lifted, 'anders: test', start)
    await unblockSupporter(database.db, editor, lifted, start)
    await closeAccount(database.db, plain, start)
    await closeAccount(database.db, lifted, start)

    expect(await database.db.select().from(supporterBlockedAddresses)).toEqual([])
  })
})
