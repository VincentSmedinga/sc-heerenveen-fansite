import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import * as designSystem from './index'

const root = join(import.meta.dirname, '..')

const components = ['Body', 'Heading', 'Link', 'List', 'Logo', 'Navigation', 'NewsItem', 'Page', 'Root', 'Text']

describe('the JavaScript entry of the package', () => {
  it.each(components)('gives the component %s', (name) => {
    expect(designSystem).toHaveProperty(name)
    expect(typeof designSystem[name as keyof typeof designSystem]).toBe('function')
  })

  it('gives List.Item on List, because an item only works inside its list', () => {
    expect(typeof designSystem.List.Item).toBe('function')
    expect(designSystem).not.toHaveProperty('ListItem')
  })

  it('gives Page.Header, Page.Body and Page.Footer on Page, because they only work inside a page', () => {
    expect(typeof designSystem.Page.Header).toBe('function')
    expect(typeof designSystem.Page.Body).toBe('function')
    expect(typeof designSystem.Page.Footer).toBe('function')
    expect(Object.keys(designSystem).filter((name) => name.startsWith('Page'))).toEqual(['Page'])
  })

  it('gives the lists of allowed elements', () => {
    expect(designSystem.listElements).toEqual(['ul', 'ol'])
    expect(designSystem.pageBodyElements).toEqual(['main', 'div'])
    expect(designSystem.textElements).toEqual(['p', 'span'])
  })

  it('has an exports entry for it that points at a file that exists, next to the CSS', () => {
    const { exports } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      exports: Record<string, string>
    }

    expect(exports['.']).toBe('./src/index.ts')
    expect(exports['./index.css']).toBe('./src/index.css')
    for (const target of Object.values(exports).filter((value) => !value.includes('*'))) {
      expect(existsSync(join(root, target))).toBe(true)
    }
  })
})
