import { describe, expect, it } from 'vitest'

import main from './main'
import { addNoindexTo, noindexTag } from './noindex'

describe('addNoindexTo', () => {
  it('adds the noindex tag to the head', () => {
    expect(addNoindexTo('<title>x</title>')).toBe('<title>x</title><meta name="robots" content="noindex">')
  })
})

// main.ts sets both heads as functions; the type also allows a string, and the options hold
// more than configType.
type HeadFunction = (head: string, options: { configType: string }) => Promise<string | undefined> | string | undefined
const managerHead = main.managerHead as HeadFunction
const previewHead = main.previewHead as HeadFunction

describe('the heads in main.ts', () => {
  it('has the tag once in the manager of a build', async () => {
    const head = await managerHead('<title>x</title>', { configType: 'PRODUCTION' })
    expect(head?.split(noindexTag)).toHaveLength(2)
  })

  it('has the tag once in the manager of the dev server, next to the branch', async () => {
    process.env['REVIEW_BRANCH'] = 'fix/234-storybook-noindex'
    try {
      const head = await managerHead('<title>x</title>', { configType: 'DEVELOPMENT' })
      expect(head?.split(noindexTag)).toHaveLength(2)
      expect(head).toContain('name="review-branch"')
    } finally {
      delete process.env['REVIEW_BRANCH']
    }
  })

  it('has the tag once in the preview', async () => {
    const head = await previewHead('<title>x</title>', { configType: 'PRODUCTION' })
    expect(head?.split(noindexTag)).toHaveLength(2)
  })
})
