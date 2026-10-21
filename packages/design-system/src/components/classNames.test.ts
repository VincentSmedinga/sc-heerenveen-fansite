import { describe, expect, it } from 'vitest'

import { classNames } from './classNames'

describe('classNames', () => {
  it('joins the names with a space', () => {
    expect(classNames('hf-page', 'extra')).toBe('hf-page extra')
  })

  it('leaves out names that are empty, false or missing', () => {
    expect(classNames('hf-page', undefined, false, '', 'extra')).toBe('hf-page extra')
  })

  it('gives undefined when nothing is left, so no empty class ends up in the HTML', () => {
    expect(classNames(undefined, false, '')).toBeUndefined()
  })
})
