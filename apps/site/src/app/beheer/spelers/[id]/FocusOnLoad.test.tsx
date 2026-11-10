// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FocusOnLoad } from './FocusOnLoad'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

describe('FocusOnLoad', () => {
  it('gives the focus to the element it names, and shows nothing', () => {
    const { container } = render(
      <>
        <select aria-label="Dezelfde persoon als" id="met" />
        <div data-testid="focus">
          <FocusOnLoad id="met" />
        </div>
      </>,
    )

    expect(document.activeElement?.id).toBe('met')
    expect(container.querySelector('[data-testid="focus"]')?.innerHTML).toBe('')
  })

  it('does nothing when the element is not there', () => {
    render(<FocusOnLoad id="weg" />)

    expect(document.activeElement).toBe(document.body)
  })
})
