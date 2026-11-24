import type { BrowserKind, DeviceKind, SystemKind } from '@fansite/db/schema'

/** What the counter keeps of a browser text: three values from a short list, no version. */
export type BrowserFamily = { browser: BrowserKind; device: DeviceKind; os: SystemKind }

/**
 * Reads the kind of browser, system and device from the browser text, and nothing else. Chrome
 * and Firefox on iOS (`CriOS`, `FxiOS`) are their own brand, and so is Edge (`Edg/`, `EdgA`,
 * `EdgiOS`). An iPad that says it is a Mac is a `macOS` computer.
 */
export function browserKindOf(userAgent: string): BrowserFamily {
  return { browser: browserOf(userAgent), device: deviceOf(userAgent), os: systemOf(userAgent) }
}

function browserOf(userAgent: string): BrowserKind {
  if (/\bEdg(?:e|A|iOS)?\//u.test(userAgent)) {
    return 'Edge'
  }

  if (/SamsungBrowser\//u.test(userAgent)) {
    return 'Samsung Internet'
  }

  // Opera, Vivaldi's neighbours and other browsers that say they are Chrome are `overig`.
  if (/\b(?:OPR|Opera|OPT|Vivaldi|YaBrowser|DuckDuckGo)\b/u.test(userAgent)) {
    return 'overig'
  }

  if (/\b(?:Firefox|FxiOS)\//u.test(userAgent)) {
    return 'Firefox'
  }

  if (/\b(?:Chrome|CriOS|Chromium)\//u.test(userAgent)) {
    return 'Chrome'
  }

  return /\bVersion\/[\d.]+.*\bSafari\//u.test(userAgent) ? 'Safari' : 'overig'
}

function deviceOf(userAgent: string): DeviceKind {
  if (/\biPad\b|\bTablet\b/u.test(userAgent)) {
    return 'tablet'
  }

  if (/\b(?:iPhone|iPod)\b/u.test(userAgent)) {
    return 'telefoon'
  }

  // An Android phone says `Mobile`, an Android tablet doesn't.
  if (/\bAndroid\b/u.test(userAgent)) {
    return /\bMobile\b/u.test(userAgent) ? 'telefoon' : 'tablet'
  }

  return 'computer'
}

function systemOf(userAgent: string): SystemKind {
  if (/\b(?:iPhone|iPad|iPod)\b/u.test(userAgent)) {
    return 'iOS'
  }

  if (/\bAndroid\b/u.test(userAgent)) {
    return 'Android'
  }

  if (/\bWindows\b/u.test(userAgent)) {
    return 'Windows'
  }

  if (/\b(?:Macintosh|Mac OS X)\b/u.test(userAgent)) {
    return 'macOS'
  }

  return /\bCrOS\b/u.test(userAgent) || !/\b(?:Linux|X11)\b/u.test(userAgent) ? 'overig' : 'Linux'
}
