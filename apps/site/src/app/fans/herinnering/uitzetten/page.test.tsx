import { makeReminderCode } from '@fansite/shared/reminder-code'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import TurnOffReminderPage, { generateMetadata } from './page'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect: vi.fn(),
}))
vi.mock('./actions', () => ({ turnOffReminder: vi.fn() }))

const secret = 'een-geheim-van-minstens-tweeendertig-tekens'

const render = async (params: Record<string, string> = {}) =>
  renderToStaticMarkup(await TurnOffReminderPage({ searchParams: Promise.resolve(params) }))

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_PROGNOSE', 'on')
  vi.stubEnv('FANS_REMINDER_SECRET', secret)
})

afterEach(() => vi.unstubAllEnvs())

describe('the page of the link in a reminder', () => {
  it('is one column with the heading, one sentence and the button, for a good link', async () => {
    const html = await render({ code: makeReminderCode(7, secret) })

    expect(html.match(/<h1/g)).toHaveLength(1)
    expect(html).toContain('Herinnering uitzetten</h1>')
    expect(html).toContain(
      'Met de knop zet je de herinnering uit: je krijgt dan geen bericht meer de dag voor een wedstrijd.',
    )
    expect(html).toMatch(/<button[^>]*>Herinnering uitzetten<\/button>/)
    expect(html).toMatch(/<input[^>]*type="hidden"[^>]*name="code"|<input[^>]*name="code"[^>]*type="hidden"/)
    expect(html).not.toContain('hf-card')
    expect(html).not.toContain('<nav')
  })

  it('changes nothing by itself: opening the page shows a button and no notice that it is off', async () => {
    expect(await render({ code: makeReminderCode(7, secret) })).not.toContain('De herinnering staat uit.')
  })

  it('says after the button that the reminder is off, with the way to turn it on', async () => {
    const html = await render({ klaar: '1' })

    expect(html).toContain('Herinnering uitgezet</h1>')
    expect(html).toContain('De herinnering staat uit. Je kunt hem aanzetten op')
    expect(html).toContain('href="/fans/mijn-account#herinnering"')
    expect(html).not.toContain('<button')
  })

  it('says that a link that is wrong, expired or missing does not work, and has no button', async () => {
    for (const params of [
      { code: 'rommel' },
      {},
      { code: makeReminderCode(7, 'een-ander-geheim-van-minstens-32-tekens') },
    ]) {
      const html = await render(params)

      expect(html).toContain('Deze link werkt niet meer.')
      expect(html).not.toContain('<button')
    }
  })

  it('is not indexed, does not send the address on, and has a title for each state', async () => {
    expect(await generateMetadata({ searchParams: Promise.resolve({}) })).toMatchObject({
      referrer: 'no-referrer',
      robots: { follow: false, index: false },
      title: 'Herinnering uitzetten',
    })
    expect(await generateMetadata({ searchParams: Promise.resolve({ klaar: '1' }) })).toMatchObject({
      title: 'Herinnering uitgezet',
    })
  })

  it('is "not found" while Prognose is off, or accounts are off', async () => {
    vi.stubEnv('FANS_PROGNOSE', 'off')
    await expect(render({ code: makeReminderCode(7, secret) })).rejects.toThrow('NEXT_NOT_FOUND')

    vi.stubEnv('FANS_PROGNOSE', 'on')
    vi.stubEnv('FANS_ACCOUNTS', 'off')
    await expect(render({ code: makeReminderCode(7, secret) })).rejects.toThrow('NEXT_NOT_FOUND')
  })
})
