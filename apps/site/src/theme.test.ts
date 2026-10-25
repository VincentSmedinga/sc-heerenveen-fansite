// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { applyPreference, chooseTheme, readPreference, resolveTheme, savePreference, themeStorageKey } from './theme'

/** A storage in memory, like localStorage. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))

  return {
    clear: () => {
      data.clear()
    },
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
    removeItem: (key) => {
      data.delete(key)
    },
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

/** A storage that throws as soon as it is touched, like Safari with "Block all cookies". */
const blockedStorage = new Proxy({} as Storage, {
  get: () => {
    throw new DOMException('blocked', 'SecurityError')
  },
})

describe('public/theme.js', () => {
  const script = readFileSync(path.join(import.meta.dirname, '../public/theme.js'), 'utf8')

  it('reads the same key as this module keeps the choice under', () => {
    expect(script).toContain(`localStorage.getItem('${themeStorageKey}')`)
  })

  it('sets data-theme only for a kept light or dark, and never throws when the storage is blocked', () => {
    expect(script).toContain("choice === 'light' || choice === 'dark'")
    expect(script).toMatch(/try \{[\s\S]*\} catch/)
  })
})

describe('readPreference', () => {
  it('is system when nothing is kept', () => {
    expect(readPreference(memoryStorage())).toBe('system')
  })

  it('gives the kept choice, light or dark', () => {
    expect(readPreference(memoryStorage({ [themeStorageKey]: 'dark' }))).toBe('dark')
    expect(readPreference(memoryStorage({ [themeStorageKey]: 'light' }))).toBe('light')
  })

  it('takes anything else as system, so a changed value never breaks the page', () => {
    expect(readPreference(memoryStorage({ [themeStorageKey]: 'system' }))).toBe('system')
    expect(readPreference(memoryStorage({ [themeStorageKey]: 'blue' }))).toBe('system')
  })

  it('is system when the storage is blocked', () => {
    expect(readPreference(blockedStorage)).toBe('system')
  })
})

describe('savePreference', () => {
  it('keeps light or dark under the key', () => {
    const storage = memoryStorage()

    savePreference('dark', storage)

    expect(storage.getItem(themeStorageKey)).toBe('dark')
  })

  it('keeps nothing for system, and forgets an earlier choice', () => {
    const storage = memoryStorage({ [themeStorageKey]: 'dark' })

    savePreference('system', storage)

    expect(storage.getItem(themeStorageKey)).toBeNull()
  })

  it('does not throw when the storage is blocked', () => {
    expect(() => {
      savePreference('dark', blockedStorage)
    }).not.toThrow()
  })
})

describe('resolveTheme', () => {
  it('follows the system without a choice', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })

  it('takes the choice, whatever the system gives', () => {
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })
})

describe('chooseTheme', () => {
  it('keeps a theme that differs from the system', () => {
    expect(chooseTheme('dark', false)).toBe('dark')
    expect(chooseTheme('light', true)).toBe('light')
  })

  it('goes back to following the system when the theme is what the system gives', () => {
    expect(chooseTheme('dark', true)).toBe('system')
    expect(chooseTheme('light', false)).toBe('system')
  })
})

describe('applyPreference', () => {
  const page = (colour = '') => {
    // The document of the test itself: only a document with a window can work out the colour of
    // the header.
    const doc = document

    doc.documentElement.removeAttribute('data-theme')
    doc.head.innerHTML =
      '<meta name="theme-color" content="#111" media="(prefers-color-scheme: light)"><meta name="theme-color" content="#222" media="(prefers-color-scheme: dark)">'
    doc.body.innerHTML = '<header></header>'
    if (colour !== '') {
      doc.querySelector('header')?.setAttribute('style', `background-color: ${colour}`)
    }

    return doc
  }
  const contents = (doc: Document) => [...doc.querySelectorAll('meta')].map((meta) => meta.content)

  it('puts data-theme on the html element for a choice, and takes it off for the system', () => {
    const doc = page()

    applyPreference('dark', doc)
    expect(doc.documentElement.dataset['theme']).toBe('dark')

    applyPreference('system', doc)
    expect(doc.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('gives both theme-color tags the colour of the header for a choice, and the original back for the system', () => {
    const doc = page('rgb(1, 2, 3)')

    applyPreference('dark', doc)
    expect(contents(doc)).toEqual(['rgb(1, 2, 3)', 'rgb(1, 2, 3)'])

    applyPreference('light', doc)
    expect(contents(doc)).toEqual(['rgb(1, 2, 3)', 'rgb(1, 2, 3)'])

    applyPreference('system', doc)
    expect(contents(doc)).toEqual(['#111', '#222'])
  })

  describe('the strip at the top of the page', () => {
    const withEdge = () => {
      const doc = page()
      const edge = doc.createElement('div')

      edge.className = 'hf-page-top-edge'
      doc.body.append(edge)

      return { doc, edge }
    }
    // Runs the frames by hand, so the test sees the strip while it is off the page.
    const frames: FrameRequestCallback[] = []
    const runFrames = () => {
      for (const frame of frames.splice(0)) {
        frame(0)
      }
    }

    beforeEach(() => {
      frames.length = 0
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((frame) => frames.push(frame))
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('goes off the page for two frames when the theme changes, so Safari reads its colour again', () => {
      const { doc, edge } = withEdge()

      applyPreference('dark', doc)
      expect(edge.style.display).toBe('none')

      runFrames()
      expect(edge.style.display).toBe('none')

      runFrames()
      expect(edge.style.display).toBe('')
    })

    it('goes off the page when a choice goes back to the system', () => {
      const { doc, edge } = withEdge()

      applyPreference('dark', doc)
      runFrames()
      runFrames()
      applyPreference('system', doc)

      expect(edge.style.display).toBe('none')
    })

    it('stays on the page when the theme is the same, as when the page loads with a choice that is already there', () => {
      const { doc, edge } = withEdge()

      applyPreference('dark', doc)
      runFrames()
      runFrames()
      applyPreference('dark', doc)

      expect(edge.style.display).toBe('')
      expect(frames).toHaveLength(0)
    })

    it('does nothing on a page without the strip', () => {
      const doc = page()

      applyPreference('dark', doc)

      expect(frames).toHaveLength(0)
    })
  })

  it('leaves the tags alone when the header has no colour yet', () => {
    const doc = page()

    applyPreference('dark', doc)

    expect(contents(doc)).toEqual(['#111', '#222'])
  })
})
