import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import RootLayout from './layout'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

describe('RootLayout', () => {
  it('puts the page in a Page.Body, which is a div, between the header and the footer, so the page brings the main', () => {
    const html = renderToStaticMarkup(<RootLayout>Inhoud</RootLayout>)

    expect(html).toMatch(/<\/header><div class="hf-page-body">Inhoud<\/div><footer/)
    expect(html).not.toContain('<main')
  })

  it('links to Over ons, its privacy section and Wat is er nieuw in the footer, in a navigation named Over de site', () => {
    const html = renderToStaticMarkup(<RootLayout>Inhoud</RootLayout>)
    const footer = html.match(/<footer[^>]*>.*<\/footer>/s)?.[0] ?? ''

    expect(footer).toContain('<nav aria-label="Over de site"')
    expect(
      [...footer.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['/over-ons', 'Over ons'],
      ['/over-ons#privacy', 'Privacy'],
      ['/wat-is-er-nieuw', 'Wat is er nieuw'],
    ])
  })
})
