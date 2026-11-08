import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import LiveShortcuts, { liveShortcuts } from './page'

const { findReportScreen } = vi.hoisted(() => ({ findReportScreen: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/beheer/match-reports', () => ({ findReportScreen }))
vi.mock('#src/beheer/AdminBar', () => ({ AdminBar: () => <nav aria-label="Beheer" /> }))

beforeEach(() => {
  findReportScreen.mockReset()
})

const render = async (id: string) => renderToStaticMarkup(await LiveShortcuts({ params: Promise.resolve({ id }) }))

describe('the bar of the quick screen', () => {
  it('keeps the bar of the admin and jumps to the forms and the events', async () => {
    findReportScreen.mockResolvedValue({ report: { appearances: [{ id: 1 }] } })

    const html = await render('5')

    expect(html).toContain('aria-label="Beheer"')
    expect(html).toContain('Op deze pagina:')
    expect([...html.matchAll(/href="(#[^"]+)"/gu)].map(([, href]) => href)).toEqual(
      liveShortcuts.map(({ href }) => href),
    )
    expect(liveShortcuts.map(({ label }) => label)).toEqual(['Doelpunt', 'Kaart', 'Wissel', 'Gebeurtenissen'])
  })

  it('has no jumps for a report without players, or without a report', async () => {
    findReportScreen.mockResolvedValue({ report: { appearances: [] } })
    expect(await render('5')).not.toContain('Op deze pagina:')
    findReportScreen.mockResolvedValue({ report: undefined })
    expect(await render('5')).not.toContain('Op deze pagina:')
    expect(await render('x')).not.toContain('Op deze pagina:')
  })
})
