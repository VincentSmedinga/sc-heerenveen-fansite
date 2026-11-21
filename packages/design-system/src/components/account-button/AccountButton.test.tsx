import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { AccountButton } from './AccountButton'
import { glyphs } from './glyphs'

// Without the comments, which describe the rules in words.
const css = readFileSync(join(import.meta.dirname, 'account-button.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('AccountButton', () => {
  it('is the link Inloggen without a screen name, with the scarf around the neck and no initials', () => {
    render(<AccountButton />)
    const link = screen.getByRole('link', { name: 'Inloggen' })

    expect(link.getAttribute('href')).toBe('/fans/inloggen')
    expect(link.hasAttribute('data-signed-in')).toBe(false)
    expect(link.querySelector('.hf-account-button-neck')).not.toBeNull()
    expect(link.querySelector('text')).toBeNull()
  })

  it('is the link Mijn account with a screen name, with the initials on the chest', () => {
    render(<AccountButton screenName="Blauwwit_Sjoerd" />)
    const link = screen.getByRole('link', { name: 'Mijn account' })

    expect(link.getAttribute('href')).toBe('/fans/mijn-account')
    expect(link.hasAttribute('data-signed-in')).toBe(true)
    expect(
      [...link.querySelectorAll('mask .hf-account-button-initials path')].map((path) => path.getAttribute('d')),
    ).toEqual([glyphs['B'], glyphs['S']])
  })

  it('takes its name from the link and not from the drawing: the initials are lines, not text', () => {
    render(<AccountButton screenName="Blauwwit_Sjoerd" />)
    const link = screen.getByRole('link', { name: 'Mijn account' })

    expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    expect(link.querySelector('svg')?.getAttribute('focusable')).toBe('false')
    expect(link.getAttribute('aria-label')).toBe('Mijn account')
    expect(link.querySelector('text')).toBeNull()
    expect(link.textContent).toBe('')
  })

  it('puts one initial in the middle of the chest, and draws none for a name without a letter', () => {
    const { rerender } = render(<AccountButton screenName="Tjalle99" />)
    const paths = () => [...document.querySelectorAll('.hf-account-button-initials path')]

    expect(paths()).toHaveLength(1)
    expect(paths()[0]?.getAttribute('transform')).toBe('translate(14 24.6)')

    rerender(<AccountButton screenName="1234" />)

    expect(paths()).toHaveLength(0)
    expect(screen.getByRole('link', { name: 'Mijn account' })).toBeTruthy()
  })

  it('is a RoundButton on the header', () => {
    render(<AccountButton className="extra" />)

    expect(screen.getByRole('link').className).toBe('hf-round-button hf-round-button-header hf-account-button extra')
  })

  it('gives each button its own masks, so two buttons on a page do not share one', () => {
    render(
      <>
        <AccountButton />
        <AccountButton screenName="Tjalle99" />
      </>,
    )
    const masks = [...document.querySelectorAll('mask')].map((mask) => mask.id)

    expect(masks).toHaveLength(4)
    expect(new Set(masks).size).toBe(4)
    for (const user of document.querySelectorAll('[mask]')) {
      expect(masks).toContain(/^url\(#(.*)\)$/.exec(user.getAttribute('mask') ?? '')?.[1])
    }
  })

  describe('account-button.css', () => {
    it('raises the arms when logged in and with the keyboard, and under the mouse only on a device with a mouse', () => {
      expect(css).toMatch(/&\[data-signed-in\],\s*&:focus-visible \{\s*\.hf-account-button-wave \{[^}]*opacity: 1;/)
      expect(css).toMatch(/@media \(hover: hover\) \{\s*&:hover \{\s*\.hf-account-button-wave \{[^}]*opacity: 1;/)
    })

    it('waves twice, with durations from the motion tokens, so nothing moves with reduced motion', () => {
      const waves = css.match(/animation: hf-account-button-wave [^;]+;/g) ?? []

      expect(waves).toHaveLength(2)
      for (const wave of waves) {
        expect(wave).toMatch(/calc\(2\.5 \* var\(--hf-motion-duration-medium\)\)/)
        expect(wave).toMatch(/var\(--hf-motion-duration-short\) 2;$/)
      }
      expect(css).toMatch(/@keyframes hf-account-button-wave/)
    })
  })
})
