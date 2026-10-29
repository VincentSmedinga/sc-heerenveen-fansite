import { afterEach, describe, expect, it, vi } from 'vitest'

import { deliverImage, imageButtonName, imageDay, imageFileName } from './shareImage'

const blob = new Blob(['png'], { type: 'image/png' })
const names = { fileName: 'sc-heerenveen-stand-2026-10-28.png', title: 'Stand' }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('imageFileName', () => {
  it('names the file after the club, the card and the day', () => {
    expect(imageFileName('Stand', new Date('2026-10-28T12:00:00Z'))).toBe('sc-heerenveen-stand-2026-10-28.png')
  })

  it('writes the title in small letters with hyphens, without accents or marks', () => {
    expect(imageFileName('Doelpunten per kwartier', new Date('2026-10-28T12:00:00Z'))).toBe(
      'sc-heerenveen-doelpunten-per-kwartier-2026-10-28.png',
    )
    expect(imageFileName('  De nul gehouden! ', new Date('2026-10-28T12:00:00Z'))).toBe(
      'sc-heerenveen-de-nul-gehouden-2026-10-28.png',
    )
    expect(imageFileName('Één plek: ë', new Date('2026-10-28T12:00:00Z'))).toBe(
      'sc-heerenveen-een-plek-e-2026-10-28.png',
    )
  })

  it('leaves the title out when nothing of it is left, so the name is still a name', () => {
    expect(imageFileName('!!!', new Date('2026-10-28T12:00:00Z'))).toBe('sc-heerenveen-2026-10-28.png')
  })

  it('takes the day in Dutch time, so a match near midnight is on the day the visitor sees', () => {
    // 23:30 UTC on 28 October is 00:30 on 29 October in Amsterdam (UTC+1 after the clocks).
    expect(imageFileName('Stand', new Date('2026-10-28T23:30:00Z'))).toBe('sc-heerenveen-stand-2026-10-29.png')
  })
})

describe('imageDay', () => {
  it('writes the day with the short month and the year in four digits', () => {
    expect(imageDay(new Date('2026-10-28T12:00:00Z'))).toBe('28 okt 2026')
    expect(imageDay(new Date('2027-01-03T12:00:00Z'))).toBe('3 jan 2027')
  })

  it('writes the Dutch day, not the UTC day', () => {
    expect(imageDay(new Date('2026-12-31T23:30:00Z'))).toBe('1 jan 2027')
  })
})

describe('imageButtonName', () => {
  it('says what the button does and for which card', () => {
    expect(imageButtonName('Stand')).toBe('Maak een afbeelding van Stand')
  })
})

describe('deliverImage', () => {
  const stubShare = (share: () => Promise<void>, canShare = true) => {
    const shareSpy = vi.fn(share)

    vi.stubGlobal('navigator', { canShare: () => canShare, share: shareSpy })

    return shareSpy
  }

  const stubDownload = () => {
    URL.createObjectURL = vi.fn(() => 'blob:test')
    URL.revokeObjectURL = vi.fn()

    return vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  }

  it('opens the share sheet with the file and the name of the card where files can be shared', async () => {
    const share = stubShare(() => Promise.resolve())
    const click = stubDownload()

    expect(await deliverImage(blob, names)).toBe('shared')
    expect(share).toHaveBeenCalledOnce()

    const [data] = share.mock.calls[0] as unknown as [{ files: File[]; title: string }]

    expect(data.title).toBe('Stand')
    expect(data.files).toHaveLength(1)
    expect(data.files[0]?.name).toBe('sc-heerenveen-stand-2026-10-28.png')
    expect(data.files[0]?.type).toBe('image/png')
    expect(click).not.toHaveBeenCalled()
  })

  it('downloads the file where the browser cannot share files', async () => {
    const share = stubShare(() => Promise.resolve(), false)
    const click = stubDownload()
    let downloaded: string | undefined

    click.mockImplementation(function (this: HTMLAnchorElement) {
      downloaded = this.download
    })

    expect(await deliverImage(blob, names)).toBe('downloaded')
    expect(downloaded).toBe('sc-heerenveen-stand-2026-10-28.png')
    expect(share).not.toHaveBeenCalled()
  })

  it('downloads the file in a browser that has no way to ask whether it can share', async () => {
    vi.stubGlobal('navigator', {})
    const click = stubDownload()

    expect(await deliverImage(blob, names)).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })

  it('treats a closed share sheet as cancelled, which is no error, and downloads nothing', async () => {
    stubShare(() => Promise.reject(new DOMException('Cancelled', 'AbortError')))
    const click = stubDownload()

    expect(await deliverImage(blob, names)).toBe('cancelled')
    expect(click).not.toHaveBeenCalled()
  })

  it('downloads the file when the browser wants a fresh tap for the share sheet', async () => {
    stubShare(() => Promise.reject(new DOMException('Needs a tap', 'NotAllowedError')))
    const click = stubDownload()

    expect(await deliverImage(blob, names)).toBe('downloaded')
    expect(click).toHaveBeenCalledOnce()
  })

  it('passes on any other failure of the share sheet', async () => {
    stubShare(() => Promise.reject(new DOMException('Broken', 'DataError')))
    stubDownload()

    await expect(deliverImage(blob, names)).rejects.toThrow('Broken')
  })
})
