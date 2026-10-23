import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Form } from './Form'

describe('Form', () => {
  it('is a form that leaves the validation to the site', () => {
    const { container } = render(<Form>Inhoud</Form>)

    expect(container.firstElementChild?.tagName).toBe('FORM')
    expect(container.firstElementChild?.className).toBe('hf-form')
    expect(container.firstElementChild?.hasAttribute('novalidate')).toBe(true)
  })

  it('can bring back the validation of the browser', () => {
    const { container } = render(<Form noValidate={false} />)

    expect(container.firstElementChild?.hasAttribute('novalidate')).toBe(false)
  })

  it('keeps the other attributes next to its class', () => {
    const { container } = render(<Form action="/contact" className="extra" method="post" />)

    expect(container.firstElementChild?.className).toBe('hf-form extra')
    expect(container.firstElementChild?.getAttribute('action')).toBe('/contact')
    expect(container.firstElementChild?.getAttribute('method')).toBe('post')
  })
})
