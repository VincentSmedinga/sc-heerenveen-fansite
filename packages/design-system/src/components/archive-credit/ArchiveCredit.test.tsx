import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ArchiveCredit } from './ArchiveCredit'

describe('ArchiveCredit', () => {
  it('names the archive of the old fansite as the source, in one visible line', () => {
    const { container } = render(<ArchiveCredit />)

    expect(container.firstElementChild?.tagName).toBe('P')
    expect(container.textContent).toBe('Bron: sc Heerenveen Fansite')
  })

  it('takes another lead, as the strip under the image of a card does', () => {
    const { container } = render(<ArchiveCredit lead="Gegevens van" />)

    expect(container.textContent).toBe('Gegevens van sc Heerenveen Fansite')
  })

  it('has no link, because the archive is ours and has no page to name', () => {
    const { container } = render(<ArchiveCredit />)

    expect(container.querySelector('a')).toBeNull()
  })
})
