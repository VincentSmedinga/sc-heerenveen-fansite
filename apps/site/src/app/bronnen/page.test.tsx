import type { PublicSource } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSources } from '../../sources'
import SourcesPage from './page'

vi.mock('../../sources', () => ({ getSources: vi.fn() }))

const policy = { allowEmbed: false, allowImage: false, introMaxLength: 0 }

const sources: PublicSource[] = [
  { ...policy, allowEmbed: true, domain: 'testpodcast.test', kind: 'podcast', name: 'Testpodcast' },
  { ...policy, domain: 'testkrant.test', kind: 'news', name: 'Testkrant' },
  {
    ...policy,
    allowImage: true,
    domain: 'voorbeeldkrant.test',
    introMaxLength: 200,
    kind: 'news',
    name: 'Voorbeeldkrant',
  },
]

async function render() {
  return renderToStaticMarkup(await SourcesPage())
}

beforeEach(() => {
  vi.mocked(getSources).mockReset()
})

describe('the page Onze bronnen', () => {
  it('lists the sources under a heading per kind, with a link to each website and what we show', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Onze bronnen</h1>'])
    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2">Nieuws</h2>',
      '<h2 class="hf-heading-2">Podcasts</h2>',
    ])
    expect(html).toContain('<li><a href="https://testkrant.test">Testkrant</a>: kop, link en bronnaam</li>')
    expect(html).toContain(
      '<li><a href="https://voorbeeldkrant.test">Voorbeeldkrant</a>: kop, link, bronnaam, intro en afbeelding</li>',
    )
    expect(html).toContain(
      '<li><a href="https://testpodcast.test">Testpodcast</a>: kop, link, bronnaam en insluiten</li>',
    )
  })

  it('shows visitors an empty state when there are no sources', async () => {
    vi.mocked(getSources).mockResolvedValue([])

    const html = await render()

    expect(html).toContain('We hebben nog geen bronnen.')
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('<ul')
  })
})
