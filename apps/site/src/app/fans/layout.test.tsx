import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

import FansLayout from './layout'

const { currentSupporter } = vi.hoisted(() => ({
  currentSupporter: vi.fn((): Promise<undefined | { screenName: string }> => Promise.resolve(undefined)),
}))

vi.mock('#src/fans/require-supporter', () => ({ currentSupporter }))
vi.mock('#src/SupporterMarker', () => ({
  SupporterMarker: ({ screenName }: { screenName?: string }) => <i data-name={screenName ?? 'none'} />,
}))

afterEach(() => {
  vi.unstubAllEnvs()
  currentSupporter.mockReset()
  currentSupporter.mockResolvedValue(undefined)
})

const render = async () => renderToStaticMarkup(await FansLayout({ children: <main>Inhoud</main> }))

describe('the layout of /fans', () => {
  it('hands the screen name of the session to the mark, and adds no element around the page', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    currentSupporter.mockResolvedValue({ screenName: 'Tjalle99' })

    expect(await render()).toBe('<i data-name="Tjalle99"></i><main>Inhoud</main>')
  })

  it('hands it nothing without a session, so the mark goes', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')

    expect(await render()).toBe('<i data-name="none"></i><main>Inhoud</main>')
  })

  it('does not read the session with accounts off', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    expect(await render()).toContain('Inhoud')
    expect(currentSupporter).not.toHaveBeenCalled()
  })
})
