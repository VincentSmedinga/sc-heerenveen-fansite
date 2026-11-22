import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * The places in a source file where a `<Link>` without an `icon` is the only thing in a
 * `<Text>` at the bottom of a `<Card>`: a card link that forgot its icon, which `CardLink`
 * chooses.
 */
export function bareCardLinks(source: string, fileName = 'file.tsx'): number[] {
  const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const found: number[] = []
  const content = (element: ts.JsxElement) =>
    element.children.filter((child) => !(ts.isJsxText(child) && child.text.trim() === ''))
  const tag = (node: ts.Node) => (ts.isJsxElement(node) ? node.openingElement.tagName.getText(file) : undefined)

  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && tag(node) === 'Card') {
      // The last thing in the card, or the texts inside a condition that is the last thing.
      // A link in a form is a way out of the form (cancel), not a card link.
      const last = content(node).at(-1)
      const texts: ts.JsxElement[] = []
      const collect = (inner: ts.Node) => {
        if (ts.isJsxElement(inner) && tag(inner) === 'Text') {
          texts.push(inner)
        } else if (tag(inner) !== 'Form' && (!ts.isJsxElement(inner) || inner === last)) {
          ts.forEachChild(inner, collect)
        }
      }

      if (last !== undefined) {
        collect(last)
      }

      for (const text of texts) {
        const [only, ...rest] = content(text)

        if (rest.length === 0 && only !== undefined && ts.isJsxElement(only) && tag(only) === 'Link') {
          const hasIcon = only.openingElement.attributes.properties.some(
            (property) => ts.isJsxAttribute(property) && property.name.getText(file) === 'icon',
          )

          if (!hasIcon) {
            found.push(file.getLineAndCharacterOfPosition(only.getStart(file)).line + 1)
          }
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(file)

  return found
}

const sourceFiles = (directory: URL): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)

    if (entry.isDirectory()) {
      return entry.name === 'node_modules' ? [] : sourceFiles(path)
    }

    return /\.tsx$/.test(entry.name) && !/\.(test|stories)\.tsx$/.test(entry.name) ? [fileURLToPath(path)] : []
  })

describe('a link at the bottom of a card', () => {
  it('is found when it is a bare Link', () => {
    const bare = `<Card><Text>x</Text><Text><Link href="/a">Alles</Link></Text></Card>`

    expect(bareCardLinks(bare)).toEqual([1])
  })

  it('is found when a condition holds it', () => {
    const bare = `<Card>{open ? <Text><Link href="/a">Alles</Link></Text> : null}</Card>`

    expect(bareCardLinks(bare)).toEqual([1])
  })

  it('is left alone when it has an icon, is in a sentence, or is not at the bottom', () => {
    expect(bareCardLinks(`<Card><Text><Link href="/a" icon="arrow-left">Terug</Link></Text></Card>`)).toEqual([])
    expect(bareCardLinks(`<Card><Text>Lees <Link href="/a">meer</Link>.</Text></Card>`)).toEqual([])
    expect(bareCardLinks(`<Card><Text><Link href="/a">Alles</Link></Text><Text>x</Text></Card>`)).toEqual([])
    expect(bareCardLinks(`<Card><CardLink href="/a">Alles</CardLink></Card>`)).toEqual([])
  })

  it('is a CardLink everywhere in the site and the design system', () => {
    const roots = [new URL('./', import.meta.url), new URL('../../../packages/design-system/src/', import.meta.url)]
    const bare = roots
      .flatMap(sourceFiles)
      .flatMap((path) => bareCardLinks(readFileSync(path, 'utf8'), path).map((line) => `${path}:${line}`))

    expect(
      bare,
      'A link on a line of its own at the bottom of a card is a CardLink (it chooses its icon), not a Link without an icon.',
    ).toEqual([])
  })
})
