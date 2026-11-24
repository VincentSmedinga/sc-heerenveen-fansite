import { describe, expect, it } from 'vitest'

import { browserKindOf } from './browser-kind'

const texts = {
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
  androidFirefox: 'Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0',
  androidTabletChrome:
    'Mozilla/5.0 (Linux; Android 13; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  chromeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
  chromeMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  chromeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  edgeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 EdgA/130.0.0.0',
  edgeIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 EdgiOS/130.0.0.0 Mobile/15E148 Safari/605.1.15',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0',
  firefoxIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/132.0 Mobile/15E148 Safari/605.1.15',
  firefoxLinux: 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0',
  ipad: 'Mozilla/5.0 (iPad; CPU OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipadAsMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  opera:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 OPR/115.0.0.0',
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36',
}

describe('browserKindOf', () => {
  it.each([
    [texts.androidChrome, { browser: 'Chrome', device: 'telefoon', os: 'Android' }],
    [texts.androidFirefox, { browser: 'Firefox', device: 'telefoon', os: 'Android' }],
    [texts.androidTabletChrome, { browser: 'Chrome', device: 'tablet', os: 'Android' }],
    [texts.edgeAndroid, { browser: 'Edge', device: 'telefoon', os: 'Android' }],
    [texts.edgeIos, { browser: 'Edge', device: 'telefoon', os: 'iOS' }],
    [texts.edgeWindows, { browser: 'Edge', device: 'computer', os: 'Windows' }],
    [texts.firefoxIos, { browser: 'Firefox', device: 'telefoon', os: 'iOS' }],
    [texts.firefoxLinux, { browser: 'Firefox', device: 'computer', os: 'Linux' }],
    [texts.chromeIos, { browser: 'Chrome', device: 'telefoon', os: 'iOS' }],
    [texts.chromeMac, { browser: 'Chrome', device: 'computer', os: 'macOS' }],
    [texts.chromeWindows, { browser: 'Chrome', device: 'computer', os: 'Windows' }],
    [texts.ipadAsMac, { browser: 'Safari', device: 'computer', os: 'macOS' }],
    [texts.ipad, { browser: 'Safari', device: 'tablet', os: 'iOS' }],
    [texts.opera, { browser: 'overig', device: 'computer', os: 'Windows' }],
    [texts.safariIphone, { browser: 'Safari', device: 'telefoon', os: 'iOS' }],
    [texts.samsung, { browser: 'Samsung Internet', device: 'telefoon', os: 'Android' }],
    ['Lynx/2.9', { browser: 'overig', device: 'computer', os: 'overig' }],
  ])('reads %s', (text, expected) => {
    expect(browserKindOf(text)).toEqual(expected)
  })

  it('gives no version, screen size or model', () => {
    expect(JSON.stringify(browserKindOf(texts.samsung))).not.toMatch(/\d|SM-S928B/u)
  })
})
