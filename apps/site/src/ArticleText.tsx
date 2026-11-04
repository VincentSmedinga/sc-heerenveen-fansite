import type { ArticleInline, ArticleMark } from '@fansite/shared/article-document'
import type { ReactNode } from 'react'

import { Emphasis, Heading, Link, List, Strong, Text } from '@fansite/design-system'
import { readArticleDocument, safeAddress } from '@fansite/shared/article-document'

/**
 * The text of an article as elements of the page: paragraphs, headings of level 2, lists, bold,
 * italic and links. `body` is the JSON that the editor stores (see
 * `@fansite/shared/article-document`), and it is checked again here, so a text that was put in
 * the database some other way shows nothing instead of something unsafe. It builds elements
 * and no HTML, and React escapes every string, so nothing in the text can become markup. A
 * link to another site gets the icon for an external link.
 */
export function ArticleText({ body }: { body: string }) {
  const result = readArticleDocument(body)

  if (!result.ok) {
    return null
  }

  return result.document.content.map((block, index) => {
    switch (block.type) {
      case 'bulletList':
        return (
          <List key={index}>
            {block.content.map((item, itemIndex) => (
              <List.Item key={itemIndex}>{inlineElements(item.content[0].content ?? [])}</List.Item>
            ))}
          </List>
        )
      case 'heading':
        return (
          <Heading key={index} level={2}>
            {inlineElements(block.content ?? [])}
          </Heading>
        )
      case 'paragraph':
        return <Text key={index}>{inlineElements(block.content ?? [])}</Text>
    }
  })
}

/**
 * The elements of some text nodes. Nodes that share a mark go in one element, as the editor
 * would write them: `**a *b* c**` is one `<strong>` with an `<em>` in it, and not three. The
 * marks are in the order bold, italic, link, so the outer element is always the first one.
 */
function inlineElements(inlines: ArticleInline[], depth = 0): ReactNode[] {
  const elements: ReactNode[] = []
  let index = 0

  while (index < inlines.length) {
    const mark = inlines[index]?.marks?.[depth]

    if (mark === undefined) {
      elements.push(inlines[index]?.text)
      index += 1

      continue
    }

    // Every following node that has this same mark in the same place belongs in the element.
    let end = index + 1

    while (end < inlines.length && sameMark(inlines[end]?.marks?.[depth], mark)) {
      end += 1
    }

    elements.push(markElement(mark, inlineElements(inlines.slice(index, end), depth + 1), elements.length))
    index = end
  }

  return elements
}

function markElement(mark: ArticleMark, children: ReactNode[], key: number) {
  switch (mark.type) {
    case 'bold':
      return <Strong key={key}>{children}</Strong>
    case 'italic':
      return <Emphasis key={key}>{children}</Emphasis>
    case 'link':
      return safeAddress(mark.attrs.href) === 'external' ? (
        <Link href={mark.attrs.href} icon="external-link" key={key} rel="noopener">
          {children}
        </Link>
      ) : (
        <Link href={mark.attrs.href} key={key}>
          {children}
        </Link>
      )
  }
}

function sameMark(a: ArticleMark | undefined, b: ArticleMark) {
  return a !== undefined && JSON.stringify(a) === JSON.stringify(b)
}
