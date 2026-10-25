import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import path from 'node:path'
import tls from 'node:tls'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { MailError, sendMail } from './mail'

const USER = 'redactie@example.org'
const PASSWORD = 'zeer-geheim-wachtwoord'

type FakeServerOptions = {
  /** The reply to RCPT TO, such as a refusal. */
  recipientReply?: string
  /** Whether the server offers STARTTLS. */
  startTls?: boolean
}

type Received = { data: string; from: string; secure: boolean; to: string[]; user: string | undefined }

let folder: string
let key: string
let certificate: string
const defaultCertificates = tls.getCACertificates('default')
const servers: net.Server[] = []

beforeAll(() => {
  // A certificate for 127.0.0.1 that only this test trusts, made here so no private key sits in
  // the repository.
  folder = mkdtempSync(path.join(tmpdir(), 'fansite-mail-'))
  execFileSync(
    'openssl',
    [
      ...['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=127.0.0.1'],
      ...['-addext', 'subjectAltName=IP:127.0.0.1', '-keyout', 'key.pem', '-out', 'cert.pem'],
    ],
    { cwd: folder, stdio: 'ignore' },
  )
  key = readFileSync(path.join(folder, 'key.pem'), 'utf8')
  certificate = readFileSync(path.join(folder, 'cert.pem'), 'utf8')
  tls.setDefaultCACertificates([...defaultCertificates, certificate])
})

afterAll(() => {
  tls.setDefaultCACertificates(defaultCertificates)
  rmSync(folder, { force: true, recursive: true })
})

afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(servers.splice(0).map((server) => new Promise((done) => server.close(done))))
})

/** The text of a mail body, as the server received it. */
function bodyOf(data: string) {
  const [head = '', ...rest] = data.split('\r\n\r\n')
  const body = rest.join('\r\n\r\n')

  if (/content-transfer-encoding: base64/i.test(head)) {
    return Buffer.from(body, 'base64').toString('utf8')
  }

  if (/content-transfer-encoding: quoted-printable/i.test(head)) {
    const unwrapped = body.replaceAll('=\r\n', '')
    const bytes = Buffer.from(
      unwrapped.replaceAll(/=([0-9A-F]{2})/g, (_, hex: string) => String.fromCharCode(Number.parseInt(hex, 16))),
      'latin1',
    )

    return bytes.toString('utf8')
  }

  return body
}

/** The header lines of a mail, unfolded. */
function headerOf(data: string, name: string) {
  const head = data.split('\r\n\r\n')[0] ?? ''

  return new RegExp(`^${name}: (.*(?:\\r\\n[ \\t].*)*)$`, 'im').exec(head)?.[1]?.replaceAll(/\r\n[ \t]+/g, ' ')
}

/**
 * A mail server on this computer that keeps what it is sent, so no real mail leaves the test.
 * It speaks just enough SMTP for sendMail: STARTTLS, AUTH PLAIN and one mail per connection.
 */
async function startFakeServer({ recipientReply = '250 OK', startTls = true }: FakeServerOptions = {}) {
  const received: Received[] = []

  const server = net.createServer((plain) => {
    let stream: net.Socket = plain
    let buffer = ''
    let secure = false
    let inData = false
    let current: Received = { data: '', from: '', secure: false, to: [], user: undefined }

    const reply = (line: string) => stream.write(`${line}\r\n`)

    const command = (line: string) => {
      const verb = line.split(' ')[0]?.toUpperCase()

      if (verb === 'EHLO' || verb === 'HELO') {
        stream.write(
          [
            '250-localhost',
            ...(startTls && !secure ? ['250-STARTTLS'] : []),
            ...(secure ? ['250-AUTH PLAIN'] : []),
            '250 8BITMIME',
          ].join('\r\n') + '\r\n',
        )
      } else if (verb === 'STARTTLS' && !startTls) {
        reply('502 STARTTLS is not supported')
      } else if (verb === 'STARTTLS') {
        reply('220 Ready to start TLS')
        plain.removeListener('data', onData)
        stream = new tls.TLSSocket(plain, { cert: certificate, isServer: true, key })
        stream.on('data', onData)
        secure = true
      } else if (verb === 'AUTH') {
        const [user, password] = Buffer.from(line.split(' ')[2] ?? '', 'base64')
          .toString()
          .split('\0')
          .slice(1)

        if (user === USER && password === PASSWORD) {
          current.user = user
          reply('235 Authentication succeeded')
        } else {
          reply('535 Authentication credentials invalid')
        }
      } else if (verb === 'MAIL') {
        current.from = /<(.*)>/.exec(line)?.[1] ?? ''
        reply('250 OK')
      } else if (verb === 'RCPT') {
        const address = /<(.*)>/.exec(line)?.[1] ?? ''

        if (recipientReply.startsWith('250')) {
          current.to.push(address)
        }

        reply(recipientReply.replace('{address}', address))
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

    const onData = (chunk: Buffer) => {
      buffer += chunk.toString('latin1')

      for (;;) {
        if (inData) {
          const end = buffer.indexOf('\r\n.\r\n')

          if (end === -1) return

          current.data = buffer.slice(0, end).replaceAll('\r\n..', '\r\n.')
          current.secure = secure
          buffer = buffer.slice(end + 5)
          inData = false
          received.push(current)
          current = { data: '', from: '', secure: false, to: [], user: current.user }
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

  servers.push(server)
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))

  const { port } = server.address() as net.AddressInfo

  return {
    env: {
      MAIL_FROM: 'sc Heerenveen Fansite <fansite@example.org>',
      SITE_ENV: 'acceptance',
      SMTP_HOST: '127.0.0.1',
      SMTP_PASSWORD: PASSWORD,
      SMTP_PORT: String(port),
      SMTP_USER: USER,
    },
    received,
  }
}

const mail = {
  from: 'Redactie <redactie@example.org>',
  replyTo: 'Bezoeker <bezoeker@example.net>',
  subject: 'Een vraag over de site',
  text: 'Hallo,\n\nIk heb een vraag.\n',
  to: 'fansite@example.org',
}

describe('sendMail', () => {
  it('sends the mail to the server, over TLS and after logging in', async () => {
    const { env, received } = await startFakeServer()

    await sendMail(mail, env)

    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({
      from: 'redactie@example.org',
      secure: true,
      to: ['fansite@example.org'],
      user: USER,
    })
    expect(headerOf(received[0]!.data, 'From')).toBe('Redactie <redactie@example.org>')
    expect(headerOf(received[0]!.data, 'To')).toBe('fansite@example.org')
    expect(headerOf(received[0]!.data, 'Reply-To')).toBe('Bezoeker <bezoeker@example.net>')
    expect(headerOf(received[0]!.data, 'Subject')).toBe('Een vraag over de site')
    expect(bodyOf(received[0]!.data).trim()).toBe('Hallo,\r\n\r\nIk heb een vraag.')
  })

  it('sends from MAIL_FROM when the mail names no sender, and without a reply-to when it names none', async () => {
    const { env, received } = await startFakeServer()

    await sendMail({ subject: 'Hoi', text: 'Tekst', to: 'fansite@example.org' }, env)

    expect(received[0]?.from).toBe('fansite@example.org')
    expect(headerOf(received[0]!.data, 'From')).toBe('sc Heerenveen Fansite <fansite@example.org>')
    expect(headerOf(received[0]!.data, 'Reply-To')).toBeUndefined()
  })

  it('keeps accents and a long line of text intact', async () => {
    const { env, received } = await startFakeServer()
    const text = `Beste redactie, ${'één lange regel met ë en ï en €, '.repeat(10)}\n\n.Een regel die met een punt begint.\n`

    await sendMail({ ...mail, subject: 'Vraag over Abe Lenstra – “de Fries”', text }, env)

    // The server takes the last line break as part of the end of the message.
    expect(bodyOf(received[0]!.data).replaceAll('\r\n', '\n')).toBe(text.trimEnd())
    expect(headerOf(received[0]!.data, 'Subject')).toMatch(/^=\?UTF-8\?/)
  })

  it.each(['Regel\nBcc: iemand@example.net', 'Regel\r\nBcc: iemand@example.net', 'Regel\rBcc: iemand@example.net'])(
    'refuses a subject with a new line, and sends nothing',
    async (subject) => {
      const { env, received } = await startFakeServer()

      await expect(sendMail({ ...mail, subject }, env)).rejects.toThrow(MailError)
      await expect(sendMail({ ...mail, subject }, env)).rejects.toThrow('The subject of the mail has a new line')
      expect(received).toEqual([])
    },
  )

  it.each(['from', 'to', 'replyTo'] as const)(
    'refuses a new line in the %s address, and sends nothing',
    async (field) => {
      const { env, received } = await startFakeServer()
      const injected = { ...mail, [field]: 'bezoeker@example.net\nBcc: iemand@example.net' }

      await expect(sendMail(injected, env)).rejects.toThrow(MailError)
      await expect(sendMail(injected, env)).rejects.not.toThrow('iemand@example.net')
      expect(received).toEqual([])
    },
  )

  it.each([
    'a@example.net, b@example.net',
    'a@example.net;b@example.net',
    'geen adres',
    '<a@example.net> <b@example.net>',
    'a@example.net\n',
    ' a@example.net',
  ])('refuses %j as the address of the visitor, because it is not exactly one email address', async (replyTo) => {
    const { env, received } = await startFakeServer()

    await expect(sendMail({ ...mail, replyTo }, env)).rejects.toThrow(MailError)
    expect(received).toEqual([])
  })

  it('fails with a MailError that keeps the password, the recipient and the text out of its message', async () => {
    const { env, received } = await startFakeServer()

    const failure = await sendMail(mail, { ...env, SMTP_PASSWORD: 'een-ander-wachtwoord' }).catch(
      (error: unknown) => error,
    )

    expect(failure).toBeInstanceOf(MailError)
    expect(failure).toHaveProperty('code', 'EAUTH')
    expect((failure as MailError).message).toBe('Could not send the mail (EAUTH)')
    expect((failure as MailError).cause).toBeUndefined()
    expect(received).toEqual([])
  })

  it('does not repeat the recipient or the reply of the server when the server refuses the mail', async () => {
    const { env } = await startFakeServer({ recipientReply: '550 5.1.1 <{address}>: Recipient address rejected' })
    const failure = await sendMail({ ...mail, text: 'Een geheim bericht' }, env).catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(MailError)
    expect(failure).toHaveProperty('code', 'EENVELOPE')

    const shown = `${(failure as MailError).message} ${(failure as MailError).stack}`

    expect(shown).not.toContain('fansite@example.org')
    expect(shown).not.toContain('Recipient address rejected')
    expect(shown).not.toContain('geheim')
    expect(shown).not.toContain(PASSWORD)
  })

  it('does not send over a connection it cannot encrypt, so the password never travels in the clear', async () => {
    const { env, received } = await startFakeServer({ startTls: false })

    await expect(sendMail(mail, env)).rejects.toThrow('Could not send the mail (ETLS)')
    expect(received).toEqual([])
  })

  it('fails with a MailError when nothing answers', async () => {
    const { env } = await startFakeServer()
    const { port } = servers[0]!.address() as net.AddressInfo

    await Promise.all(servers.splice(0).map((server) => new Promise((done) => server.close(done))))

    await expect(sendMail(mail, { ...env, SMTP_PORT: String(port) })).rejects.toThrow(
      'Could not send the mail (ESOCKET)',
    )
  })

  it('writes the mail in the log of the developer, and sends nothing, without SMTP settings on local', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await sendMail({ subject: 'Hoi', text: 'De tekst van de mail', to: 'fansite@example.org' }, { SITE_ENV: 'local' })

    expect(log).toHaveBeenCalledOnce()
    expect(log.mock.calls[0]?.[0]).toContain('No mail was sent')
    expect(log.mock.calls[0]?.[0]).toContain('To: fansite@example.org')
    expect(log.mock.calls[0]?.[0]).toContain('Subject: Hoi')
    expect(log.mock.calls[0]?.[0]).toContain('De tekst van de mail')
  })

  it('does not write the mail in the log when it sends it', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
    const { env } = await startFakeServer()

    await sendMail(mail, { ...env, SITE_ENV: 'local' })

    expect(log).not.toHaveBeenCalled()
  })

  it.each(['acceptance', 'production'])('refuses to log the mail instead of sending it on %s', async (siteEnv) => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)

    await expect(sendMail(mail, { SITE_ENV: siteEnv })).rejects.toThrow('SMTP_HOST is missing')
    expect(log).not.toHaveBeenCalled()
  })
})
