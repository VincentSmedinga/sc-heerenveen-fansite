import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'

// Goes through every page, route and server action of the admin and shows that a call without a session is refused. The
// files are found by looking in the folders, so nobody has to remember to add a new action to a list: a new page, route
// or action that does not start with requireRole fails here, as a call without a session that is not sent to the login page.

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

// Nobody has a cookie, and the database must stay untouched: a call without a session is refused before it asks anything.
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
    throw new Error('the database was used without a session')
  },
}))

const src = path.resolve(import.meta.dirname, '..')
const admin = path.join(src, 'app/beheer')

/** The pages and actions that anybody may call: the way in. Everything else under /beheer needs requireRole. */
const open = [
  'app/beheer/inloggen/actions.ts',
  'app/beheer/inloggen/bevestigen/page.tsx',
  'app/beheer/inloggen/page.tsx',
  'app/beheer/inloggen/verstuurd/page.tsx',
]

/** Every file under a folder, as paths relative to src with forward slashes. */
function filesUnder(folder: string) {
  return readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(src, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
    .toSorted()
}

const sourceFiles = filesUnder(src).filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file))
const text = (file: string) => readFileSync(path.join(src, file), 'utf8')

/** The pages and routes under /beheer. */
const routes = filesUnder(admin).filter((file) => /(^|\/)(page\.tsx|route\.ts)$/.test(file))

/** The files with server actions, anywhere in the site: a `'use server'` at the start of the file or of a function. */
const actionFiles = sourceFiles.filter((file) => /^\s*(?:'use server'|"use server")/m.test(text(file)))

/** The functions a module exports: an action, the default export of a page, or the handler of a route. */
async function exportedFunctions(file: string) {
  const module = (await import(/* @vite-ignore */ path.join(src, file))) as Record<string, unknown>

  return Object.entries(module).filter(
    (entry): entry is [string, (...args: unknown[]) => unknown] => typeof entry[1] === 'function',
  )
}

describe('the admin', () => {
  it('has pages, routes and actions to go through', () => {
    expect(routes.length).toBeGreaterThanOrEqual(4)
    expect(actionFiles).toContain('app/beheer/actions.ts')
  })

  it('names as open only files that exist, and no file that a visitor without a session should not reach', () => {
    expect([...routes, ...actionFiles].filter((file) => open.includes(file)).toSorted()).toEqual(open)
    expect(open.every((file) => file.startsWith('app/beheer/inloggen/'))).toBe(true)
  })

  it('calls requireRole in every page, route and action that is not open', () => {
    const guarded = [...routes, ...actionFiles].filter((file) => !open.includes(file))

    expect(guarded.length).toBeGreaterThan(1)

    for (const file of guarded) {
      expect(text(file), `${file} does not call requireRole`).toMatch(/\brequireRole\(/)
    }
  })

  it.each(routes.filter((file) => !open.includes(file)))('refuses a call without a session to %s', async (file) => {
    const handlers = await exportedFunctions(file)
    const calls = handlers.filter(([name]) => name === 'default' || /^(?:DELETE|GET|PATCH|POST|PUT)$/.test(name))

    expect(calls.length, `${file} exports no page or handler`).toBeGreaterThan(0)

    for (const [name, handler] of calls) {
      await expect(
        Promise.resolve().then(() =>
          handler(
            { params: Promise.resolve({}), searchParams: Promise.resolve({}) },
            new Request('http://localhost/beheer'),
          ),
        ),
        `${file} ${name}`,
      ).rejects.toMatchObject({ url: '/beheer/inloggen' })
    }
  })

  it.each(actionFiles.filter((file) => !open.includes(file)))(
    'refuses a call without a session to every action in %s',
    async (file) => {
      const actions = await exportedFunctions(file)

      expect(actions.length, `${file} exports no action`).toBeGreaterThan(0)

      // No arguments: a refusal comes before the arguments are read, so an action that reads them first fails here too.
      for (const [name, action] of actions) {
        await expect(
          Promise.resolve().then(() => action()),
          `${file} ${name}`,
        ).rejects.toMatchObject({
          url: '/beheer/inloggen',
        })
      }
    },
  )
})
