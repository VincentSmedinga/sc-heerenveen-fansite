// Tests the parts of `pnpm screenshots` that decide something and need no browser. The browser and the files are tried by
// hand (see the pull request).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { addressOf, fileNameOf, parseArguments, planFiles, ScreenshotsError, slugOf, viewports } from './screenshots.js'

test('takes the address of a local build and the targets', () => {
  assert.deepEqual(parseArguments(['http://localhost:3000/', '/', '/podcasts']), {
    base: 'http://localhost:3000',
    dark: false,
    fullPage: false,
    out: undefined,
    targets: ['/', '/podcasts'],
  })
})

test('reads the options, wherever they are', () => {
  const parsed = parseArguments([
    '--dark',
    'http://127.0.0.1:6006',
    'components-footer--default',
    '--out',
    'plaatjes',
    '--full-page',
  ])

  assert.equal(parsed.dark, true)
  assert.equal(parsed.fullPage, true)
  assert.equal(parsed.out, 'plaatjes')
  assert.deepEqual(parsed.targets, ['components-footer--default'])
})

test('is light unless dark is asked for', () => {
  assert.equal(parseArguments(['http://localhost:3000', '/']).dark, false)
})

test('needs an address and at least one target', () => {
  for (const argv of [[], ['http://localhost:3000']]) {
    assert.throws(() => parseArguments(argv), { exitCode: 2 })
  }
})

test('refuses an option it does not know', () => {
  assert.throws(() => parseArguments(['http://localhost:3000', '/', '--retina']), ScreenshotsError)
})

test('refuses what is not an http address', () => {
  assert.throws(() => parseArguments(['localhost:3000', '/']), /not an http address|not an address/)
  assert.throws(() => parseArguments(['not an address', '/']), /not an address/)
  assert.throws(() => parseArguments(['file:///etc/passwd', '/']), /not an http address/)
})

test('refuses a site that is not on this computer', () => {
  for (const address of ['https://example.org', 'https://scheerenveen.example/', 'http://192.168.1.4:3000']) {
    assert.throws(() => parseArguments([address, '/']), /not on this computer/)
  }

  for (const address of [
    'http://localhost:3000',
    'http://127.0.0.1:3124',
    'http://[::1]:3000',
    'http://fansite.localhost:3000',
  ]) {
    assert.doesNotThrow(() => parseArguments([address, '/']))
  }
})

test('refuses a target that is in the list twice', () => {
  assert.throws(() => parseArguments(['http://localhost:3000', '/', '/podcasts', '/']), /twice/)
})

test('makes the address of a path on the site', () => {
  assert.equal(addressOf('http://localhost:3000', '/'), 'http://localhost:3000/')
  assert.equal(addressOf('http://localhost:3000', '/podcasts?page=2'), 'http://localhost:3000/podcasts?page=2')
})

test('refuses a path that leads to another site', () => {
  assert.throws(() => addressOf('http://localhost:3000', '//example.org/x'), /not a path on/)
  assert.throws(() => parseArguments(['http://localhost:3000', '/', '//example.org/x']), { exitCode: 2 })
})

test('makes the address of a story in Storybook', () => {
  assert.equal(
    addressOf('http://localhost:6006', 'components-footer--default'),
    'http://localhost:6006/iframe.html?id=components-footer--default&viewMode=story',
  )
})

test('turns a target into a name with only letters, digits and hyphens', () => {
  assert.equal(slugOf('/'), 'home')
  assert.equal(slugOf('/podcasts'), 'podcasts')
  assert.equal(slugOf('/podcasts?page=2'), 'podcasts-page-2')
  assert.equal(slugOf('/Over-Ons/'), 'over-ons')
  assert.equal(slugOf('components-footer--default'), 'components-footer-default')
  assert.equal(slugOf('../../etc/passwd'), 'etc-passwd')
})

test('puts the width in the name, and dark only when dark was asked for', () => {
  assert.equal(fileNameOf('/podcasts', 390, false), 'podcasts-390.png')
  assert.equal(fileNameOf('/podcasts', 900, true), 'podcasts-900-dark.png')
})

test('photographs a phone of 390 pixels and a desktop of 900 pixels', () => {
  assert.deepEqual(
    viewports.map(({ width }) => width),
    [390, 900],
  )
})

test('plans a file per target and width, in order', () => {
  assert.deepEqual(
    planFiles(['/', '/podcasts'], false).map(({ file }) => file),
    ['home-390.png', 'home-900.png', 'podcasts-390.png', 'podcasts-900.png'],
  )
})

test('refuses two targets that would be written to one file', () => {
  assert.throws(() => planFiles(['/podcasts', '/podcasts/'], false), /another target/)
})
