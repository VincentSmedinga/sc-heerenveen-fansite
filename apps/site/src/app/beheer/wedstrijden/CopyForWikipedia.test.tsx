// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CopyForWikipedia } from './CopyForWikipedia'

const props = { id: 7, text: '|attendance=26100', title: 'sc Heerenveen - N.E.C.', what: 'het aantal toeschouwers' }

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('CopyForWikipedia', () => {
  it('always has the text in a field that can be selected, with a label that names the match', () => {
    render(<CopyForWikipedia {...props} />)

    const field = screen.getByLabelText(/Tekst voor Wikipedia: het aantal toeschouwers van sc Heerenveen - N.E.C./)

    expect((field as HTMLTextAreaElement).value).toBe('|attendance=26100')
    expect((field as HTMLTextAreaElement).readOnly).toBe(true)
  })

  it('has no button when the browser cannot copy, so nothing stands there that does nothing', () => {
    vi.stubGlobal('navigator', { clipboard: undefined })
    render(<CopyForWikipedia {...props} />)

    expect(screen.queryByRole('button')).toBeNull()
  })

  it('copies the text, and says in a status line that it worked', async () => {
    const writeText = vi.fn(() => Promise.resolve())

    vi.stubGlobal('navigator', { clipboard: { writeText } })
    render(<CopyForWikipedia {...props} />)
    fireEvent.click(
      await screen.findByRole('button', { name: /Kopieer voor Wikipedia: het aantal toeschouwers van sc Heerenveen/ }),
    )

    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/^Gekopieerd: het aantal toeschouwers/))
    expect(writeText).toHaveBeenCalledWith('|attendance=26100')
  })

  it('says when copying failed, and sends the editor to the field', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('no')) } })
    render(<CopyForWikipedia {...props} />)
    fireEvent.click(await screen.findByRole('button'))

    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/Selecteer de tekst in het veld/))
  })
})
