/*
 * The format that the text of an article had before it was stored as Tiptap's JSON, and the
 * function that reads it. It is here for one purpose: `article-body-migration.ts` turns every
 * article and version that still has the old format into JSON, and this is its source. It
 * is a copy of the parser that the site used until then, so what a visitor read before is what
 * they read after. Nothing else may use it, and it can go once acceptance and the live site
 * have run the migration.
 *
 * The format was small on purpose:
 *
 * - paragraphs, separated by a blank line; the lines of one paragraph run together;
 * - a heading of level 2: one line that starts with `## `;
 * - a list: every line of the part starts with `- `;
 * - `**bold**` and `*italic*`; italic can stand inside bold, not the other way round;
 * - a link, `[text](address)`, to an address that starts with `https://`, or with a single `/`.
 *
 * Everything else is plain text. No regular expression here runs over the whole text, and no
 * scan goes back, so a long or hostile text takes time in proportion to its length.
 */

import { safeAddress } from '@fansite/shared/article-document'

export type Block =
  { children: Inline[]; type: 'paragraph' } | { items: Inline[][]; type: 'list' } | { text: string; type: 'heading' }

export type Inline =
  | { children: Inline[]; type: 'bold' | 'italic' }
  | { external: boolean; href: string; text: string; type: 'link' }
  | { text: string; type: 'text' }

/** Reads the text of an article in the old format into blocks. */
export function readLegacyArticleText(text: string): Block[] {
  const blocks: Block[] = []
  let lines: string[] = []

  const finish = () => {
    if (lines.length > 0) {
      blocks.push(blockOf(lines))
      lines = []
    }
  }

  for (const line of text.split(/\r\n|\r|\n/u)) {
    const trimmed = line.trim()

    if (trimmed === '') {
      finish()
    } else {
      lines.push(trimmed)
    }
  }
  finish()

  return blocks
}

/** The block that the lines of one part stand for. The lines are trimmed and none is empty. */
function blockOf(lines: string[]): Block {
  const [first] = lines

  if (lines.length === 1 && first !== undefined && first.startsWith('## ')) {
    return { text: first.slice(3).trim(), type: 'heading' }
  }
  if (lines.every((line) => line.startsWith('- '))) {
    return { items: lines.map((line) => parseInline(line.slice(2).trim(), true)), type: 'list' }
  }

  return { children: parseInline(lines.join(' '), true), type: 'paragraph' }
}

/**
 * Where the `**` that closes bold starts, searching from `from`, or -1. At the end of
 * `**bold and *italic***` three stars follow each other, and the last two close the bold, so
 * the first one stays with the italic.
 */
function closerOfBold(text: string, from: number) {
  let end = text.indexOf('**', from)

  while (end !== -1 && text.charAt(end + 2) === '*') {
    end += 1
  }

  return end
}

/** Whether the text starts and ends with something that is not white space, and is not empty.
 * */
function isTight(text: string) {
  return text !== '' && !/\s/u.test(text.charAt(0)) && !/\s/u.test(text.charAt(text.length - 1))
}

/**
 * The link that starts at the `[` at `start`, and the position after it, or undefined when
 * there is none. The text of the link holds no `[` or `]`, and the address holds no white space
 * or bracket, so each scan stops at the first mark that ends the link.
 */
function linkAt(text: string, start: number): undefined | { end: number; inline: Inline } {
  let close = start + 1

  while (close < text.length && text.charAt(close) !== ']') {
    if (text.charAt(close) === '[') {
      return undefined
    }
    close += 1
  }
  if (close >= text.length || close === start + 1 || text.charAt(close + 1) !== '(') {
    return undefined
  }

  let end = close + 2

  while (end < text.length && text.charAt(end) !== ')') {
    if (/[\s()[\]]/u.test(text.charAt(end))) {
      return undefined
    }
    end += 1
  }
  if (end >= text.length) {
    return undefined
  }

  const label = text.slice(start + 1, close)
  const address = text.slice(close + 2, end)
  const kind = safeAddress(address)

  if (kind === undefined || label.trim() === '') {
    return undefined
  }

  return { end: end + 1, inline: { external: kind === 'external', href: address, text: label, type: 'link' } }
}

/**
 * Reads bold, italic and links. Bold is only read when `allowBold` is true, so its content, in
 * which italic and links still count, can't hold bold again. A marker without a partner, or
 * with white space against it (`2 * 3 * 4`), stays as it is. Every scan for a partner ends at
 * the first match or the first mark that rules one out, and a failed marker moves the position
 * on, so the work is in proportion to the length of the text.
 */
function parseInline(text: string, allowBold: boolean): Inline[] {
  const result: Inline[] = []
  let plain = ''
  let position = 0

  const flush = () => {
    if (plain !== '') {
      result.push({ text: plain, type: 'text' })
      plain = ''
    }
  }

  while (position < text.length) {
    const char = text.charAt(position)

    if (char === '*') {
      if (text.charAt(position + 1) === '*') {
        const end = allowBold ? closerOfBold(text, position + 2) : -1
        const content = end === -1 ? '' : text.slice(position + 2, end)

        if (isTight(content)) {
          flush()
          result.push({ children: parseInline(content, false), type: 'bold' })
          position = end + 2
        } else {
          plain += '**'
          position += 2
        }

        continue
      }

      const end = text.indexOf('*', position + 1)
      const content = end === -1 ? '' : text.slice(position + 1, end)

      if (isTight(content)) {
        flush()
        result.push({ children: parseInline(content, false), type: 'italic' })
        position = end + 1
      } else {
        plain += '*'
        position += 1
      }

      continue
    }

    if (char === '[') {
      const link = linkAt(text, position)

      if (link !== undefined) {
        flush()
        result.push(link.inline)
        position = link.end

        continue
      }
    }

    plain += char
    position += 1
  }

  flush()

  return result
}
