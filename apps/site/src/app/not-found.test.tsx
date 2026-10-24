import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import NotFound from './not-found'

describe('the page Pagina niet gevonden', () => {
  it('has one h1 and the sentence under it as the intro', () => {
    const html = renderToStaticMarkup(<NotFound />)

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Pagina niet gevonden</h1>'])
    expect(html).toContain('</h1><p class="hf-intro"><b>Deze pagina bestaat niet.</b></p>')
  })
})
