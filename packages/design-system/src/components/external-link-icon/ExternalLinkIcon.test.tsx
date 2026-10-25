import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ExternalLinkIcon } from './ExternalLinkIcon'

describe('ExternalLinkIcon', () => {
  it('is an svg that assistive technology skips, in the colour of the text around it', () => {
    const { container } = render(<ExternalLinkIcon />)
    const icon = container.querySelector('svg')

    expect(container.children).toHaveLength(1)
    expect(icon?.getAttribute('class')).toBe('hf-external-link-icon')
    expect(icon?.getAttribute('aria-hidden')).toBe('true')
    expect(icon?.getAttribute('focusable')).toBe('false')
    expect(icon?.getAttribute('stroke')).toBe('currentColor')
    expect(icon?.textContent).toBe('')
  })

  it('is drawn in the code: three paths and nothing that points to another file or address', () => {
    const { container } = render(<ExternalLinkIcon />)
    const icon = container.querySelector('svg')

    expect([...(icon?.querySelectorAll('*') ?? [])].map((element) => element.tagName)).toEqual(['path', 'path', 'path'])
    expect(icon?.outerHTML).not.toMatch(/(href|src)=|https?:|url\(/)
  })
})
