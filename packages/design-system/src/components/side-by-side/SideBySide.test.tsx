import { render } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { SideBySide } from './SideBySide'

// jsdom does not apply rules in a cascade layer or a container query: the test reads the file.
const css = readFileSync(join(import.meta.dirname, 'side-by-side.css'), 'utf8').replace(/\/\*.*?\*\//gs, '')

describe('SideBySide', () => {
  it('has the tabs, the main part and the aside in the order they are read', () => {
    const { container } = render(
      <SideBySide>
        <SideBySide.Tabs>Tabs</SideBySide.Tabs>
        <SideBySide.Main>Formulier</SideBySide.Main>
        <SideBySide.Aside aria-label="Voorbeeld">Voorbeeld</SideBySide.Aside>
      </SideBySide>,
    )

    expect(
      [...(container.querySelector('.hf-side-by-side-grid')?.children ?? [])].map((part) => part.className),
    ).toEqual(['hf-side-by-side-tabs', 'hf-side-by-side-main', 'hf-side-by-side-aside'])
    expect(container.querySelector('section')?.getAttribute('aria-label')).toBe('Voorbeeld')
  })

  it('keeps a part that is hidden in the document, so it keeps its values', () => {
    const { container } = render(
      <SideBySide>
        <SideBySide.Main hidden>
          <input defaultValue="Waarde" />
        </SideBySide.Main>
      </SideBySide>,
    )

    expect(container.querySelector('input')?.value).toBe('Waarde')
    expect(container.querySelector('.hf-side-by-side-main')?.hasAttribute('hidden')).toBe(true)
  })

  it('passes on a class and the other attributes of the element', () => {
    const { container } = render(<SideBySide className="extra" data-test="ja" />)

    expect(container.firstElementChild?.className).toBe('hf-side-by-side extra')
    expect(container.firstElementChild?.getAttribute('data-test')).toBe('ja')
  })
})

describe('side-by-side.css', () => {
  it('measures the place the parts stand in, and puts them side by side from 56 rem', () => {
    expect(css).toContain('container-type: inline-size')
    expect(css).toContain('@container hf-side-by-side (min-width: 56rem)')
  })

  it('shows both parts and no tabs from that width, whatever hidden says', () => {
    const wide = css.slice(css.indexOf('@container'))

    expect(wide).toMatch(/\.hf-side-by-side-tabs \{\s*display: none;/)
    expect(wide).toMatch(/\[hidden\][^}]*\{\s*display: block;/)
  })

  it('sticks the aside to the top and lets it scroll by itself when it is taller than the screen', () => {
    const wide = css.slice(css.indexOf('@container'))

    expect(wide).toContain('position: sticky')
    expect(wide).toContain('overflow-y: auto')
    expect(wide).toContain('max-block-size: calc(100dvh')
  })
})
