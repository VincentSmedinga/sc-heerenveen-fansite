// A mail server for the browser tests (e2e/contact.spec.ts): it takes any mail over STARTTLS and writes each one to a file
// in the folder, so a test, which runs in another process than the site, can read what the site sent. Nothing leaves this
// computer. It makes a certificate of its own for 127.0.0.1 in that folder, which the site trusts through
// NODE_EXTRA_CA_CERTS (see playwright.config.ts).
//
//   node scripts/fake-smtp.js <folder> <port>
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import tls from 'node:tls'

const [folder, port] = process.argv.slice(2)

if (folder === undefined || port === undefined) {
  console.error('Usage: node scripts/fake-smtp.js <folder> <port>')
  process.exit(2)
}

rmSync(folder, { force: true, recursive: true })
mkdirSync(folder, { recursive: true })
execFileSync(
  'openssl',
  [
    ...['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=127.0.0.1'],
    ...['-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', 'key.pem', '-out', 'cert.pem'],
  ],
  { cwd: folder, stdio: 'ignore' },
)

const key = readFileSync(path.join(folder, 'key.pem'))
const cert = readFileSync(path.join(folder, 'cert.pem'))
let count = 0

const server = net.createServer((plain) => {
  let stream = plain
  let buffer = ''
  let secure = false
  let inData = false

  const reply = (line) => stream.write(`${line}\r\n`)

  const command = (line) => {
    const verb = line.split(' ')[0]?.toUpperCase()

    if (verb === 'EHLO' || verb === 'HELO') {
      stream.write(`${['250-localhost', secure ? '250-AUTH PLAIN' : '250-STARTTLS', '250 8BITMIME'].join('\r\n')}\r\n`)
    } else if (verb === 'STARTTLS') {
      reply('220 Ready to start TLS')
      plain.removeListener('data', onData)
      stream = new tls.TLSSocket(plain, { cert, isServer: true, key })
      stream.on('data', onData)
      stream.on('error', () => undefined)
      secure = true
    } else if (verb === 'AUTH') {
      reply('235 Authentication succeeded')
    } else if (verb === 'DATA') {
      inData = true
      reply('354 End data with <CR><LF>.<CR><LF>')
    } else if (verb === 'QUIT') {
      reply('221 Bye')
      stream.end()
    } else {
      reply('250 OK')
    }
  }

  const onData = (chunk) => {
    buffer += chunk.toString('latin1')

    for (;;) {
      if (inData) {
        const end = buffer.indexOf('\r\n.\r\n')

        if (end === -1) return

        count += 1
        writeFileSync(
          path.join(folder, `mail-${count}.eml`),
          buffer.slice(0, end).replaceAll('\r\n..', '\r\n.'),
          'latin1',
        )
        buffer = buffer.slice(end + 5)
        inData = false
        reply('250 OK queued')
      } else {
        const end = buffer.indexOf('\r\n')

        if (end === -1) return

        const line = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        command(line)
      }
    }
  }

  plain.on('error', () => undefined)
  plain.on('data', onData)
  reply('220 localhost ESMTP')
})

server.listen(Number(port), '127.0.0.1')
