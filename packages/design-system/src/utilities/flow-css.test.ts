import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const src = join(import.meta.dirname, '..')

// jsdom doesn't apply rules in a cascade layer, and doesn't parse nested rules, so the tests
// read the text of the files, without the comments, which mention the rules in words.
const read = (file: string) => readFileSync(join(src, file), 'utf8').replaceAll(/\/\*.*?\*\//gsu, '')

const flow = read('utilities/flow.css')

/** The text between the braces of the first block with this selector, nested blocks too. */
const block = (css: string, selector: string) => {
  const open = css.indexOf(`${selector} {`)

  if (open === -1) {
    return ''
  }

  let depth = 0

  for (let index = css.indexOf('{', open); index < css.length; index += 1) {
    depth += css[index] === '{' ? 1 : css[index] === '}' ? -1 : 0

    if (depth === 0) {
      return css.slice(css.indexOf('{', open) + 1, index)
    }
  }

  return ''
}

/** A selector list, split on the commas outside brackets: `:is(h1, h2)` stays one selector. */
const splitSelectors = (list: string) => {
  const selectors: string[] = []
  let depth = 0
  let current = ''

  for (const character of list) {
    depth += character === '(' ? 1 : character === ')' ? -1 : 0

    if (character === ',' && depth === 0) {
      selectors.push(current)
      current = ''
    } else {
      current += character
    }
  }

  return [...selectors, current].map((part) => part.replaceAll(/\s+/gu, ' ').trim()).filter(Boolean)
}

/** The selectors and the body of each rule in a block, in order, without the nested blocks. */
const rules = (css: string) =>
  [...css.matchAll(/([^{};]+)\{([^{}]*)\}/gu)].map(([, selector, body]) => ({
    body: (body ?? '').trim(),
    selectors: splitSelectors(selector ?? ''),
  }))

const headings = ':is(h1, h2, h3, h4, h5, h6)'
const containers = block(
  flow,
  ':where(.hf-card, .hf-page-cell, .hf-page-intro, .hf-article, .hf-disclosure-content, .hf-flow)',
)
const containerRules = rules(containers)
const everyChild = containerRules.find((rule) => rule.selectors.includes('> *'))
const large = containerRules.find((rule) => rule.selectors.includes(`> ${headings}`))
const last = containerRules.find((rule) => rule.selectors.includes('> :last-child'))

describe('the flow', () => {
  it('is in the layer hf.flow, between the components and the utilities', () => {
    expect(flow).toContain('@layer hf.flow {')
    expect(read('layers.css')).toContain('hf.components, hf.flow, hf.utilities;')
  })

  it('holds the containers: a card, a cell, an introduction, an article, the content of a disclosure and hf-flow', () => {
    expect(containers).not.toBe('')
  })

  it('gives every child the medium step under it and none above it', () => {
    expect(everyChild?.body).toBe('margin-block: 0 var(--hf-space-m);')
  })

  it('gives a heading, a large block, the child before a heading or a rule, and a rule the large step', () => {
    expect(large?.body).toBe('margin-block-end: var(--hf-space-l);')
    expect(large?.selectors).toContain(`> :has(+ ${headings.replace('h6)', 'h6, hr)')})`)
    expect(large?.selectors).toContain('> hr')
  })

  it('lists the large blocks in one place: a change to the list is deliberate', () => {
    const list = large?.selectors.find((selector) => selector.startsWith('> :where('))

    expect(list).toBe(
      '> :where( table, .hf-data-table-group, .hf-bar-place, .hf-bar-chart, .hf-donut-chart, .hf-donut-chart-group, .hf-form-chart, .hf-input-table, .hf-tile-grid )',
    )
  })

  it('gives the last child no space, also when only a hidden line for the screen reader follows it', () => {
    expect(last?.body).toBe('margin-block-end: 0;')
    expect(last?.selectors).toContain('> :has(+ .hf-visually-hidden:last-child)')
  })

  it('puts the rule for the last child after the others, so it wins at the same specificity', () => {
    expect(containerRules.indexOf(last!)).toBeGreaterThan(containerRules.indexOf(large!))
    expect(containerRules.indexOf(last!)).toBeGreaterThan(containerRules.indexOf(everyChild!))
  })

  it('gives the text of an article the extra large step before a heading or a rule', () => {
    const article = rules(block(flow, '.hf-article')).find((rule) => rule.selectors.includes('> hr:not(:last-child)'))

    expect(article?.body).toBe('margin-block-end: var(--hf-space-xl);')
    expect(article?.selectors).toContain(`> :has(+ ${headings.replace('h6)', 'h6, hr)')})`)
  })

  it('gives a rule that is the last child of an article no space: the article rule leaves it out', () => {
    const article = rules(block(flow, '.hf-article')).flatMap((rule) => rule.selectors)

    expect(article).not.toContain('> hr')
    expect(article).toContain('> hr:not(:last-child)')
  })

  it('has no step above a child anywhere: the space is only under a child', () => {
    expect(flow).not.toMatch(/margin-block-start: var/u)
  })
})

describe('the utility classes for the space under one element', () => {
  const utilities = read('utilities/space-end.css')

  it('are in the last layer, so they win over the flow', () => {
    expect(utilities).toContain('@layer hf.utilities {')
    expect(read('layers.css')).toMatch(/hf\.utilities;\s*$/u)
  })

  it('are hf-space-end-0, -xs, -s, -m and -l, and there is none for the extra large step', () => {
    const classes = rules(block(utilities, '@layer hf.utilities')).map(
      ({ body, selectors }) => `${selectors[0]} ${body}`,
    )

    expect(classes).toEqual([
      '.hf-space-end-0 margin-block-end: 0;',
      '.hf-space-end-xs margin-block-end: var(--hf-space-xs);',
      '.hf-space-end-s margin-block-end: var(--hf-space-s);',
      '.hf-space-end-m margin-block-end: var(--hf-space-m);',
      '.hf-space-end-l margin-block-end: var(--hf-space-l);',
    ])
  })
})

describe('the containers', () => {
  it('leave the space to the flow: no rule for the first or the last child of a card, a cell, an article or a disclosure', () => {
    for (const file of [
      'components/card/card.css',
      'components/page/page.css',
      'components/article/article.css',
      'components/disclosure/disclosure.css',
    ]) {
      expect(read(file), file).not.toMatch(/> :(first|last)-child \{\s*margin-block-(start|end): 0;/u)
    }
  })

  it('are ordinary blocks: the content of a disclosure has no grid with a gap', () => {
    expect(block(read('components/disclosure/disclosure.css'), '.hf-disclosure-content')).not.toMatch(
      /display: grid|gap:/u,
    )
  })
})
