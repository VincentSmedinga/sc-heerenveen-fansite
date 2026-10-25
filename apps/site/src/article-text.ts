/*
 * The format of the text of an article, and the function that reads it. The format is small on
 * purpose, so that whoever writes an article needs no HTML, and whoever takes over an account
 * can't put a script in a page:
 *
 * - paragraphs, separated by a blank line; the lines of one paragraph run together;
 * - a heading of level 2: one line that starts with `## `;
 * - a list: every line of the part starts with `- `;
 * - `**bold**` and `*italic*`; italic can stand inside bold, not the other way round;
 * - a link, `[text](address)`, to an address that starts with `https://`, or with a single `/`.
 *
 * Everything else is plain text, including HTML, images and addresses of any other kind. The
 * function gives a tree of plain data, and `ArticleText` turns that into elements, which React
 * escapes. No regular expression here runs over the whole text, and no scan goes back, so a
 * long or hostile text takes time in proportion to its length.
 */

export type Block =
  { children: Inline[]; type: 'paragraph' } | { items: Inline[][]; type: 'list' } | { text: string; type: 'heading' }

export type Inline =
  | { children: Inline[]; type: 'bold' | 'italic' }
  | { external: boolean; href: string; text: string; type: 'link' }
  | { text: string; type: 'text' }

/** The longest address of a link. A link that is longer is shown as text. */
const maxAddressLength = 2000

/** Reads the text of an article into blocks. */
export function parseArticleText(text: string): Block[] {
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

/**
 * Whether an address may be the target of a link: `'external'` for a full address that starts
 * with `https://`, `'internal'` for a page of ours (`/bronnen`), and undefined for anything else.
 * That is `http:`, `javascript:`, `data:`, an address without a scheme, a relative one, and one
 * that starts with `//` or `/\`, which a browser takes for another site. An address with white
 * space, a control character, a backslash, a quote, an angle bracket or a bracket is refused,
 * and so is one with a login in it (`https://www.lc.nl@evil.example`), which hides the real host.
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
        const end = allowBold ? text.indexOf('**', position + 2) : -1
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
