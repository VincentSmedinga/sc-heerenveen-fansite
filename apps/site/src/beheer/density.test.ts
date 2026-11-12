import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { compact } from './density'

// The class is on the Page.Main of every page under /beheer, and nowhere else: the header and
// the footer of the site, and the public pages, keep the room they have. The pages are found by
// looking in the folder, so a new page that forgets the class fails here.

const src = path.resolve(import.meta.dirname, '..')
const admin = path.join(src, 'app/beheer')

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? files(path.join(dir, entry.name)) : [path.join(dir, entry.name)],
  )

const read = (file: string) => readFileSync(file, 'utf8')
const pages = files(admin).filter((file) => file.endsWith('/page.tsx'))

describe('the compact density of the admin', () => {
  it('is the class of the design system', () => {
    expect(compact).toBe('hf-density-compact')
  })

  it('finds the pages of the admin', () => {
    expect(pages.length).toBeGreaterThan(10)
  })

  it('is on the Page.Main of every page under /beheer, once', () => {
    for (const page of pages) {
      const source = read(page)

      expect(source.match(/<Page\.Main/g), page).toHaveLength(1)
      expect(source, page).toMatch(/<Page\.Main\s+areas=\{[^}]+\}\s+className=\{compact\}/)
      expect(source, page).toContain("import { compact } from '")
    }
  })

  it('is used nowhere outside the admin', () => {
    const others = files(src).filter(
      (file) =>
        /\.tsx?$/.test(file) &&
        !file.startsWith(`${admin}${path.sep}`) &&
        !/beheer\/density(?:\.test)?\.ts$/.test(file),
    )

    for (const file of others) {
      expect(read(file), file).not.toMatch(/hf-density|beheer\/density|'\.\/density'/)
    }
  })
})
