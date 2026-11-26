// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { SquadMarkForm } from './SquadMarkForm'

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

describe('the form of the mark of a squad', () => {
  it('has one button with the label it is given', () => {
    render(<SquadMarkForm action={() => Promise.resolve({})} label="Markeer de selectie van 2025/26 als compleet" />)

    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Markeer de selectie van 2025/26 als compleet' })).toBeTruthy()
  })

  it('gives the focus to the error of an action that failed', async () => {
    render(
      <SquadMarkForm action={() => Promise.resolve({ error: 'De selectie is niet gemarkeerd.' })} label="Markeer" />,
    )
    fireEvent.click(screen.getByRole('button'))

    await waitFor(() => expect(document.activeElement?.id).toBe('selectie-compleet-fout'))
    expect(document.activeElement?.textContent).toContain('De selectie is niet gemarkeerd.')
  })
})
