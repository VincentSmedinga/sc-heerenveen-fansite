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

// The other type styles and components that balance their lines, each once, in its own file.
// The headline is not in this list: it is in heading.css, with the headings.
const elsewhere = [
  ['text/text.css', '.hf-intro'],
  ['match/match.css', '.hf-match-clubs'],
  ['field/field.css', '.hf-field-hint, .hf-field-error'],
  ['error-summary/error-summary.css', '.hf-error-summary li'],
] as const

// The selector list of each @supports (text-wrap: balance) block of a file, on one line.
const balancedIn = (file: string) =>
  [...read(file).matchAll(/@supports \(text-wrap: balance\) \{\s*([^{}]*?)\s*\{\s*text-wrap: balance;\s*\}\s*\}/g)].map(
    ([, selector]) => selector?.replace(/\s+/g, ' '),
  )

describe.each(elsewhere)('the balanced line breaks in %s', (file, selector) => {
  it(`balance ${selector} once, inside @supports so another browser wraps as a paragraph does`, () => {
    expect(balancedIn(file)).toEqual([selector])
    expect(read(file).match(/text-wrap/g)).toHaveLength(2)
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

describe('the anchor in heading.css', () => {
  // The rule blocks of the media queries and the rules, as text.
  const hover = /@media \(hover: hover\) \{(?<body>(?:[^{}]|\{[^{}]*\})*)\}/.exec(css)?.groups?.['body'] ?? ''

  it('hides the icon only for a device with a hover, so a touch screen always shows it', () => {
    expect(hover).toMatch(/\.hf-icon \{\s*opacity: 0;\s*\}/)
    expect(hover).toMatch(/:is\(:hover, :focus-visible\) \.hf-icon \{\s*opacity: 1;\s*\}/)
    // The only opacity in the file is inside the media query.
    expect(css.match(/opacity/g)).toHaveLength(2)
  })

  it('shows the icon with the colour of links under the mouse and with the focus, and quiet at rest', () => {
    expect(css).toMatch(/\.hf-icon \{\s*color: var\(--hf-colour-text-secondary\);\s*\}/)
    expect(css).toMatch(/:is\(:hover, :focus-visible\) \.hf-icon \{\s*color: var\(--hf-colour-text-link\);\s*\}/)
  })

  it('gives the link the colour of the heading and no underline, also under the mouse', () => {
    expect(css).toMatch(/\.hf-heading-link \{\s*color: inherit;\s*text-decoration: none;/)
    expect(css).toMatch(/&:hover \{\s*color: inherit;\s*text-decoration: none;\s*\}/)
  })

  it('does not print the icon, and gives it the colour of links in forced colours', () => {
    expect(css).toMatch(/@media print \{\s*\.hf-icon \{\s*display: none;\s*\}/)
    expect(css).toMatch(/@media \(forced-colors: active\) \{\s*\.hf-icon,[^}]*color: LinkText;/)
  })

  it('marks the target with a bar at the start side in the accent colour, and with an outline in forced colours', () => {
    expect(css).toMatch(
      /:is\(:target, :has\(:target\)\)::before \{[^}]*background-color: var\(--hf-colour-text-accent\);/,
    )
    expect(css).toMatch(/inset-inline-start: -0\.75rem;/)
    expect(css).toMatch(
      /@media \(forced-colors: active\) \{\s*\.hf-heading-anchored:is\(:target, :has\(:target\)\) \{\s*outline:/,
    )
  })

  it('keeps room above the target and above an old anchor, and moves nothing', () => {
    expect(css).toMatch(/\.hf-heading-anchored \{[^}]*scroll-margin-block-start: 1\.5rem;/)
    expect(css).toMatch(/\.hf-heading-alias \{\s*scroll-margin-block-start: 1\.5rem;/)
    expect(css).not.toMatch(/transition|animation|(?<!text-)transform|scroll-behavior/)
  })
})
