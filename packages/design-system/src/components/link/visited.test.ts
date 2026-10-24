import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(import.meta.dirname, path), 'utf8')

// The CSS is read as text: jsdom doesn't apply rules in a cascade layer, and a browser hides the colour of a visited link.
const withoutComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

const visitedColour = /:visited[^{]*\{[^}]*--hf-colour-text-link-visited/

describe('the colour of a visited link', () => {
  it('is not set for links in general, so a visited link looks like one that is not', () => {
    const css = withoutComments(read('link.css'))

    expect(css).not.toContain(':visited')
    expect(css).not.toContain('--hf-colour-text-link-visited')
  })

  it('is set for the headline of a news item', () => {
    expect(withoutComments(read('../news-item/news-item.css'))).toMatch(visitedColour)
  })

  it('is set for the title of a discussion', () => {
    expect(withoutComments(read('../discussion-item/discussion-item.css'))).toMatch(visitedColour)
  })

  it('leaves out a link under the mouse, so hover wins over visited', () => {
    for (const path of ['../news-item/news-item.css', '../discussion-item/discussion-item.css']) {
      expect(withoutComments(read(path)), path).toContain('&:visited:not(:hover)')
    }
  })

  it('is not set again for the header and the footer, where it is no longer needed', () => {
    expect(withoutComments(read('../page/page.css'))).not.toContain('--hf-colour-text-link-visited')
  })
})
