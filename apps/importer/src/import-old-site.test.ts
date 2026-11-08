import type { TestDatabase } from '@fansite/db/test-database'

import { lockNameFor, withLock } from '@fansite/db/lock'
import { clubNames, clubs } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { execFile } from 'node:child_process'
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteStep } from './old-site-step.ts'

import { defaultOldSiteFolder, formatStepReport, oldSiteSteps, runOldSiteImport } from './import-old-site.ts'
import { oldSiteClubIds } from './old-site-clubs.ts'
import { oldSiteDataFolder, readOldSiteData } from './old-site-file.ts'

let database: TestDatabase
let folder: string

/** A small set of files: three clubs, two of them in the database under another spelling. */
const small = {
  clubs: {
    clubs: [
      { code: 'cambuurleeuwarden', country: 'NL', name: 'Cambuur Lwd.' },
      { code: 'fcbasel', country: 'CH', name: 'FC Basel' },
      { code: 'nec', country: 'NL', name: 'NEC' },
    ],
    version: 1,
  },
  players: { players: [], version: 1 },
}

beforeAll(async () => {
  database = await createTestDatabase()
  folder = mkdtempSync(path.join(tmpdir(), 'fansite-old-site-'))
  writeFileSync(path.join(folder, 'clubs.json'), JSON.stringify(small.clubs))
  writeFileSync(path.join(folder, 'players.json'), JSON.stringify(small.players))
})

afterAll(async () => {
  rmSync(folder, { force: true, recursive: true })
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM clubs')
  await database.db.insert(clubs).values([
    { name: 'N.E.C.', slug: 'nec', wikipediaPage: 'N.E.C.' },
    { name: 'SC Cambuur', slug: 'sc-cambuur', wikipediaPage: 'SC Cambuur' },
  ])
})

/** Runs the command against the small files and collects what it prints. */
async function run(options: Parameters<typeof runOldSiteImport>[1] = {}) {
  const lines: string[] = []
  const code = await runOldSiteImport(database.url, { folder, write: (line) => lines.push(line), ...options })

  return { code, text: lines.join('\n') }
}

const clubCount = async () => (await database.db.select().from(clubs)).length

describe('the command', () => {
  it('runs the step clubs and writes a line for it', async () => {
    const { code, text } = await run()

    expect(code).toBe(0)
    expect(text.split('\n')).toEqual([
      'Old site, step clubs: 1 new, 1 updated, 1 unchanged, 0 skipped',
      "  club 'SC Cambuur' is old fansite club 'Cambuur Lwd.' (cambuurleeuwarden), name added",
      "  new club 'FC Basel' for old fansite club 'FC Basel' (fcbasel)",
      'Old site, step matches: 0 new, 0 updated, 0 unchanged, 0 skipped',
      'Old site, step spelers: 0 new, 0 updated, 0 unchanged, 0 skipped',
      'Old site, step doelpunten: 0 new, 0 updated, 0 unchanged, 0 skipped',
      '  0 matches get goals, 0 add up without goals, 0 have a score and no goals, 0 have part of the goals',
      'Old site: 4 of 4 steps done.',
    ])
  })

  it('changes nothing in a second run', async () => {
    await run()

    const before = { clubs: await database.db.select().from(clubs), names: await database.db.select().from(clubNames) }
    const { code, text } = await run()

    expect(code).toBe(0)
    expect(text).toBe(
      [
        'Old site, step clubs: 0 new, 0 updated, 3 unchanged, 0 skipped',
        'Old site, step matches: 0 new, 0 updated, 0 unchanged, 0 skipped',
        'Old site, step spelers: 0 new, 0 updated, 0 unchanged, 0 skipped',
        'Old site, step doelpunten: 0 new, 0 updated, 0 unchanged, 0 skipped',
        '  0 matches get goals, 0 add up without goals, 0 have a score and no goals, 0 have part of the goals',
        'Old site: 4 of 4 steps done.',
      ].join('\n'),
    )
    expect({
      clubs: await database.db.select().from(clubs),
      names: await database.db.select().from(clubNames),
    }).toEqual(before)
  })

  it('runs the steps in their order, one after the other, and writes a line for each', async () => {
    const order: string[] = []
    const step = (name: string): OldSiteStep => ({
      name,
      run: async () => {
        order.push(name)

        return { changed: 0, created: 1, lines: [`did ${name}`], skipped: 0, unchanged: 2 }
      },
    })

    const { code, text } = await run({ steps: [step('clubs'), step('matches'), step('goals')] })

    expect(code).toBe(0)
    expect(order).toEqual(['clubs', 'matches', 'goals'])
    expect(text.split('\n')).toEqual([
      'Old site, step clubs: 1 new, 0 updated, 2 unchanged, 0 skipped',
      '  did clubs',
      'Old site, step matches: 1 new, 0 updated, 2 unchanged, 0 skipped',
      '  did matches',
      'Old site, step goals: 1 new, 0 updated, 2 unchanged, 0 skipped',
      '  did goals',
      'Old site: 3 of 3 steps done.',
    ])
  })

  it('has the steps clubs, matches, spelers and doelpunten, in that order', () => {
    expect(oldSiteSteps.map((step) => step.name)).toEqual(['clubs', 'matches', 'spelers', 'doelpunten'])
  })

  it('shows what it would do with --dry-run, and writes nothing', async () => {
    const before = await clubCount()
    const { code, text } = await run({ dryRun: true })

    expect(code).toBe(0)
    expect(text).toContain('Old site, step clubs: 1 new, 1 updated, 1 unchanged, 0 skipped')
    expect(text).toContain('Dry run, nothing is written. Old site: 4 of 4 steps done.')
    expect(await clubCount()).toBe(before)
    expect(await database.db.select().from(clubNames)).toEqual([])
  })

  it('lets a later step in a dry run see what the steps before it would write', async () => {
    let seen = 0
    const second: OldSiteStep = {
      name: 'second',
      run: async (db, data) => {
        seen = (await oldSiteClubIds(db, data.clubs)).size

        return { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
      },
    }
    const clubStep = oldSiteSteps[0]!

    await run({ dryRun: true, steps: [clubStep, second] })

    expect(seen).toBe(3)
    expect(await oldSiteClubIds(database.db, small.clubs.clubs)).toHaveProperty('size', 2)
  })

  it('refuses a file that does not fit, before it writes anything', async () => {
    const bad = mkdtempSync(path.join(tmpdir(), 'fansite-old-site-bad-'))

    try {
      writeFileSync(
        path.join(bad, 'clubs.json'),
        JSON.stringify({ clubs: [{ code: 'x', country: 'NL', email: 'a@b.nl', name: 'X' }], version: 1 }),
      )
      writeFileSync(path.join(bad, 'players.json'), JSON.stringify(small.players))

      const before = await clubCount()
      const { code, text } = await run({ folder: bad })

      expect(code).toBe(1)
      expect(text).toContain("The files of the old fansite can't be used, so nothing was written.")
      expect(text).toContain('clubs.json does not match the format')
      expect(await clubCount()).toBe(before)
    } finally {
      rmSync(bad, { force: true, recursive: true })
    }
  })

  it('refuses a folder without the files', async () => {
    const empty = mkdtempSync(path.join(tmpdir(), 'fansite-old-site-empty-'))

    try {
      const { code, text } = await run({ folder: empty })

      expect(code).toBe(1)
      expect(text).toContain('needs one clubs file and one players file')
    } finally {
      rmSync(empty, { force: true, recursive: true })
    }
  })

  it('does nothing while an import holds the lock, and says so', async () => {
    const before = await clubCount()
    const held = await withLock(database.pool, lockNameFor(database.url, 'import'), 0, () => run())

    expect(held.ran && held.result).toMatchObject({ code: 1 })
    expect(held.ran && held.result.text).toContain('An import is still running on this database')
    expect(await clubCount()).toBe(before)
  })

  it('stops at a step that fails, leaves nothing of that step behind and keeps the steps before it', async () => {
    const ran: string[] = []
    const first: OldSiteStep = {
      name: 'first',
      run: async (db) => {
        ran.push('first')
        await db.insert(clubs).values({ name: 'Eerste FC', slug: 'eerste-fc' })

        return { changed: 0, created: 1, lines: [], skipped: 0, unchanged: 0 }
      },
    }
    const broken: OldSiteStep = {
      name: 'broken',
      run: async (db) => {
        ran.push('broken')
        await db.insert(clubs).values({ name: 'Half FC', slug: 'half-fc' })
        throw new Error('the file has a match with no club')
      },
    }
    const never: OldSiteStep = {
      name: 'never',
      run: async () => {
        ran.push('never')

        return { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
      },
    }
    const { code, text } = await run({ steps: [first, broken, never] })

    expect(code).toBe(1)
    expect(ran).toEqual(['first', 'broken'])
    expect(text).toContain(
      'Old site, step broken: not done, nothing was changed by it. the file has a match with no club',
    )
    expect(text).toContain('Old site: stopped.')
    expect((await database.db.select().from(clubs)).map((row) => row.name)).toContain('Eerste FC')
    expect((await database.db.select().from(clubs)).map((row) => row.name)).not.toContain('Half FC')
  })

  it('shows a failure in a dry run too, and still writes nothing', async () => {
    const broken: OldSiteStep = {
      name: 'broken',
      run: async () => {
        throw new Error('no good')
      },
    }
    const before = await clubCount()
    const { code, text } = await run({ dryRun: true, steps: [oldSiteSteps[0]!, broken] })

    expect(code).toBe(1)
    expect(text).toContain('Old site, step broken: not done')
    expect(await clubCount()).toBe(before)
  })
})

describe('the files in the repository', () => {
  it('makes a club of every club of the old fansite, finds them all again, and a second run changes nothing', async () => {
    const { clubs: oldClubs } = await readOldSiteData(oldSiteDataFolder)
    const first = await run({ folder: oldSiteDataFolder })
    const second = await run({ folder: oldSiteDataFolder })
    const ids = await oldSiteClubIds(database.db, oldClubs)

    expect(oldClubs).toHaveLength(91)
    expect(first.code).toBe(0)
    expect(first.text).toMatch(/^Old site, step clubs: \d+ new, \d+ updated, \d+ unchanged, 0 skipped/u)
    expect(second.text).toContain(`Old site, step clubs: 0 new, 0 updated, ${oldClubs.length} unchanged, 0 skipped`)
    expect(first.text).toContain('Old site, step matches: 671 new, 0 updated, 0 unchanged, 0 skipped')
    expect(second.text).toContain('Old site, step matches: 0 new, 0 updated, 671 unchanged, 0 skipped')
    expect(first.text).toContain('Old site, step spelers: 427 new, 0 updated, 0 unchanged, 0 skipped')
    expect(second.text).toContain('Old site, step spelers: 0 new, 0 updated, 427 unchanged, 0 skipped')
    expect(first.text).toContain('Old site, step doelpunten: 1763 new, 0 updated, 0 unchanged, 67 skipped')
    expect(second.text).toContain('Old site, step doelpunten: 0 new, 0 updated, 1763 unchanged, 67 skipped')
    expect(second.text).toContain('Old site: 4 of 4 steps done.')
    expect(ids.size).toBe(oldClubs.length)
    // The two clubs the test started with are among them, so a club is one row, not two.
    expect((await database.db.select().from(clubs)).length).toBeLessThan(oldClubs.length + 2)
    expect(await database.db.select().from(clubs).where(eq(clubs.slug, 'sc-cambuur'))).toHaveLength(1)
  })

  it('finds the files next to the repository when there is no folder next to the bundle', () => {
    expect(defaultOldSiteFolder().href).toBe(oldSiteDataFolder.href)
  })

  it('formats a report as a line and the lines under it', () => {
    expect(formatStepReport('clubs', { changed: 2, created: 1, lines: ['a', 'b'], skipped: 0, unchanged: 3 })).toBe(
      'Old site, step clubs: 1 new, 2 updated, 3 unchanged, 0 skipped\n  a\n  b',
    )
  })
})

describe('the bundle', () => {
  it('reads the files next to import.mjs on the host and refuses a wrong argument', async () => {
    const { bundleImporter } = await import('./bundle.ts')
    const host = mkdtempSync(path.join(tmpdir(), 'fansite-old-site-host-'))

    try {
      await bundleImporter(path.join(host, 'import.mjs'))
      cpSync(new URL('./', oldSiteDataFolder), path.join(host, 'data/oude-fansite'), { recursive: true })

      const node = (...args: string[]) =>
        promisify(execFile)(process.execPath, [path.join(host, 'import.mjs'), ...args], {
          cwd: host,
          env: { DATABASE_URL: database.url, PATH: process.env['PATH'] },
        })
      const dry = await node('--old-site', '--dry-run')

      expect(dry.stdout).toContain('Old site, step clubs:')
      expect(dry.stdout).toContain('Old site, step matches: 671 new')
      expect(dry.stdout).toContain('Old site, step doelpunten: 1763 new')
      expect(dry.stdout).toContain('Dry run, nothing is written. Old site: 4 of 4 steps done.')
      // --dry-run belongs to --old-site alone.
      await expect(node('--dry-run')).rejects.toMatchObject({ code: 2 })
      await expect(node('--old-site', '--status')).rejects.toMatchObject({ code: 2 })
    } finally {
      rmSync(host, { force: true, recursive: true })
    }
  }, 30_000)
})
