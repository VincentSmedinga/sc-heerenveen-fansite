import { describe, expect, it } from 'vitest'

import { addBranchTo, branchLine } from './branch'

describe('addBranchTo', () => {
  it('adds the branch in the dev server', () => {
    expect(addBranchTo('<title>x</title>', 'feat/120-bigger-type', 'DEVELOPMENT')).toBe(
      '<title>x</title><meta name="review-branch" content="feat/120-bigger-type">',
    )
  })

  it('never adds it to a build, such as the one on ds.heerenveen.org', () => {
    expect(addBranchTo('<title>x</title>', 'feat/120-bigger-type', 'PRODUCTION')).toBe('<title>x</title>')
  })

  it('adds nothing without a branch', () => {
    expect(addBranchTo('<title>x</title>', undefined, 'DEVELOPMENT')).toBe('<title>x</title>')
    expect(addBranchTo('<title>x</title>', '', 'DEVELOPMENT')).toBe('<title>x</title>')
  })

  it('adds nothing for a value that is not a branch name, so it can not break out of the tag', () => {
    expect(addBranchTo('<title>x</title>', '"><script>alert(1)</script>', 'DEVELOPMENT')).toBe('<title>x</title>')
  })
})

describe('branchLine', () => {
  it('shows the branch', () => {
    expect(branchLine('feat/120-bigger-type')).toContain('>feat/120-bigger-type</span>')
  })

  it('shows nothing without a branch, or for a value that is not a branch name', () => {
    expect(branchLine(undefined)).toBe('')
    expect(branchLine('<img src=x onerror=alert(1)>')).toBe('')
  })
})
