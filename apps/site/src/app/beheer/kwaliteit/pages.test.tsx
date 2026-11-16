import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import QualityPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/beheer/require-role', () => ({ requireRole }))

beforeEach(() => {
  requireRole.mockReset()
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId: 1 })
})

describe('the page Kwaliteit, until the lists have moved (#1303)', () => {
  it('is for an editor only, stays out of search engines and leads to the list that did not move yet (the clubs)', async () => {
    const html = renderToStaticMarkup(await QualityPage())

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata.robots).toEqual({ follow: false, index: false })
    expect(metadata.title).toBe('Kwaliteit')
    expect(html).not.toContain('href="/beheer/spelers/kwaliteit')
    expect(html).toContain('href="/beheer/kwaliteit/clubs/land"')
    expect(html).not.toContain('Welke gegevens')
  })

  it('shows nothing to somebody without a session or with another role', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(QualityPage()).rejects.toThrow('redirect to /beheer/inloggen')
  })
})
