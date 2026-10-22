import type { PublicSource } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSources } from '../../sources'
import SourcesPage from './page'

vi.mock('../../sources', () => ({ getSources: vi.fn() }))

const sources: PublicSource[] = [
  { description: 'Een podcast.', domain: 'testpodcast.test', kind: 'podcast', name: 'Testpodcast' },
  {
    description: 'Een dagblad. Het schrijft over sc Heerenveen.',
    domain: 'testkrant.test',
    kind: 'news',
    name: 'Testkrant',
  },
  { description: null, domain: 'proefnieuws.test', kind: 'news', name: 'Proefnieuws' },
]

async function render() {
  return renderToStaticMarkup(await SourcesPage())
}

beforeEach(() => {
  vi.mocked(getSources).mockReset()
})

describe('the page Onze bronnen', () => {
  it('lists the sources under a heading per kind, each with a link to its website and its description', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Onze bronnen</h1>'])
    expect(html).toContain('<p>Dit zijn de bronnen waar we het nieuws over sc Heerenveen vandaan halen.</p>')
    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2">Nieuws</h2>',
      '<h2 class="hf-heading-2">Podcasts</h2>',
    ])
    expect(html).toContain(
      '<li><a href="https://testkrant.test">Testkrant</a><p>Een dagblad. Het schrijft over sc Heerenveen.</p></li>',
    )
    expect(html).toContain('<li><a href="https://testpodcast.test">Testpodcast</a><p>Een podcast.</p></li>')
  })

  it('shows a source without a description with its link only', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    expect(await render()).toContain('<li><a href="https://proefnieuws.test">Proefnieuws</a></li>')
  })

  it('shows visitors an empty state when there are no sources', async () => {
    vi.mocked(getSources).mockResolvedValue([])

    const html = await render()

    expect(html).toContain('We hebben nog geen bronnen.')
    expect(html).not.toContain('Dit zijn de bronnen')
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('<ul')
  })
})
