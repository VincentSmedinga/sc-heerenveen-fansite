import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Body } from '../body/Body'
import { Root } from '../root/Root'
import { Head } from './Head'

// A head element can't be rendered into a div, so these tests render to a string and read that
// back as a document.
const parse = (markup: string) => new DOMParser().parseFromString(markup, 'text/html')

describe('Head', () => {
  it('is an empty head without a script: Next.js fills it', () => {
    const markup = renderToStaticMarkup(
      <Root>
        <Head />
        <Body>Inhoud</Body>
      </Root>,
    )

    expect(markup).toContain('<head></head>')
    expect(parse(markup).head.childElementCount).toBe(0)
  })

  it('puts the script in the head as a classic script that blocks, without async or defer', () => {
    const markup = renderToStaticMarkup(
      <Root>
        <Head script="/theme.js" />
        <Body>Inhoud</Body>
      </Root>,
    )
    const script = parse(markup).head.querySelector('script')

    expect(markup).toContain('<head><script src="/theme.js"></script></head>')
    expect(script?.getAttribute('src')).toBe('/theme.js')
    expect(script?.hasAttribute('async')).toBe(false)
    expect(script?.hasAttribute('defer')).toBe(false)
    expect(script?.hasAttribute('type')).toBe(false)
  })

  it('takes no children: what else is in the head comes from the Metadata API', () => {
    const elements = [
      // @ts-expect-error The head holds a script at most; the rest is Next.js's.
      <Head>Tekst</Head>,
    ]

    expect(elements).toHaveLength(1)
  })
})
