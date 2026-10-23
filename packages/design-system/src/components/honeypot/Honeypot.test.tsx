import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Honeypot } from './Honeypot'

describe('Honeypot', () => {
  it('is a text field with the name the site asks for, and no value', () => {
    const { container } = render(<Honeypot name="website" />)
    const field = container.querySelector('input')

    expect(field?.getAttribute('name')).toBe('website')
    expect(field?.getAttribute('type')).toBe('text')
    expect(field?.value).toBe('')
  })

  it('is not in the accessibility tree, so a screen reader does not read it out', () => {
    render(<Honeypot name="website" />)

    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByRole('textbox', { hidden: true })).toBeTruthy()
  })

  it('is out of reach of the keyboard', () => {
    const { container } = render(<Honeypot name="website" />)

    expect(container.querySelector('input')?.getAttribute('tabindex')).toBe('-1')
    expect(container.firstElementChild?.hasAttribute('inert')).toBe(true)
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
  })

  it('is hidden from the eye, but not with display: none, which robots recognise', () => {
    const { container } = render(<Honeypot name="website" />)

    expect(container.firstElementChild?.className).toBe('hf-visually-hidden')
    expect(container.firstElementChild?.hasAttribute('hidden')).toBe(false)
  })

  it('keeps a browser or a password manager from filling it in', () => {
    const { container } = render(<Honeypot name="website" />)

    expect(container.querySelector('input')?.getAttribute('autocomplete')).toBe('off')
  })

  it('can have its own label', () => {
    const { container } = render(<Honeypot label="Niet invullen" name="website" />)

    expect(container.querySelector('label')?.textContent).toBe('Niet invullen')
  })
})
