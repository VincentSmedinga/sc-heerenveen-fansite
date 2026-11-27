import { render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { AccountButton } from './AccountButton'
import { glyphs } from './glyphs'

// Without the comments, which describe the rules in words.
const css = readFileSync(join(import.meta.dirname, 'account-button.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

const initialPaths = () => [...document.querySelectorAll('mask .hf-account-button-initials path')]

describe('AccountButton', () => {
  it('is the link Inloggen without a screen name, with no initials', () => {
    render(<AccountButton />)
    const link = screen.getByRole('link', { name: 'Inloggen' })

    expect(link.getAttribute('href')).toBe('/fans/inloggen')
    expect(link.hasAttribute('data-signed-in')).toBe(false)
    expect(initialPaths()).toHaveLength(0)
  })

  it('is the link Mijn account with a screen name, with the initials cut out and centred', () => {
    render(<AccountButton screenName="Blauwwit_Sjoerd" />)
    const link = screen.getByRole('link', { name: 'Mijn account' })

    expect(link.getAttribute('href')).toBe('/fans/mijn-account')
    expect(link.hasAttribute('data-signed-in')).toBe(true)
    expect(initialPaths().map((path) => path.getAttribute('d'))).toEqual([glyphs['B'], glyphs['S']])
    expect(initialPaths().map((path) => path.getAttribute('transform'))).toEqual([
      'translate(4.8 6.25) scale(0.7)',
      'translate(8.4 6.25) scale(0.7)',
    ])
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

  it('centres one initial, and draws none for a name without a letter it can draw', () => {
    const { rerender } = render(<AccountButton screenName="Tjalle99" />)

    expect(initialPaths().map((path) => path.getAttribute('transform'))).toEqual(['translate(6.6 6.25) scale(0.7)'])

    for (const screenName of ['1234', 'Жанна']) {
      rerender(<AccountButton screenName={screenName} />)

      expect(initialPaths()).toHaveLength(0)
      expect(screen.getByRole('link', { name: 'Mijn account' }).hasAttribute('data-signed-in')).toBe(true)
    }
  })

  it('draws a new torso when someone logs in or out, so that change does not move', () => {
    const { rerender } = render(<AccountButton />)
    const torso = () => document.querySelector('.hf-account-button-torso')
    const signedOut = torso()

    rerender(<AccountButton screenName="Tjalle99" />)
    const signedIn = torso()

    expect(signedIn).not.toBe(signedOut)

    rerender(<AccountButton screenName="Tjalle100" />)
    expect(torso()).toBe(signedIn)

    rerender(<AccountButton />)
    expect(torso()).not.toBe(signedIn)
  })

  it('is a RoundButton on the header', () => {
    render(<AccountButton className="extra" />)

    expect(screen.getByRole('link').className).toBe('hf-round-button hf-round-button-header hf-account-button extra')
  })

  it('gives each button its own clip path and mask, so two buttons on a page do not share one', () => {
    render(
      <>
        <AccountButton />
        <AccountButton screenName="Tjalle99" />
      </>,
    )
    const ids = [...document.querySelectorAll('clipPath, mask')].map((element) => element.id)
    const references = [...document.querySelectorAll('[clip-path], [mask]')].map(
      (element) => element.getAttribute('clip-path') ?? element.getAttribute('mask'),
    )

    expect(ids).toHaveLength(4)
    expect(new Set(ids).size).toBe(4)
    expect(references.sort()).toEqual(ids.map((id) => `url(#${id})`).sort())
  })

  describe('account-button.css', () => {
    it('raises the torso when logged in and with the keyboard, and under the mouse only on a device with a mouse', () => {
      expect(css).toMatch(
        /&\[data-signed-in\],\s*&:focus-visible \{\s*\.hf-account-button-torso \{\s*translate: 0 -7\.5px;/,
      )
      expect(css).toMatch(/@media \(hover: hover\) \{\s*&:hover \.hf-account-button-torso \{\s*translate: 0 -7\.5px;/)
      expect(css).not.toMatch(/:active/)
    })

    it('moves with the motion tokens only, so nothing moves with reduced motion', () => {
      expect(css.match(/transition:[^;]+;/g)).toEqual([
        'transition: translate var(--hf-motion-duration-medium) var(--hf-motion-ease-morph);',
      ])
      expect(css).not.toMatch(/animation|@keyframes/)
    })
  })
})
