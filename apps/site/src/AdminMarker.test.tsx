// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { AdminMarker } from './AdminMarker'

beforeEach(() => {
  localStorage.setItem('fansite-verslag-7', '{}')
  localStorage.setItem('fansite-theme', 'dark')
})

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('AdminMarker', () => {
  it('takes the input the browser kept for the forms away when the editor logged out, and only that', () => {
    render(<AdminMarker loggedIn={false} loggedOut />)

    expect(localStorage.getItem('fansite-verslag-7')).toBeNull()
    expect(localStorage.getItem('fansite-theme')).toBe('dark')
  })

  it('keeps the input when the session merely ran out, which is what it is for', () => {
    render(<AdminMarker loggedIn={false} />)

    expect(localStorage.getItem('fansite-verslag-7')).toBe('{}')
  })
})
