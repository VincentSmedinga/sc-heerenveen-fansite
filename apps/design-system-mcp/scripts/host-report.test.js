import { execFileSync, spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import { redact } from './host-report.js'

const script = path.resolve(import.meta.dirname, 'host-report.sh')
const workflow = readFileSync(path.resolve(import.meta.dirname, '../../../.github/workflows/storybook.yml'), 'utf8')
// The script needs GNU stat, as on the host and on the runner.
const gnuStat = spawnSync('stat', ['--version']).status === 0

describe('the redaction of the report from the host', () => {
  it('turns the home folder of the account into /home/…', () => {
    expect(redact('Error: ENOENT /home/jan/domains/ds.heerenveen.org/public_html/manifests/docs.json')).toBe(
      'Error: ENOENT /home/…/domains/ds.heerenveen.org/public_html/manifests/docs.json',
    )
  })

  it('removes the account name wherever it stands', () => {
    const redacted = redact('-rw-r--r-- 1 jan jan 120 server.mjs\nuser jan at /home/jan/x', 'jan')

    expect(redacted).not.toContain('jan')
    expect(redacted).toContain('/home/…/x')
  })

  it('leaves text without the account name as it is', () => {
    expect(redact('server.mjs: there')).toBe('server.mjs: there')
  })
})

describe.skipIf(!gnuStat)('the report of the host', () => {
  const folders = []

  function makeHost() {
    const root = mkdtempSync(path.join(os.tmpdir(), 'host-report-'))
    const app = path.join(root, 'domains/ds.heerenveen.org/mcp')
    const docroot = path.join(root, 'domains/ds.heerenveen.org/public_html')

    folders.push(root)
    mkdirSync(path.join(app, 'tmp'), { recursive: true })
    mkdirSync(docroot, { recursive: true })

    return { app, docroot, root }
  }

  function run({ app, docroot }) {
    return execFileSync('sh', [script, app, docroot], { encoding: 'utf8' })
  }

  // The account name is a made-up one: the name of whoever runs the test can be a word of the
  // report, such as root.
  function report(host) {
    return redact(run(host), 'jan')
  }

  afterEach(() => {
    for (const folder of folders.splice(0)) {
      rmSync(folder, { force: true, recursive: true })
    }
  })

  it('lists the files of the app with the hidden ones and tmp/, and says whether the two files that matter are there', () => {
    const host = makeHost()

    writeFileSync(path.join(host.app, 'server.mjs'), 'x'.repeat(1234))
    writeFileSync(path.join(host.app, '.htaccess'), '')
    writeFileSync(path.join(host.app, 'tmp/restart.txt'), '')
    utimesSync(path.join(host.app, 'server.mjs'), new Date('2026-10-30T12:00:00Z'), new Date('2026-10-30T12:00:00Z'))

    const text = report(host)

    expect(text).toMatch(/1234 bytes\s+2026-10-30 \S+ \S+\s+regular file\s+\.\/server\.mjs/)
    expect(text).toContain('./.htaccess')
    expect(text).toContain('./tmp/restart.txt')
    expect(text).toContain('server.mjs: there')
    expect(text).toContain('tmp/restart.txt: there')
  })

  it('says what is missing', () => {
    const host = makeHost()
    const text = report(host)

    expect(text).toContain('server.mjs: missing')
    expect(text).toContain('tmp/restart.txt: missing')
    expect(text).toContain('There is no .htaccess in the document root')
    expect(text).toContain('There is no stderr.log')
    expect(report({ app: path.join(host.root, 'nope'), docroot: host.docroot })).toContain(
      'The folder of the app is not there',
    )
  })

  it('shows only the three Passenger lines of the .htaccess', () => {
    const host = makeHost()

    writeFileSync(
      path.join(host.docroot, '.htaccess'),
      [
        'SetEnv SECRET_TOKEN abc123',
        '# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION BEGIN',
        'PassengerAppRoot "/home/jan/domains/ds.heerenveen.org/mcp"',
        'PassengerBaseURI "/mcp"',
        'PassengerAppType node',
        'PassengerStartupFile server.mjs',
        'SetEnv NODE_ENV production',
        '# DO NOT REMOVE. CLOUDLINUX PASSENGER CONFIGURATION END',
        'RewriteRule ^private$ /secret [L]',
      ].join('\n'),
    )

    const text = report(host)

    expect(text).toContain('The block of CloudLinux Passenger is there')
    expect(text).toContain('PassengerBaseURI "/mcp"')
    expect(text).toContain('PassengerAppType node')
    expect(text).toContain('PassengerStartupFile server.mjs')
    expect(text).not.toContain('PassengerAppRoot')
    expect(text).not.toContain('SECRET_TOKEN')
    expect(text).not.toContain('NODE_ENV')
    expect(text).not.toContain('RewriteRule')
  })

  it('says when the block of Passenger is missing', () => {
    const host = makeHost()

    writeFileSync(path.join(host.docroot, '.htaccess'), 'SetEnv SECRET_TOKEN abc123\n')

    const text = report(host)

    expect(text).toContain('The block of CloudLinux Passenger is missing')
    expect(text).not.toContain('SECRET_TOKEN')
  })

  it('shows the last 20 lines of stderr.log, without the account name', () => {
    const host = makeHost()
    const lines = Array.from({ length: 25 }, (_, index) => `line ${index + 1} /home/jan/domains/x`)

    writeFileSync(path.join(host.app, 'stderr.log'), lines.join('\n') + '\n')

    const text = report(host)

    expect(text).not.toContain('line 5 ')
    expect(text).toContain('line 6 /home/…/domains/x')
    expect(text).toContain('line 25 /home/…/domains/x')
    expect(text).not.toContain('/home/jan')
  })

  it('says when stderr.log is empty', () => {
    const host = makeHost()

    writeFileSync(path.join(host.app, 'stderr.log'), '')

    expect(report(host)).toContain('stderr.log is empty')
  })

  it('shows no owner, no group, and no absolute path of the host', () => {
    const host = makeHost()

    writeFileSync(path.join(host.app, 'server.mjs'), 'x')
    writeFileSync(path.join(host.app, 'stderr.log'), 'started\n')
    writeFileSync(path.join(host.docroot, '.htaccess'), 'PassengerBaseURI "/mcp"\n')

    const text = run(host)
    const files = text.split('\n').filter((line) => /^\d+ bytes/.test(line))
    const owner = os.userInfo().username
    const group = execFileSync('id', ['-gn'], { encoding: 'utf8' }).trim()

    expect(files.length).toBeGreaterThan(2)

    for (const line of files) {
      expect(line).toMatch(/^\d+ bytes {2}\S+ \S+ \S+ {2}[a-z ]+ {2}\.\/\S+$/)
      expect(line.split(/\s+/)).not.toContain(owner)
      expect(line.split(/\s+/)).not.toContain(group)
    }

    expect(text).not.toContain(host.root)
    expect(text).not.toMatch(/^[-d][rwx-]{9}/m)
  })

  it('only reads', () => {
    const code = readFileSync(script, 'utf8')
      .split('\n')
      .filter((line) => !line.trimStart().startsWith('#') && !/^\s*echo /.test(line))
      .join('\n')

    expect(code).not.toMatch(/\b(rm|mv|cp|touch|mkdir|rmdir|chmod|chown|ln|tee|dd|rsync|kill|sed|env|printenv|cat)\b/)
    expect(code).not.toMatch(/[^2]>\s*[^&]/)
  })
})

describe('the step in the workflow', () => {
  const step = workflow.split('\n      - ').find((block) => block.startsWith('name: Show what is on the host'))

  it('exists, after the check of /mcp', () => {
    expect(step).toBeDefined()
    expect(workflow.indexOf('name: Show what is on the host')).toBeGreaterThan(
      workflow.indexOf('name: Check ds.heerenveen.org/mcp'),
    )
  })

  it('runs only when the check of /mcp failed and the secrets are there', () => {
    const check = workflow.split('\n      - ').find((block) => block.includes('name: Check ds.heerenveen.org/mcp'))

    expect(check).toMatch(/\bid: mcp-check\b/)
    expect(step).toContain(
      "if: failure() && steps.secrets.outputs.ready == 'true' && steps.mcp-check.outcome == 'failure'",
    )
  })

  it('does not decide whether the run is red or green', () => {
    expect(step).toContain('continue-on-error: true')
  })

  it('sends the script and the two checked paths, and redacts the answer', () => {
    expect(step).toContain('host-report.sh')
    expect(step).toContain('host-report.js')
    expect(step).toContain('HOST_REPORT_USER: ${{ secrets.SSH_USER }}')
    expect(step).toMatch(/grep -Eq '\^\/\[A-Za-z0-9\._\/-\]\+\/domains\/ds\\\.heerenveen\\\.org\/mcp\$'/)
  })
})
