/**
 * The one place that reads the headings of wikitext (`== Title ==`). Anyone can edit
 * Wikipedia, so every function takes linear time on any line, however long. That is why the
 * equals signs and the blanks are counted by hand: a pattern with a lazy title between two runs
 * of equals signs and blanks tries so many ways on a line that does not close that it can hang
 * an import (#1685).
 */

/** A heading: a line with equals signs at both ends and something between them. */
export type Heading = {
  /** The number of equals signs at both ends that make the heading. */
  level: number
  /** The number of equals signs the line starts with, which can be more than the level. */
  opening: number
  /** The text between the signs of the level, without the spaces and tabs around it. */
  title: string
}

/** A line with equals signs at both ends, whatever their numbers. */
export type LooseHeading = {
  opening: number
  /** The text between the two runs of equals signs, without the spaces and tabs around it. */
  title: string
}

/** A heading with the place of its line in the text. */
export type PlacedHeading = Heading & {
  /** Where the line ends, before its line break. */
  end: number
  /** Where the line starts. */
  index: number
}

/** A line that starts with an equals sign. `.` stops at a line break, so this is linear. */
const equalsLine = /^=.*$/gmu

const lineBreak = /[\n\r\u2028\u2029]/u

/**
 * The last of these headings that starts before this place in the text, or undefined. The
 * headings are in the order of the text. It halves the list at each step: a search from the
 * end for every table or template of a page takes quadratic time.
 */
export function findHeadingAbove<T extends { index: number }>(headings: readonly T[], index: number): T | undefined {
  let low = 0
  let high = headings.length

  while (low < high) {
    const middle = Math.floor((low + high) / 2)

    if ((headings[middle]?.index ?? index) < index) {
      low = middle + 1
    } else {
      high = middle
    }
  }

  return headings[low - 1]
}

/** The headings of the text from top to bottom, as `readHeading` reads them. */
export function findHeadings(text: string, maxLevel = 6): PlacedHeading[] {
  return Array.from(text.matchAll(equalsLine)).flatMap(({ 0: line, index }) => {
    const heading = readHeading(line, maxLevel)

    return heading === undefined ? [] : [{ ...heading, end: index + line.length, index }]
  })
}

/**
 * Where the first line starts that opens a heading of level 2 to `maxLevel`, closed or not, or
 * undefined. It marks where a section ends. The pattern is linear: the number of signs has a
 * limit.
 */
export function findHeadingStart(text: string, maxLevel = 6): number | undefined {
  return new RegExp(`^={2,${maxLevel}}[^=\\n]`, 'mu').exec(text)?.index
}

/** The headings of the text from top to bottom, as `readLooseHeading` reads them. */
export function findLooseHeadings(text: string): (LooseHeading & { end: number; index: number })[] {
  return Array.from(text.matchAll(equalsLine)).flatMap(({ 0: line, index }) => {
    const heading = readLooseHeading(line)

    return heading === undefined ? [] : [{ ...heading, end: index + line.length, index }]
  })
}

/** The headings of level 2 (`== Title ==`) of the text, none with a longer run of signs. */
export function findSectionHeadings(text: string): PlacedHeading[] {
  return findHeadings(text).filter(({ level, opening }) => level === 2 && opening === 2)
}

/**
 * The line as a heading of level 2 to `maxLevel`, or undefined. The level is the smaller of the
 * two runs of equals signs, and it leaves at least one character between them: the rest of a
 * longer run is part of the title. Spaces and tabs may follow the heading.
 */
export function readHeading(line: string, maxLevel = 6): Heading | undefined {
  const parts = partsOf(line)

  if (parts === undefined) {
    return undefined
  }

  const { closing, opening, text } = parts
  const level = Math.min(opening, closing, maxLevel, Math.floor((text.length - 1) / 2))

  return level < 2 ? undefined : { level, opening, title: trimBlanks(text.slice(level, -level)) }
}

/**
 * The line as a heading with any number of equals signs at each end, one included, or
 * undefined. A line of equals signs only is not one.
 */
export function readLooseHeading(line: string): LooseHeading | undefined {
  const parts = partsOf(line)

  if (parts === undefined) {
    return undefined
  }

  const { closing, opening, text } = parts

  return opening === 0 || closing === 0 || opening === text.length
    ? undefined
    : { opening, title: trimBlanks(text.slice(opening, -closing)) }
}

function isBlank(character: string | undefined): boolean {
  return character === ' ' || character === '\t'
}

/** The line without the blanks after it, with the equals signs counted at each end. */
function partsOf(line: string): undefined | { closing: number; opening: number; text: string } {
  if (lineBreak.test(line)) {
    return undefined
  }

  let length = line.length

  while (isBlank(line[length - 1])) {
    length--
  }

  const text = line.slice(0, length)
  let opening = 0
  let closing = 0

  while (text[opening] === '=') {
    opening++
  }
  while (text[text.length - 1 - closing] === '=') {
    closing++
  }

  return { closing, opening, text }
}

/** The text without spaces and tabs at both ends. `trim` would take other spaces too. */
function trimBlanks(text: string): string {
  let start = 0
  let end = text.length

  while (start < end && isBlank(text[start])) {
    start++
  }
  while (end > start && isBlank(text[end - 1])) {
    end--
  }

  return text.slice(start, end)
}
