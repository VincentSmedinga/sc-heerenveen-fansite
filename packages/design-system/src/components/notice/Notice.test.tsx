import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Notice } from './Notice'

describe('Notice', () => {
  it('is a status with its text as its content', () => {
    render(<Notice>Opgeslagen.</Notice>)
    const notice = screen.getByRole('status')

    expect(notice.textContent).toBe('Opgeslagen.')
  })

  it('is a status with no text yet, so it can be filled in after an action', () => {
    const { rerender } = render(<Notice>{''}</Notice>)

    expect(screen.getByRole('status').textContent).toBe('')

    rerender(<Notice>Opgeslagen.</Notice>)

    expect(screen.getByRole('status').textContent).toBe('Opgeslagen.')
  })

  it('has no heading', () => {
    render(<Notice>Opgeslagen.</Notice>)

    expect(screen.queryByRole('heading')).toBeNull()
  })

  it('has a class of its own next to the class passed in, and keeps the other attributes', () => {
    render(
      <Notice className="extra" id="melding">
        Opgeslagen.
      </Notice>,
    )
    const notice = screen.getByRole('status')

    expect(notice.className).toBe('hf-notice extra')
    expect(notice.id).toBe('melding')
  })
})
