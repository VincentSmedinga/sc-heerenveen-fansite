import type { ReactNode } from 'react'

import { Emphasis, Heading, Link, List, Strong, Text } from '@fansite/design-system'

import { type Inline, parseArticleText } from './article-text'

/**
 * The text of an article as elements of the page: paragraphs, headings of level 2, lists, bold,
 * italic and links (see `article-text.ts` for the format). It builds elements and no HTML, and
 * React escapes every string, so nothing in the text can become markup. A link to another site
 * gets the icon for an external link.
 */
export function ArticleText({ text }: { text: string }) {
  return parseArticleText(text).map((block, index) => {
    switch (block.type) {
      case 'heading':
        return (
          <Heading key={index} level={2}>
            {block.text}
          </Heading>
        )
      case 'list':
        return (
          <List key={index}>
            {block.items.map((item, itemIndex) => (
              <List.Item key={itemIndex}>{inlineElements(item)}</List.Item>
            ))}
          </List>
        )
      case 'paragraph':
        return <Text key={index}>{inlineElements(block.children)}</Text>
    }
  })
}

function inlineElements(inlines: Inline[]): ReactNode[] {
  return inlines.map((inline, index) => {
    switch (inline.type) {
      case 'bold':
        return <Strong key={index}>{inlineElements(inline.children)}</Strong>
      case 'italic':
        return <Emphasis key={index}>{inlineElements(inline.children)}</Emphasis>
      case 'link':
        return inline.external ? (
          <Link href={inline.href} icon="external-link" key={index} rel="noopener">
            {inline.text}
          </Link>
        ) : (
          <Link href={inline.href} key={index}>
            {inline.text}
          </Link>
        )
      case 'text':
        return inline.text
    }
  })
}
