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
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the pages of Fans', () => {
  it('have the way in and the account to go through', () => {
    expect(routes).toEqual(
      expect.arrayContaining([...open.filter((file) => file.endsWith('page.tsx')), 'app/fans/mijn-account/page.tsx']),
    )
    expect(actionFiles).toContain('app/fans/aanmelden/actions.ts')
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
        expect(error, `${file} ${name}`).toMatchObject({ url: '/fans/aanmelden' })
      }
    },
  )

  it.each([...routes, ...actionFiles])('answer not found in %s while accounts are off', async (file) => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    for (const { error, name } of await callAll(file)) {
      expect(error, `${file} ${name}`).toEqual(new Error('not found'))
    }
  })
})
