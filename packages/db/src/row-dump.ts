import { chmodSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

// For the tests of the backup and the export: a `mysqldump` of our own that really prints the
// rows of the tables it is asked for, so a test can search the text of a dump for an address.
// The other tests use a program that only keeps its arguments. It reads the database from
// `ROW_DUMP_URL`, never from the option file, and prints one line per row: not SQL to load, but
// enough to show what a dump would hold.

/** Writes the program into `folder` and returns its path. */
export function writeRowDump(folder: string) {
  const file = path.join(folder, 'row-dump.cjs')
  const mysql = createRequire(import.meta.url).resolve('mysql2/promise')

  writeFileSync(
    file,
    `#!/usr/bin/env node
const { createConnection } = require(${JSON.stringify(mysql)})
const args = process.argv.slice(2)
const noData = args.includes('--no-data')
const ignored = args.filter((arg) => arg.startsWith('--ignore-table=')).map((arg) => arg.split('.').pop())
const [, ...named] = args.filter((arg) => !arg.startsWith('--'))

async function main() {
  const connection = await createConnection({ dateStrings: true, uri: process.env.ROW_DUMP_URL })
  const [all] = await connection.query('SHOW TABLES')
  const tables = named.length > 0 ? named : all.map((row) => Object.values(row)[0]).filter((name) => !ignored.includes(name))

  for (const table of tables) {
    console.log('CREATE TABLE \`' + table + '\`;')

    if (!noData) {
      const [rows] = await connection.query('SELECT * FROM ??', [table])

      for (const row of rows) {
        console.log('INSERT INTO \`' + table + '\` VALUES ' + JSON.stringify(row) + ';')
      }
    }
  }

  console.log('-- Dump completed on today')
  await connection.end()
}

main().catch((error) => {
  console.error(error.message)
  process.exit(2)
})
`,
  )
  chmodSync(file, 0o755)

  return file
}
