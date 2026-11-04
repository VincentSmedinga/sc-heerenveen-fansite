// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Suspense, use, useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SwitchLinks } from './SwitchLinks'

const { push } = vi.hoisted(() => ({ push: vi.fn<(href: string, options: { scroll: boolean }) => void>() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

const options = [
  { href: '/wedstrijden?stand=heel#stand', label: 'Hele seizoen', value: 'season' },
  { href: '/wedstrijden?stand=laatste-5#stand', label: 'Laatste 5', value: 'last-five' },
] as const

const group = () => screen.getByRole('group', { name: 'Welke stand' })
const link = (name: string) => screen.getByRole('link', { name })
const status = () => screen.getByRole('status')

/**
 * A page with the switch, and a router that answers when the test says so. The push changes the
 * value of the page in a state that waits for `release`, as the router does until the server
 * has answered; `fail` makes it answer without a new value.
 */
let release: () => void = () => undefined
let fail = false
const history = { back: () => undefined as void }

/**
 * Clicks and tells whether the switch took the click over (true) or left it to the link
 * (false). jsdom can't follow a link, so the click is stopped at the document.
 */
function click(element: Element, init?: MouseEventInit) {
  let handled = false
  const stop = (event: Event) => {
    handled = event.defaultPrevented
    event.preventDefault()
  }

  document.addEventListener('click', stop)
  fireEvent.click(element, init)
  document.removeEventListener('click', stop)

  return handled
}

/** Holds the page back until the gate opens, like a page that waits for the server. */
function Gate({ gate }: { gate: Promise<void> | undefined }) {
  if (gate !== undefined) {
    use(gate)
  }

  return null
}

function Page() {
  const [state, setState] = useState<{ gate?: Promise<void>; value: string }>({ value: 'season' })

  useEffect(() => {
    history.back = () => {
      setState({ value: 'season' })
    }
  }, [])
  push.mockImplementation((href) => {
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const next = fail ? state.value : (options.find((option) => option.href === href)?.value ?? state.value)

    setState({ gate, value: next })
  })

  return (
    <Suspense>
      <Gate gate={state.gate} />
      <SwitchLinks label="Welke stand" options={options} value={state.value} />
    </Suspense>
  )
}

/** The switch as the page renders it, for the value the page has now. */
const switchOf = (value: string) => <SwitchLinks label="Welke stand" options={options} value={value} />

beforeEach(() => {
  push.mockReset()
  fail = false
})

afterEach(() => {
  // Vitest has no globals here, so Testing Library doesn't clean up by itself.
  cleanup()
})

describe('SwitchLinks', () => {
  it('is the links of SegmentedLinks, with an empty line for a screen reader that is there before a click', () => {
    render(switchOf('season'))

    expect(link('Hele seizoen').getAttribute('href')).toBe(options[0].href)
    expect(link('Hele seizoen').getAttribute('aria-current')).toBe('page')
    expect(group().hasAttribute('aria-busy')).toBe(false)
    expect(status().textContent).toBe('')
  })

  it('moves the choice at once and goes to the page with the router, without scrolling', () => {
    render(<Page />)

    expect(click(link('Laatste 5'))).toBe(true)

    expect(push).toHaveBeenCalledExactlyOnceWith(options[1].href, { scroll: false })
    expect(link('Laatste 5').getAttribute('aria-current')).toBe('page')
    expect(link('Hele seizoen').hasAttribute('aria-current')).toBe(false)
  })

  it('moves the focus to the link that was clicked', () => {
    render(switchOf('season'))
    fireEvent.click(link('Laatste 5'))

    expect(document.activeElement).toBe(link('Laatste 5'))
  })

  it('does nothing for a click on the choice that is already made', () => {
    render(switchOf('season'))

    expect(click(link('Hele seizoen'))).toBe(true)
    expect(push).not.toHaveBeenCalled()
  })

  it.each([
    ['Ctrl', { ctrlKey: true }],
    ['Cmd', { metaKey: true }],
    ['Shift', { shiftKey: true }],
    ['Alt', { altKey: true }],
    ['the middle button', { button: 1 }],
    ['the right button', { button: 2 }],
  ])('leaves a click with %s to the link', (_name, init) => {
    render(switchOf('season'))

    expect(click(link('Laatste 5'), init)).toBe(false)
    expect(push).not.toHaveBeenCalled()
    expect(link('Hele seizoen').getAttribute('aria-current')).toBe('page')
  })

  it('leaves a link with a target or a download to the link', () => {
    render(switchOf('season'))
    link('Laatste 5').setAttribute('target', '_blank')

    expect(click(link('Laatste 5'))).toBe(false)

    link('Laatste 5').removeAttribute('target')
    link('Laatste 5').setAttribute('download', '')

    expect(click(link('Laatste 5'))).toBe(false)
    expect(push).not.toHaveBeenCalled()
  })

  it('is aria-busy while the page loads, and says what was chosen when the content is there', async () => {
    render(<Page />)
    await act(async () => {
      fireEvent.click(link('Laatste 5'))
    })

    expect(group().getAttribute('aria-busy')).toBe('true')
    expect(status().textContent).toBe('')

    await act(async () => {
      release()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    expect(group().hasAttribute('aria-busy')).toBe(false)
    expect(link('Laatste 5').getAttribute('aria-current')).toBe('page')
    expect(status().textContent).toBe('Laatste 5 gekozen')
  })

  it('puts the value of the page back, and says nothing, when the page keeps its value', async () => {
    fail = true
    render(<Page />)
    await act(async () => {
      fireEvent.click(link('Laatste 5'))
    })

    expect(link('Laatste 5').getAttribute('aria-current')).toBe('page')

    await act(async () => {
      release()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    expect(group().hasAttribute('aria-busy')).toBe(false)
    expect(link('Hele seizoen').getAttribute('aria-current')).toBe('page')
    expect(link('Laatste 5').hasAttribute('aria-current')).toBe(false)
    expect(status().textContent).toBe('')
  })

  it('stops saying what was chosen when Back gives the page another value', async () => {
    render(<Page />)
    await act(async () => {
      fireEvent.click(link('Laatste 5'))
    })
    await act(async () => {
      release()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    expect(status().textContent).toBe('Laatste 5 gekozen')

    act(() => {
      history.back()
    })

    expect(link('Hele seizoen').getAttribute('aria-current')).toBe('page')
    expect(status().textContent).toBe('')
  })

  it('says nothing when Back or Forward gives the page another value', () => {
    const { rerender } = render(switchOf('season'))

    rerender(switchOf('last-five'))

    expect(link('Laatste 5').getAttribute('aria-current')).toBe('page')
    expect(status().textContent).toBe('')
  })
})
