import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { Icon } from '../icon/Icon'
import { RoundButton } from './RoundButton'

// Without the comments, which describe the rules in words.
const css = readFileSync(join(import.meta.dirname, 'round-button.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')
const index = readFileSync(join(import.meta.dirname, '../../index.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('RoundButton', () => {
  it('is a button named by its label, that does not send a form, with the icon hidden', () => {
    render(
      <RoundButton label="Naar boven">
        <Icon name="arrow-up" />
      </RoundButton>,
    )
    const button = screen.getByRole('button', { name: 'Naar boven' })

    expect(button.getAttribute('type')).toBe('button')
    expect(button.textContent).toBe('')
    expect(button.className).toBe('hf-round-button hf-round-button-page')
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('is a link with an address', () => {
    render(
      <RoundButton href="#contact" label="Mail ons">
        <Icon name="envelope" />
      </RoundButton>,
    )
    const link = screen.getByRole('link', { name: 'Mail ons' })

    expect(link.tagName).toBe('A')
    expect(link.getAttribute('href')).toBe('#contact')
    expect(link.hasAttribute('type')).toBe(false)
  })

  it('takes the surface and the size as classes, and passes other attributes on', () => {
    render(
      <RoundButton aria-pressed className="extra" id="knop" label="Donker" size="small" surface="header">
        <Icon name="moon" />
      </RoundButton>,
    )
    const button = screen.getByRole('button', { name: 'Donker' })

    expect(button.className).toBe('hf-round-button hf-round-button-header hf-size-small extra')
    expect(button.id).toBe('knop')
    expect(button.getAttribute('aria-pressed')).toBe('true')
  })

  describe('round-button.css', () => {
    it('is round and 44 by 44 pixels, with a see-through rim at rest', () => {
      expect(css).toContain('block-size: 2.75rem;')
      expect(css).toContain('inline-size: 2.75rem;')
      expect(css).toContain('border-radius: 50%;')
      expect(css).toContain('border: 1px solid transparent;')
    })

    it('comes forward under the mouse only on a device with a mouse, and when pressed and with the keyboard', () => {
      expect(css).toMatch(/&:active,\s*&:focus-visible \{[^}]*var\(--hf-round-button-fill\)/)
      expect(css).toMatch(/@media \(hover: hover\) \{\s*&:hover \{[^}]*var\(--hf-round-button-fill\)/)
    })

    it('takes the colours of links on the page and of the header on the header, with no colour of its own', () => {
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(/i)
      expect(css).not.toMatch(/--hf-colour-(blue|red|grey|sand|steel)-\d+/)
      expect(css).toMatch(/\.hf-round-button-page \{[^}]*var\(--hf-colour-text-link\);/)
      expect(css).toMatch(/\.hf-round-button-header \{[^}]*var\(--hf-colour-icon-on-header-quiet\);/)
    })

    it('keeps an outline in forced colours, the colour of a button or of a link', () => {
      expect(css).toMatch(
        /@media \(forced-colors: active\) \{\s*border-color: ButtonText;\s*&:is\(a\) \{\s*border-color: LinkText;/,
      )
    })

    it('comes after page.css and before the components built on it in index.css', () => {
      const at = index.indexOf('round-button.css')

      expect(at).toBeGreaterThan(index.indexOf('page/page.css'))
      expect(at).toBeLessThan(index.indexOf('top-link.css'))
      expect(at).toBeLessThan(index.indexOf('theme-button.css'))
      expect(at).toBeLessThan(index.indexOf('account-button.css'))
    })
  })
})
