import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

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

describe('the title of the layout', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  const metadataWith = async (nodeEnv: string) => {
    vi.stubEnv('NODE_ENV', nodeEnv)
    vi.stubEnv('REVIEW_BRANCH', 'feat/125-pnpm-review')
    vi.resetModules()

    return (await import('./layout')).metadata
  }

  it('shows the branch of pnpm review in the dev server, in the title and in a meta tag for the error page', async () => {
    expect(await metadataWith('development')).toEqual({
      other: { 'review-branch': 'feat/125-pnpm-review' },
      title: {
        default: 'feat/125-pnpm-review · sc Heerenveen Fansite',
        template: 'feat/125-pnpm-review · %s – sc Heerenveen Fansite',
      },
    })
  })

  it('never shows it in a build, whatever REVIEW_BRANCH holds', async () => {
    expect(await metadataWith('production')).toEqual({
      title: { default: 'sc Heerenveen Fansite', template: '%s – sc Heerenveen Fansite' },
    })
  })
})
