// Turns every module specifier in src and e2e that climbs two or more folders (`../../archive`)
// into the prefix `#src/` (`#src/archive`), when it points into src. Only the specifier
// changes: no other names, and an extension stays as it was. A specifier that climbs out of src
// is left alone and printed.
//
// It covers `import` and `export ... from`, dynamic `import()` and the `vi.mock`-like calls of
// Vitest. The prefix is another group for the import order, so run ESLint with `--fix` on the
// changed files afterwards. Run the script again after merging a branch that added such
// specifiers (the lint rule `no-restricted-imports` names the ones that are left):
//
//   node scripts/use-import-prefix.js
//   git diff --name-only -- src e2e | xargs pnpm exec eslint --fix
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const site = path.resolve(import.meta.dirname, '..')
const src = path.join(site, 'src')

const specifier =
  /(\bfrom\s+|\bimport\s*\(\s*|\bimport\s+|\bvi\.(?:doMock|importActual|importMock|mock)\s*\(\s*)'(\.\.\/\.\.\/[^']*)'/g

const sourceFilesOf = (folder) =>
  readdirSync(folder, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name))
    .map((entry) => path.join(entry.parentPath, entry.name))

let files = 0
let specifiers = 0

for (const file of ['src', 'e2e'].flatMap((folder) => sourceFilesOf(path.join(site, folder)))) {
  const before = readFileSync(file, 'utf8')
  const after = before.replace(specifier, (match, head, relative) => {
    const target = path.resolve(path.dirname(file), relative)

    if (target !== src && !target.startsWith(`${src}${path.sep}`)) {
      console.log(`Left alone, it points outside src: ${path.relative(site, file)} ${relative}`)
      return match
    }

    specifiers += 1
    return `${head}'#src/${path.relative(src, target).split(path.sep).join('/')}${relative.endsWith('/') ? '/' : ''}'`
  })

  if (after !== before) {
    files += 1
    writeFileSync(file, after)
  }
}

console.log(`Changed ${specifiers} specifiers in ${files} files.`)
