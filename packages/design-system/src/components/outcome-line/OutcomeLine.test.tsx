import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { OutcomeLine } from './OutcomeLine'

describe('OutcomeLine', () => {
  it('has the text, and a bar that a screen reader skips', () => {
    const { container } = render(
      <OutcomeLine draws={15} losses={52} wins={9}>
        9 gewonnen · 15 gelijk · 52 verloren
      </OutcomeLine>,
    )

    expect(screen.getByText('9 gewonnen · 15 gelijk · 52 verloren')).toBeTruthy()
    expect(container.querySelector('.hf-outcome-bar')?.getAttribute('aria-hidden')).toBe('true')
  })
})
