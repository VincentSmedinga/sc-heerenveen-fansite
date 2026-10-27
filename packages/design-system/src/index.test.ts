import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import * as designSystem from './index'

const root = join(import.meta.dirname, '..')

const components = [
  'Article',
  'ArticleCard',
  'Body',
  'Button',
  'Card',
  'DataTable',
  'DiscussionItem',
  'Emphasis',
  'ErrorSummary',
  'Field',
  'Filter',
  'Form',
  'Heading',
  'Honeypot',
  'Input',
  'Link',
  'List',
  'Logo',
  'Match',
  'Navigation',
  'NewsItem',
  'Page',
  'Pagination',
  'Root',
  'Select',
  'StandingsTable',
  'Strong',
  'Text',
  'Textarea',
  'TopScorersTable',
  'WikipediaCredit',
]

describe('the JavaScript entry of the package', () => {
  it.each(components)('gives the component %s', (name) => {
    expect(designSystem).toHaveProperty(name)
    expect(typeof designSystem[name as keyof typeof designSystem]).toBe('function')
  })

  it('gives List.Item on List, because an item only works inside its list', () => {
    expect(typeof designSystem.List.Item).toBe('function')
    expect(designSystem).not.toHaveProperty('ListItem')
  })

  it('gives Select.Option on Select, because an option only works inside its list', () => {
    expect(typeof designSystem.Select.Option).toBe('function')
    expect(designSystem).not.toHaveProperty('Option')
  })

  it('gives the parts of a page on Page, because they only work inside a page', () => {
    expect(typeof designSystem.Page.Header).toBe('function')
    expect(typeof designSystem.Page.Body).toBe('function')
    expect(typeof designSystem.Page.Main).toBe('function')
    expect(typeof designSystem.Page.Sidebar).toBe('function')
    expect(typeof designSystem.Page.Cell).toBe('function')
    expect(typeof designSystem.Page.Footer).toBe('function')
    expect(Object.keys(designSystem).filter((name) => name.startsWith('Page'))).toEqual(['Page'])
  })

  it('gives the lists of allowed elements', () => {
    expect(designSystem.buttonTypes).toEqual(['submit', 'button', 'reset'])
    expect(designSystem.cardElements).toEqual(['section', 'div', 'article', 'aside'])
    expect(designSystem.cardSurfaces).toEqual(['default', 'strong', 'soft', 'warm', 'transparent'])
    expect(designSystem.inputTypes).toContain('email')
    expect(designSystem.listElements).toEqual(['ul', 'ol'])
    expect(designSystem.matchStatuses).toEqual(['scheduled', 'played', 'postponed'])
    expect(designSystem.textElements).toEqual(['p', 'span'])
  })

  it('keeps the rich text editor out of the main entry, so Tiptap only loads on a page that imports it', () => {
    expect(designSystem).not.toHaveProperty('RichTextEditor')
  })

  it('has an exports entry for it that points at a file that exists, next to the CSS', () => {
    const { exports } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      exports: Record<string, string>
    }

    expect(exports['.']).toBe('./src/index.ts')
    expect(exports['./index.css']).toBe('./src/index.css')
    expect(exports['./rich-text-editor']).toBe('./src/rich-text-editor.ts')
    for (const target of Object.values(exports).filter((value) => !value.includes('*'))) {
      expect(existsSync(join(root, target))).toBe(true)
    }
  })
})

describe('the CSS entry of the package', () => {
  it('imports the order of the layers first, because Next.js puts an @layer statement of index.css after the rules it imports', () => {
    const entry = readFileSync(join(root, 'src/index.css'), 'utf8')

    expect([...entry.matchAll(/@import url\('([^']+)'\);/g)][0]?.[1]).toBe('./layers.css')
    expect(entry).not.toMatch(/^@layer/m)
  })
})
