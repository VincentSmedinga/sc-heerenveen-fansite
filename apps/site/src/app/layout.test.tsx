import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { headerColour } from '../colours'
import RootLayout, { metadata, viewport } from './layout'

vi.mock('next/navigation', () => ({ usePathname: () => '/' }))

describe('RootLayout', () => {
  it('puts the page in a Page.Body, which is a div, between the header and the footer, so the page brings the main', () => {
    const html = renderToStaticMarkup(<RootLayout shortcuts={null}>Inhoud</RootLayout>)

    expect(html).toMatch(/<\/header><div class="hf-page-body">Inhoud<\/div><footer/)
    expect(html).not.toContain('<main')
  })

  it('puts the slot for a bar between the header and the Page.Body, outside the main, and nothing there without one', () => {
    const html = renderToStaticMarkup(<RootLayout shortcuts={<nav aria-label="Balk">Links</nav>}>Inhoud</RootLayout>)

    expect(html).toMatch(/<\/header><nav aria-label="Balk">Links<\/nav><div class="hf-page-body">Inhoud<\/div><footer/)
  })

  it('puts the two sentences of the footer in a paragraph each, before the links', () => {
    const html = renderToStaticMarkup(<RootLayout shortcuts={null}>Inhoud</RootLayout>)

    expect(html).toContain(
      '<footer class="hf-page-footer"><p class="hf-meta">Alles over onze club op één plek.</p><p class="hf-meta">Voor supporters door supporters.</p><nav',
    )
  })

  it('links to Zoeken, Over ons, Contact, Bronnen, Privacy, Toegankelijkheid and Updates in the footer, in a navigation named Over de site', () => {
    const html = renderToStaticMarkup(<RootLayout shortcuts={null}>Inhoud</RootLayout>)
    const footer = html.match(/<footer[^>]*>.*<\/footer>/s)?.[0] ?? ''

    expect(footer).toContain('<nav aria-label="Over de site"')
    expect(
      [...footer.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['/zoeken', 'Zoeken'],
      ['/over-ons', 'Over ons'],
      ['/contact', 'Contact'],
      ['/bronnen', 'Bronnen'],
      ['/privacy', 'Privacy'],
      ['/toegankelijkheid', 'Toegankelijkheid'],
      ['/updates', 'Updates'],
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
    expect(await metadataWith('development')).toMatchObject({
      other: { 'review-branch': 'feat/125-pnpm-review' },
      title: {
        default: 'feat/125-pnpm-review · sc Heerenveen Fansite',
        template: 'feat/125-pnpm-review · %s – sc Heerenveen Fansite',
      },
    })
  })

  it('never shows it in a build, whatever REVIEW_BRANCH holds', async () => {
    const metadata = await metadataWith('production')

    expect(metadata).toMatchObject({
      title: { default: 'sc Heerenveen Fansite', template: '%s – sc Heerenveen Fansite' },
    })
    expect(metadata).not.toHaveProperty('other')
  })
})

describe('the icons of the layout', () => {
  it('points to the icon as an SVG, to favicon.ico, and to the icon for the home screen of an iPhone, all on our own server', () => {
    expect(metadata.icons).toEqual({
      apple: { sizes: '180x180', type: 'image/png', url: '/apple-touch-icon.png' },
      icon: [
        { type: 'image/svg+xml', url: '/icon.svg' },
        { sizes: '16x16 32x32 48x48', type: 'image/x-icon', url: '/favicon.ico' },
      ],
    })
  })

  it('names the site Fansite under the icon on an iPhone', () => {
    expect(metadata.appleWebApp).toMatchObject({ title: 'Fansite' })
  })

  it('makes the status bar of the home screen app see-through, so the header runs under it', () => {
    expect(metadata.appleWebApp).toMatchObject({ statusBarStyle: 'black-translucent' })
  })

  it('lets the page use the whole screen, also behind a notch', () => {
    expect(viewport.viewportFit).toBe('cover')
  })

  it('colours the bars of the browser with the header of the site, in light and in dark', () => {
    expect(viewport.themeColor).toEqual([
      { color: headerColour.light, media: '(prefers-color-scheme: light)' },
      { color: headerColour.dark, media: '(prefers-color-scheme: dark)' },
    ])
    expect(headerColour.dark).not.toBe(headerColour.light)
  })
})
