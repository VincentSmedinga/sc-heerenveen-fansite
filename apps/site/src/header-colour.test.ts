import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { headerColourOf } from './header-colour'

describe('headerColourOf', () => {
  it('resolves the light and the dark colour of the header role from the scale colours', () => {
    const css = `
      --hf-colour-blue-800: #05326F;
      --hf-colour-blue-900: #04214e;
      --hf-colour-background-header: light-dark(var(--hf-colour-blue-900), var(--hf-colour-blue-800));
    `

    expect(headerColourOf(css)).toEqual({ dark: '#05326f', light: '#04214e' })
  })

  it('fails when the role is gone, instead of making the icons the wrong colour', () => {
    expect(() => headerColourOf('--hf-colour-blue-900: #04214e;')).toThrow(/--hf-colour-background-header/)
  })

  it('fails when a scale colour is gone', () => {
    expect(() =>
      headerColourOf('--hf-colour-background-header: light-dark(var(--a-1), var(--a-2)); --a-1: #000000;'),
    ).toThrow(/--a-2/)
  })

  it('reads the real colour tokens of the design system, which give two different dark blues', () => {
    const css = readFileSync(new URL('../../../packages/design-system/src/tokens/colour.css', import.meta.url), 'utf8')
    const { dark, light } = headerColourOf(css)

    expect(light).toMatch(/^#[0-9a-f]{6}$/)
    expect(dark).toMatch(/^#[0-9a-f]{6}$/)
    expect(dark).not.toBe(light)
  })
})
