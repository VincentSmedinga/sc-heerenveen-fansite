/*
 * The text of an article: Tiptap's JSON, checked against a list of what an article may hold.
 * The editor in the admin makes this JSON, but the server never trusts the browser: every save
 * goes through `readArticleDocument`, and the site shows only what the function gives back.
 *
 * What an article may hold:
 *
 * - paragraphs;
 * - a heading of level 2;
 * - a list with bullets, of items that each hold one paragraph;
 * - bold, italic and a link, as marks on text; a link has an address that starts with
 *   `https://`, or with a single `/`.
 *
 * Everything else is refused: another node, another mark, an attribute that isn't listed, a
 * link to another kind of address. Because the list is a fixed shape, the document can't nest
 * deeper than a list item in a list, so no input makes the function recurse far. The result is
 * rebuilt from what was checked, so it holds nothing that wasn't on the list, and the same text
 * always gives the same string.
 */

export type ArticleBlock = ArticleHeading | ArticleList | ArticleParagraph

export type ArticleDocument = { content: ArticleBlock[]; type: 'doc' }

/**
 * What is wrong with a document that is refused: it isn't JSON of the right shape
 * (`unreadable`), it is too big (`too-large`), it holds something that isn't on the list
 * (`component`), or a link has an address that isn't allowed (`link`).
 */
export type ArticleDocumentProblem = 'component' | 'link' | 'too-large' | 'unreadable'

export type ArticleDocumentResult =
  | { document: ArticleDocument; hasText: boolean; json: string; ok: true; textLength: number }
  | { ok: false; problem: ArticleDocumentProblem }

export type ArticleHeading = { attrs: { level: 2 }; content?: ArticleInline[]; type: 'heading' }

export type ArticleInline = { marks?: ArticleMark[]; text: string; type: 'text' }

export type ArticleList = { content: ArticleListItem[]; type: 'bulletList' }

export type ArticleListItem = { content: [ArticleParagraph]; type: 'listItem' }

export type ArticleMark = { attrs: { href: string }; type: 'link' } | { type: 'bold' | 'italic' }

export type ArticleParagraph = { content?: ArticleInline[]; type: 'paragraph' }

/** The most characters of the JSON of an article. The limit on the visible text is stricter. */
export const articleJsonMaxLength = 1_000_000

/** The longest address of a link. */
const maxAddressLength = 2000

/** The most marks on one piece of text: bold, italic and a link. */
const maxMarks = 3

const markOrder = ['bold', 'italic', 'link'] as const

/** The order of the keys of a node, as Tiptap writes them. */
const keyOrder = ['type', 'attrs', 'content', 'marks', 'text', 'level', 'href']

type Counter = { hasText: boolean; length: number }

/** Every key a node, mark or attribute list may have; `asObject` refuses any other. */
type Json = {
  attrs?: unknown
  content?: unknown
  href?: unknown
  level?: unknown
  marks?: unknown
  text?: unknown
  type?: unknown
}

class Refusal extends Error {
  readonly problem: ArticleDocumentProblem

  constructor(problem: ArticleDocumentProblem) {
    super(problem)
    this.problem = problem
  }
}

/**
 * Checks the JSON of an article and gives the document, rebuilt from the parts that are on the
 * list, the string to store (`json`), the number of characters of visible text and whether any
 * of it is more than white space. Text with a
 * control character gets a space for it, and a piece of text without characters is dropped.
 * Whether the text is long enough, or too long, is for the caller to decide with `textLength`.
 */
export function readArticleDocument(json: string): ArticleDocumentResult {
  if (json.length > articleJsonMaxLength) {
    return { ok: false, problem: 'too-large' }
  }

  let value: unknown

  try {
    value = JSON.parse(json)
  } catch {
    return { ok: false, problem: 'unreadable' }
  }

  try {
    const counter: Counter = { hasText: false, length: 0 }
    const document = documentOf(value, counter)

    return {
      document,
      hasText: counter.hasText,
      json: serialiseArticleDocument(document),
      ok: true,
      textLength: counter.length,
    }
  } catch (error) {
    if (error instanceof Refusal) {
      return { ok: false, problem: error.problem }
    }

    throw error
  }
}

/**
 * Whether an address may be the target of a link: `'external'` for a full address that starts
 * with `https://`, `'internal'` for a page of ours (`/bronnen`), and undefined for the rest.
 * That is `http:`, `javascript:`, `data:`, an address without a scheme, a relative one, and one
 * that starts with `//` or `/\`, which a browser takes for another site. An address with white
 * space, a control character, a backslash, a quote, an angle bracket or a bracket is refused,
 * and so is one with a login in it (`https://www.lc.nl@evil.example`), which hides the real
 * host.
 */
export function safeAddress(address: string): 'external' | 'internal' | undefined {
  if (address.length > maxAddressLength || !/^[^\s\\()[\]"'<>]+$/u.test(address) || /\p{Cc}/u.test(address)) {
    return undefined
  }
  if (address.startsWith('/')) {
    return address[1] === '/' ? undefined : 'internal'
  }
  if (!address.startsWith('https://')) {
    return undefined
  }

  const authority = address.slice('https://'.length).split(/[/?#]/u, 1)[0] ?? ''

  if (authority === '' || authority.includes('@')) {
    return undefined
  }

  try {
    return new URL(address).hostname === '' ? undefined : 'external'
  } catch {
    return undefined
  }
}

/**
 * The string to store for a document. The same document always gives the same string, with the
 * keys in the order Tiptap writes them (`keyOrder`), whatever order the objects were built in,
 * so a stored text always starts with `{"type":"doc"`.
 */
export function serialiseArticleDocument(document: ArticleDocument) {
  return JSON.stringify(document, (_key, value: unknown) =>
    typeof value === 'object' && value !== null && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).toSorted(([a], [b]) => keyOrder.indexOf(a) - keyOrder.indexOf(b)))
      : value,
  )
}

function asArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) {
    throw new Refusal('component')
  }

  return value
}

function asObject(value: unknown, keys: readonly string[]): Json {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Refusal('component')
  }

  const object = value as Json

  if (!Object.keys(object).every((key) => keys.includes(key))) {
    throw new Refusal('component')
  }

  return object
}

function blockOf(value: unknown, counter: Counter): ArticleBlock {
  const object = asObject(value, ['attrs', 'content', 'type'])

  switch (object.type) {
    case 'bulletList': {
      if (object.attrs !== undefined) {
        throw new Refusal('component')
      }

      const items = asArray(object.content)

      if (items.length === 0) {
        throw new Refusal('component')
      }

      return { content: items.map((item) => itemOf(item, counter)), type: 'bulletList' }
    }
    case 'heading': {
      const attrs = asObject(object.attrs, ['level'])

      if (attrs.level !== 2) {
        throw new Refusal('component')
      }

      return withContent({ attrs: { level: 2 }, type: 'heading' }, object.content, counter)
    }
    case 'paragraph':
      return paragraphOf(object, counter)
    default:
      throw new Refusal('component')
  }
}

function documentOf(value: unknown, counter: Counter): ArticleDocument {
  const object = asObject(value, ['content', 'type'])

  if (object.type !== 'doc') {
    throw new Refusal('unreadable')
  }

  const content = object.content === undefined ? [] : asArray(object.content)

  return { content: content.map((block) => blockOf(block, counter)), type: 'doc' }
}

/** The text node, or nothing for a node without characters. */
function inlineOf(value: unknown, counter: Counter): ArticleInline[] {
  const object = asObject(value, ['marks', 'text', 'type'])

  if (object.type !== 'text' || typeof object.text !== 'string') {
    throw new Refusal('component')
  }

  const text = object.text.replaceAll(/\p{Cc}/gu, ' ')
  const marks = marksOf(object.marks)

  if (text === '') {
    return []
  }

  counter.length += [...text].length
  counter.hasText ||= text.trim() !== ''

  return [marks.length === 0 ? { text, type: 'text' } : { marks, text, type: 'text' }]
}

function itemOf(value: unknown, counter: Counter): ArticleListItem {
  const object = asObject(value, ['content', 'type'])
  const content = asArray(object.content)

  if (object.type !== 'listItem' || content.length !== 1) {
    throw new Refusal('component')
  }

  const paragraph = asObject(content[0], ['content', 'type'])

  if (paragraph.type !== 'paragraph') {
    throw new Refusal('component')
  }

  return { content: [paragraphOf(paragraph, counter)], type: 'listItem' }
}

function marksOf(value: unknown): ArticleMark[] {
  const list = value === undefined ? [] : asArray(value)

  if (list.length > maxMarks) {
    throw new Refusal('component')
  }

  const marks = list.map((mark): ArticleMark => {
    const object = asObject(mark, ['attrs', 'type'])

    switch (object.type) {
      case 'bold':
      case 'italic':
        if (object.attrs !== undefined) {
          throw new Refusal('component')
        }

        return { type: object.type }
      case 'link': {
        const attrs = asObject(object.attrs, ['href'])

        if (typeof attrs.href !== 'string') {
          throw new Refusal('component')
        }
        if (safeAddress(attrs.href) === undefined) {
          throw new Refusal('link')
        }

        return { attrs: { href: attrs.href }, type: 'link' }
      }
      default:
        throw new Refusal('component')
    }
  })

  if (new Set(marks.map((mark) => mark.type)).size !== marks.length) {
    throw new Refusal('component')
  }

  return marks.toSorted((a, b) => markOrder.indexOf(a.type) - markOrder.indexOf(b.type))
}

function paragraphOf(object: Json, counter: Counter): ArticleParagraph {
  if (object.attrs !== undefined) {
    throw new Refusal('component')
  }

  return withContent({ type: 'paragraph' }, object.content, counter)
}

/** The block with its text, when there is any: an empty block has no `content`. */
function withContent<T extends { type: string }>(
  block: T,
  content: unknown,
  counter: Counter,
): T & { content?: ArticleInline[] } {
  const inlines = (content === undefined ? [] : asArray(content)).flatMap((inline) => inlineOf(inline, counter))

  return inlines.length === 0 ? block : { ...block, content: inlines }
}
