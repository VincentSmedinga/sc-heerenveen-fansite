import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Root } from '../root/Root'
import { Body } from './Body'

// A body element can't be rendered into a div, so this renders to a string and reads that back
// as a document.
const parse = (markup: string) => new DOMParser().parseFromString(markup, 'text/html')

describe('Body', () => {
  it('is the body element, and holds its children', () => {
    const markup = renderToStaticMarkup(
      <Root>
        <Body className="extra">
          <p>Inhoud</p>
        </Body>
      </Root>,
    )
    const { body } = parse(markup)

    expect(markup).toContain('<body class="extra">')
    expect(body.className).toBe('extra')
    expect(body.querySelector('p')?.textContent).toBe('Inhoud')
  })

  it("adds nothing to the head: that is Next.js's", () => {
    const markup = renderToStaticMarkup(
      <Root>
        <Body>Inhoud</Body>
      </Root>,
    )

    // React makes the empty head element itself.
    expect(markup).toBe('<html data-scroll-behavior="smooth" lang="nl"><head></head><body>Inhoud</body></html>')
  })
})
