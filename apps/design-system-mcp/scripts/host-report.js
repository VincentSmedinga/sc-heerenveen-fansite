// Removes what a public log must not show from the report of host-report.sh: the account name.
// The workflow log is public, so the report goes through this before it is printed.
//
//   sh -s -- <app> <document root> < host-report.sh | node scripts/host-report.js
//
// Every `/home/<name>` becomes `/home/…`.
// With the account name in HOST_REPORT_USER, that name goes too, wherever it stands,
// such as in a line of stderr.log.
import { fileURLToPath } from 'node:url'

const ellipsis = '…'

/** Returns `text` without the account name. */
export function redact(text, user = '') {
  const withoutHome = text.replace(/\/home\/[^/\s]+/g, `/home/${ellipsis}`)

  if (user === '') {
    return withoutHome
  }

  return withoutHome.split(user).join(ellipsis)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const chunks = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }

  process.stdout.write(redact(Buffer.concat(chunks).toString('utf8'), process.env['HOST_REPORT_USER'] ?? ''))
}
