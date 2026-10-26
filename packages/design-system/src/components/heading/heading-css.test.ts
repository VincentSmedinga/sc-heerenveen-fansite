import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const components = join(import.meta.dirname, '..')

// Without the comments, which mention the rules in words.
const read = (file: string) => readFileSync(join(components, file), 'utf8').replace(/\/\*.*?\*\//gs, '')

// jsdom doesn't apply rules in a cascade layer or break lines, so the test reads the text of
// the files.
const css = read('heading/heading.css')

// The selector list of each @supports (text-wrap: balance) block, in the order they are in
// the file.
const balanced = [
  ...css.matchAll(/@supports \(text-wrap: balance\) \{\s*([^{}]*?)\s*\{\s*text-wrap: balance;\s*\}\s*\}/g),
].map(([, selector]) => selector?.replace(/\s+/g, ' '))

describe('the balanced line breaks in heading.css', () => {
  it('balances the headings h1 to h6 and the headline, inside @supports so another browser wraps as a paragraph does', () => {
    expect(balanced).toEqual([':is(h1, h2, h3, h4, h5, h6)', '.hf-headline'])
  })

  it('sets text-wrap in no other place of this file, so a rule is not outside the @supports', () => {
    // Each block names it twice: in the condition and in the declaration.
    expect(css.match(/text-wrap/g)).toHaveLength(balanced.length * 2)
  })

  it('sets it once per type style: no component has its own text-wrap for what .hf-headline or a heading covers', () => {
    for (const file of [
      'article-card/article-card.css',
      'discussion-item/discussion-item.css',
      'news-item/news-item.css',
      'article/article.css',
    ]) {
      expect(read(file), file).not.toContain('text-wrap')
    }
  })

  it('keeps overflow-wrap: anywhere in the components, so a long word breaks and the page does not scroll sideways', () => {
    for (const file of [
      'article-card/article-card.css',
      'discussion-item/discussion-item.css',
      'news-item/news-item.css',
    ]) {
      expect(read(file), file).toMatch(/overflow-wrap: anywhere;/)
    }
  })
})

describe('the headline in the components', () => {
  it('is the type style of the news headline and of the title of a discussion', () => {
    expect(readFileSync(join(components, 'news-item/NewsItem.tsx'), 'utf8')).toContain(
      'hf-headline hf-news-item-headline',
    )
    expect(readFileSync(join(components, 'discussion-item/DiscussionItem.tsx'), 'utf8')).toContain(
      'hf-headline hf-discussion-item-title',
    )
  })

  it('has the title of a card as a heading, which the rule for headings balances', () => {
    expect(readFileSync(join(components, 'article-card/ArticleCard.tsx'), 'utf8')).toMatch(/<Heading[^>]*level=\{3\}/)
  })
})
