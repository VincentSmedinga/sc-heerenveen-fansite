import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Bar, sharesOf } from './Bar'

describe('sharesOf', () => {
  it('gives the largest number the whole bar and half of it half', () => {
    expect(sharesOf([8, 4, 0])).toEqual([100, 50, 0])
  })

  it('gives equal numbers equal bars', () => {
    expect(sharesOf([3, 3])).toEqual([100, 100])
  })

  it('has no bars when nothing is above zero, so no division by zero', () => {
    expect(sharesOf([0, 0])).toBeNull()
    expect(sharesOf([])).toBeNull()
  })

  it('keeps a share between 0 and 100 and rounds it to two decimals', () => {
    expect(sharesOf([-3, 5])).toEqual([0, 100])
    expect(sharesOf([1, 3])).toEqual([33.33, 100])
  })
})

describe('Bar', () => {
  it('is decoration: hidden from a screen reader, with no role, name or text', () => {
    const { container } = render(<Bar share={40} />)
    const bar = container.firstElementChild as HTMLElement

    expect(bar.className).toBe('hf-bar')
    expect(bar.getAttribute('aria-hidden')).toBe('true')
    expect(bar.getAttribute('role')).toBeNull()
    expect(bar.textContent).toBe('')
    expect(bar.style.getPropertyValue('--hf-bar-share')).toBe('40')
  })
})
