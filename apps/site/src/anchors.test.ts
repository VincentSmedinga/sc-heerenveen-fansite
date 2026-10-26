import { isAnchorId, isOldAnchorId } from '@fansite/design-system'
import { describe, expect, it } from 'vitest'

import { anchorProblems, publishedAnchors } from './anchors'

/** A heading with an anchor, as the Heading of the design system draws it. */
const heading = (id: string, old: readonly string[] = []) =>
  `<h2 class="hf-heading-2 hf-heading-anchored" id="${id}"><span class="hf-heading-target"><svg></svg></span>${old
    .map((alias) => `<span class="hf-heading-alias" id="${alias}"></span>`)
    .join('')}<a class="hf-heading-link" href="#${id}">Kop</a></h2>`

describe('the published anchors', () => {
  it('are on pages that exist, in Dutch and without a double', () => {
    for (const [page, anchors] of Object.entries(publishedAnchors)) {
      expect(page, page).toMatch(/^\//)
      expect(new Set(anchors).size, page).toBe(anchors.length)

      for (const anchor of anchors) {
        expect(isOldAnchorId(anchor), `${page}#${anchor}`).toBe(true)
      }
    }
  })

  it('follow the rules for an anchor, except the old ones that came before them', () => {
    const broken = Object.values(publishedAnchors)
      .flat()
      .filter((anchor) => !isAnchorId(anchor))

    expect(broken).toEqual(['versie-0.1.0', 'versie-0.2.0'])
  })
})

describe('anchorProblems', () => {
  it('finds nothing when every published anchor is on the page and every anchor is published', () => {
    const html = heading('cookies') + heading('wie-we-zijn', ['wie-zijn-we'])

    expect(anchorProblems('/privacy', html, ['cookies', 'wie-we-zijn', 'wie-zijn-we'])).toEqual([])
  })

  it('fails when a published anchor is gone from the page', () => {
    const problems = anchorProblems('/privacy', heading('cookies'), ['cookies', 'browser'])

    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^\/privacy: the anchor "#browser" is gone\./)
  })

  it('accepts a published anchor that stays as an old anchor, and a heading that moved with a redirect', () => {
    expect(anchorProblems('/privacy', heading('cookies', ['browser']), ['cookies', 'browser'])).toEqual([])
  })

  it('fails when a heading with an anchor is not published yet', () => {
    const problems = anchorProblems('/privacy', heading('cookies') + heading('nieuw'), ['cookies'])

    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/the anchor "#nieuw" is new/)
  })

  it('fails on an id that is on the page twice, also when it clashes with something else', () => {
    const html = `<li id="nieuws-3"></li>${heading('nieuws-3')}`
    const problems = anchorProblems('/', html, ['nieuws-3'])

    expect(problems).toEqual(['/: the id "nieuws-3" is on the page more than once, so a link to it is ambiguous.'])
  })

  it('does not take an id for another attribute, and counts an id on any element', () => {
    expect(anchorProblems('/', '<a data-id="x" href="#x">x</a><p id="x"></p>', [])).toEqual([])
    expect(anchorProblems('/', '<p id="x"></p><div id="x"></div>', [])).toHaveLength(1)
  })
})
