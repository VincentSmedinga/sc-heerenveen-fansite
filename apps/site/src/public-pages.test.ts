import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// The pages of the site, the header included, are the same HTML for every visitor (issue 1450):
// the account button learns who is logged in from a mark in the browser (supporter-marker.ts),
// not from the session on the server. So no file outside the pages and the code of Fans may
// read the session of a supporter, or its cookie. Only the pages under /fans do, and the cookie
// only goes there.

const root = import.meta.dirname

const sources = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const path = join(folder, entry.name)

    if (entry.isDirectory()) {
      return sources(path)
    }

    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })

const allowed = (file: string) =>
  ['app/fans/', 'fans/', 'login/'].some((folder) => relative(root, file).startsWith(folder)) ||
  // The admin has a session of its own, and the pages of Fans in the admin read the accounts.
  relative(root, file).startsWith('beheer/') ||
  relative(root, file).startsWith('app/beheer/')

describe('the public pages', () => {
  const outside = sources(root).filter((file) => !allowed(file))

  it('are many, so the check looks at something', () => {
    expect(outside.length).toBeGreaterThan(50)
  })

  it.each(['require-supporter', 'supporter-login', 'currentSupporter', 'supporterToken', 'fans-sessie'])(
    'never mention %s, so none is built per person',
    (name) => {
      const found = outside.filter((file) => readFileSync(file, 'utf8').includes(name))

      expect(found.map((file) => relative(root, file))).toEqual([])
    },
  )
})
