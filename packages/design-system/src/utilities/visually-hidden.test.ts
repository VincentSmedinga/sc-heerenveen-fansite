import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(join(import.meta.dirname, path), 'utf8')

/**
 * The declarations of the class, as the browser parses the CSS file. jsdom doesn't apply rules
 * in a cascade layer to an element, so the test reads the rule instead of a computed style.
 */
function declarationsOf(selector: string) {
  const sheet = new CSSStyleSheet()
  sheet.replaceSync(read('visually-hidden.css'))

  const layers = [...sheet.cssRules].filter((rule) => rule instanceof CSSLayerBlockRule)
  expect(layers.map((layer) => layer.name)).toEqual(['hf.utilities'])

  const rule = [...(layers[0]?.cssRules ?? [])].find(
    (rule): rule is CSSStyleRule => rule instanceof CSSStyleRule && rule.selectorText === selector,
  )
  expect(rule, `no rule for ${selector}`).toBeDefined()

  return rule?.style
}

describe('hf-visually-hidden', () => {
  it('takes the element out of the flow, in a box of one pixel, and clips it to nothing', () => {
    const style = declarationsOf('.hf-visually-hidden')

    expect(style?.getPropertyValue('position')).toBe('absolute')
    expect(style?.getPropertyValue('inline-size')).toBe('1px')
    expect(style?.getPropertyValue('block-size')).toBe('1px')
    expect(style?.getPropertyValue('overflow')).toBe('hidden')
    expect(style?.getPropertyValue('clip-path')).toBe('inset(50%)')
  })

  it('gives the box no margin, padding or border, so it takes no room and keeps the page as wide as it was', () => {
    const style = declarationsOf('.hf-visually-hidden')

    expect(style?.getPropertyValue('margin')).toBe('0px')
    expect(style?.getPropertyValue('padding')).toBe('0px')
    expect(style?.getPropertyValue('border-width')).toBe('0px')
  })

  it('keeps the text on one line, so a screen reader reads the words apart', () => {
    expect(declarationsOf('.hf-visually-hidden')?.getPropertyValue('white-space')).toBe('nowrap')
  })

  it('leaves it in the accessibility tree: it hides nothing from a screen reader', () => {
    const style = declarationsOf('.hf-visually-hidden')

    expect(style?.getPropertyValue('display')).toBe('')
    expect(style?.getPropertyValue('visibility')).toBe('')
    expect(style?.getPropertyValue('content-visibility')).toBe('')
  })

  it('is in the strongest layer of the design system, so a component or type style can not undo it', () => {
    expect(read('../layers.css')).toContain('@layer hf.tokens, hf.base, hf.typography, hf.components, hf.utilities;')
    expect(read('../index.css')).toContain("@import url('./utilities/visually-hidden.css');")
  })
})
