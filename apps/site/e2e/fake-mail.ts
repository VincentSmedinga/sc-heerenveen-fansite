import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Where scripts/fake-smtp.js writes the mails the site sends, and the port it listens on (see
 * playwright.config.ts).
 */
export const fakeMailFolder = fileURLToPath(new URL('../.next/fake-smtp', import.meta.url))
export const fakeMailPort = '2525'

/**
 * The mails the site has sent to the fake mail server so far, as the server received them:
 * headers and body. A body that the mail library encoded (quoted-printable or base64) is
 * decoded, so a test can search for the words in it.
 */
export function sentMails() {
  return readdirSync(fakeMailFolder)
    .filter((name) => name.endsWith('.eml'))
    .map((name) => decode(readFileSync(path.join(fakeMailFolder, name), 'latin1')))
}

function decode(mail: string) {
  const [head = '', ...rest] = mail.split('\r\n\r\n')
  const body = rest.join('\r\n\r\n')

  if (/content-transfer-encoding: base64/i.test(head)) {
    return `${head}\r\n\r\n${Buffer.from(body, 'base64').toString('utf8')}`
  }

  if (/content-transfer-encoding: quoted-printable/i.test(head)) {
    const bytes = Buffer.from(
      body
        .replaceAll('=\r\n', '')
        .replaceAll(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))),
      'latin1',
    )

    return `${head}\r\n\r\n${bytes.toString('utf8')}`
  }

  return mail
}
