// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { supporterMarkerKey } from './supporter-marker'
import { SupporterMarker } from './SupporterMarker'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('SupporterMarker', () => {
  it('sets the mark with the screen name of the session, and draws nothing', () => {
    const { container } = render(<SupporterMarker screenName="Tjalle99" />)

    expect(localStorage.getItem(supporterMarkerKey)).toBe('Tjalle99')
    expect(container.innerHTML).toBe('')
  })

  it('takes the mark away when the server saw no session, as after logging out or a session that ended', () => {
    localStorage.setItem(supporterMarkerKey, 'Tjalle99')
    render(<SupporterMarker />)

    expect(localStorage.getItem(supporterMarkerKey)).toBeNull()
  })

  it('follows a new screen name', () => {
    const { rerender } = render(<SupporterMarker screenName="Tjalle99" />)

    rerender(<SupporterMarker screenName="Tjalle100" />)

    expect(localStorage.getItem(supporterMarkerKey)).toBe('Tjalle100')
  })
})
