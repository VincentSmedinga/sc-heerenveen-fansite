import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Goes through every page, route and server action under /fans, like routes.test.ts of the
// admin does for /beheer. The files are found by looking in the folder, so a new personal page
// or action that does not start with requireSupporter fails here, and so does one that still
// answers while accounts are off.

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

// Nobody has a cookie, and the database must stay untouched: a call without a session, or with
// accounts off, is refused before it asks anything.
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: () => undefined, set: () => undefined }),
  headers: () => Promise.resolve(new Headers()),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))
vi.mock('next/server', () => ({ after: () => undefined }))
vi.mock('../database', () => ({
  getDatabase: () => {
    throw new Error('the database was used')
  },
}))

const src = path.resolve(import.meta.dirname, '..')
const fans = path.join(src, 'app/fans')

/** The pages and actions that a visitor without a session may call: the way in. */
const open = [
  'app/fans/aanmelden/actions.ts',
  'app/fans/aanmelden/bevestigen/page.tsx',
  'app/fans/aanmelden/page.tsx',
  'app/fans/aanmelden/verstuurd/page.tsx',
  // The archive of the Fantest is the same for everybody and keeps nothing of a visitor, so
  // its pages and its action need no session (issue 1480). The page of the Fantest is public
  // too: the quiz of the month shows only with a session, and its action calls
  // requireSupporter.
  'app/fans/fantest/[maand]/actions.ts',
  'app/fans/fantest/[maand]/page.tsx',
  'app/fans/fantest/page.tsx',
  // The page of the game Fjouwer: a visitor sees the match and the way in, and a supporter's
  // four is read only with a session. Its action calls requireSupporter.
  'app/fans/fjouwer/page.tsx',
  // The ranking of Fjouwer is public like that of the Prognose: screen names that chose to be
  // in the standings, and the row of the fan is marked only with a session (issue 1473).
  'app/fans/fjouwer/stand/page.tsx',
  // The page and the action of the link in a reminder: the signed code in the link says whose
  // reminder it is, so they need no session (issue 1461).
  'app/fans/herinnering/uitzetten/actions.ts',
  'app/fans/herinnering/uitzetten/page.tsx',
  'app/fans/inloggen/actions.ts',
  'app/fans/inloggen/bevestigen/page.tsx',
  'app/fans/inloggen/page.tsx',
  'app/fans/inloggen/verstuurd/page.tsx',
  // The page after closing the account, when there is no session any more; nothing personal.
  'app/fans/mijn-account/opgeheven/page.tsx',
  // The page that says what is coming, for everybody; it has nothing personal.
  'app/fans/page.tsx',
  // The page of the game Prognose: a visitor sees the match and the way in, and a supporter's
  // prediction is read only with a session. Its action calls requireSupporter.
  'app/fans/prognose/page.tsx',
  // The ranking of the game is public: it shows screen names that chose to be in the standings,
  // and the row of the supporter is marked only when there is a session (issue 1451).
  'app/fans/prognose/stand/page.tsx',
  // The rules of the games are public and hold nothing personal (issue 1455).
  'app/fans/spelregels/page.tsx',
  // The page of the game Uitblinker: a visitor sees the match and the way in, and a supporter's
  // grades are read only with a session. Its action calls requireSupporter.
  'app/fans/uitblinker/page.tsx',
  // The Uitblinker of each season is public: it holds names of players and averages of groups
  // only (issue 1474).
  'app/fans/uitblinker/van-het-jaar/page.tsx',
]

function filesUnder(folder: string) {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(src, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .toSorted()
}

const text = (file: string) => readFileSync(path.join(src, file), 'utf8')
const files = filesUnder(fans).filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file))
const routes = files.filter((file) => /(^|\/)(page\.tsx|route\.ts)$/.test(file))
const actionFiles = files.filter((file) => /^\s*(?:'use server'|"use server")/m.test(text(file)))

/** Calls every page, handler or action of a file, and gives what each one threw. */
async function callAll(file: string) {
  const isRoute = routes.includes(file)
  const calls = (await exportedFunctions(file)).filter(
    ([name]) => !isRoute || name === 'default' || /^(?:DELETE|GET|PATCH|POST|PUT)$/.test(name),
  )

  expect(calls.length, `${file} exports nothing to call`).toBeGreaterThan(0)

  return Promise.all(
    calls.map(async ([name, call]) => {
      try {
        await (isRoute
          ? call(
              { params: Promise.resolve({}), searchParams: Promise.resolve({}) },
              new Request('http://localhost/fans'),
            )
          : call())

        return { error: undefined, name }
      } catch (error) {
        return { error, name }
      }
    }),
  )
}

async function exportedFunctions(file: string) {
  const module = (await import(/* @vite-ignore */ path.join(src, file))) as Record<string, unknown>

  return Object.entries(module).filter(
    (entry): entry is [string, (...args: unknown[]) => unknown] => typeof entry[1] === 'function',
  )
}

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_PROGNOSE', 'on')
  vi.stubEnv('FANS_VIER', 'on')
  vi.stubEnv('FANS_UITBLINKER', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the pages of Fans', () => {
  it('have the way in and the account to go through', () => {
    expect(routes).toEqual(
      expect.arrayContaining([...open.filter((file) => file.endsWith('page.tsx')), 'app/fans/mijn-account/page.tsx']),
    )
    expect(actionFiles).toEqual(
      expect.arrayContaining([
        'app/fans/aanmelden/actions.ts',
        'app/fans/inloggen/actions.ts',
        'app/fans/mijn-account/actions.ts',
      ]),
    )
  })

  it('name as open only files that exist', () => {
    expect([...routes, ...actionFiles].filter((file) => open.includes(file)).toSorted()).toEqual(open)
  })

  it('call requireSupporter in every page, route and action that is not open', () => {
    const personal = [...routes, ...actionFiles].filter((file) => !open.includes(file))

    expect(personal.length).toBeGreaterThan(0)

    for (const file of personal) {
      expect(text(file), `${file} does not call requireSupporter`).toMatch(/\brequireSupporter\(/)
    }
  })

  it.each([...routes, ...actionFiles].filter((file) => !open.includes(file)))(
    'refuse a call without a session to %s',
    async (file) => {
      for (const { error, name } of await callAll(file)) {
        // To the page to log in, with or without the page to come back to.
        expect(error, `${file} ${name}`).toMatchObject({
          url: expect.stringMatching(/^\/fans\/inloggen(?:\?terug=|$)/),
        })
      }
    },
  )

  it.each([...routes, ...actionFiles])('answer not found in %s while accounts are off', async (file) => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    for (const { error, name } of await callAll(file)) {
      expect(error, `${file} ${name}`).toEqual(new Error('not found'))
    }
  })

  it.each(
    routes
      .concat(actionFiles)
      .flatMap((file) =>
        file.startsWith('app/fans/fantest/')
          ? [[file, 'FANS_FANTEST']]
          : file.startsWith('app/fans/fjouwer/')
            ? [[file, 'FANS_VIER']]
            : file.startsWith('app/fans/prognose/')
              ? [[file, 'FANS_PROGNOSE']]
              : file.startsWith('app/fans/uitblinker/')
                ? [[file, 'FANS_UITBLINKER']]
                : [],
      ),
  )('answer not found in %s while its game is off (%s) and accounts are on', async (file, setting) => {
    vi.stubEnv(setting ?? '', 'off')

    for (const { error, name } of await callAll(file ?? '')) {
      expect(error, `${file} ${name}`).toEqual(new Error('not found'))
    }
  })
})
