import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { attachIcon } from './attachIcon'

const icon = <svg data-testid="icon" />

const html = (node: React.ReactNode) => {
  const { container } = render(<p>{node}</p>)

  return container.querySelector('p')?.innerHTML
}

describe('attachIcon', () => {
  it('puts the icon behind the last word, in a group that does not break', () => {
    expect(html(attachIcon('Alle podcasts', icon, 'after'))).toBe(
      'Alle <span class="hf-icon-tail">podcasts<svg data-testid="icon"></svg></span>',
    )
  })

  it('puts the icon in front of the first word, in a group that does not break', () => {
    expect(html(attachIcon('Laad 5 meer', icon, 'before'))).toBe(
      '<span class="hf-icon-head"><svg data-testid="icon"></svg>Laad</span> 5 meer',
    )
  })

  it('groups a text of one word whole', () => {
    expect(html(attachIcon('Volgende', icon, 'after'))).toBe(
      '<span class="hf-icon-tail">Volgende<svg data-testid="icon"></svg></span>',
    )
    expect(html(attachIcon('Vorige', icon, 'before'))).toBe(
      '<span class="hf-icon-head"><svg data-testid="icon"></svg>Vorige</span>',
    )
  })

  it('leaves out the white space at the end of the last word and at the start of the first', () => {
    expect(html(attachIcon('Alle podcasts \n', icon, 'after'))).toBe(
      'Alle <span class="hf-icon-tail">podcasts<svg data-testid="icon"></svg></span>',
    )
    expect(html(attachIcon('\n  Laad 5 meer', icon, 'before'))).toBe(
      '<span class="hf-icon-head"><svg data-testid="icon"></svg>Laad</span> 5 meer',
    )
  })

  it('splits the last text of several children, and keeps the rest as it is', () => {
    expect(html(attachIcon([<b key="a">Apple</b>, ' Podcasts nu'], icon, 'after'))).toBe(
      '<b>Apple</b> Podcasts <span class="hf-icon-tail">nu<svg data-testid="icon"></svg></span>',
    )
  })

  it('keeps only the letter next to the icon with `letter`, so the rest of the word can break', () => {
    expect(html(attachIcon('fansite@heerenveen.org', icon, 'before', 'letter'))).toBe(
      '<span class="hf-icon-head"><svg data-testid="icon"></svg>f</span>ansite@heerenveen.org',
    )
    expect(html(attachIcon('fansite@heerenveen.org', icon, 'after', 'letter'))).toBe(
      'fansite@heerenveen.or<span class="hf-icon-tail">g<svg data-testid="icon"></svg></span>',
    )
    expect(html(attachIcon('  Mail ons  ', icon, 'before', 'letter'))).toBe(
      '<span class="hf-icon-head"><svg data-testid="icon"></svg>M</span>ail ons  ',
    )
  })

  it('takes the icon alone in a group when the content does not end with text', () => {
    expect(html(attachIcon(<b>Apple</b>, icon, 'after'))).toBe(
      '<b>Apple</b><span class="hf-icon-tail"><svg data-testid="icon"></svg></span>',
    )
  })
})
