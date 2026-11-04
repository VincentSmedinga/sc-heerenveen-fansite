'use client'

import type { MouseEvent } from 'react'

import { SegmentedLinks, type SegmentedLinksProps, Text } from '@fansite/design-system'
import { useRouter } from 'next/navigation'
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'

/** Whether the click is a plain one: a tool key or another mouse button asks for more. */
const isPlainClick = ({ altKey, button, ctrlKey, metaKey, shiftKey }: MouseEvent) =>
  button === 0 && !altKey && !ctrlKey && !metaKey && !shiftKey

/**
 * A `SegmentedLinks` that changes the page without loading it again. The links stay: without
 * JavaScript, and for a click that opens a new tab or a download, they do what a link does. A
 * plain click moves the thumb at once, and the page follows when the server has answered: the
 * old content stays until the new content is there, the group is `aria-busy` while it loads,
 * and a line that nobody sees but a screen reader hears says what was chosen.
 *
 * It uses `useRouter` and not `next/link` on purpose. A visit is a request that asks for HTML
 * (see `visitOf`), and the router asks for the data of the page without it, so a click on a
 * switch is no new visit: the page is already open.
 */
export function SwitchLinks({ options, value, ...props }: SegmentedLinksProps) {
  const router = useRouter()
  const [busy, startTransition] = useTransition()
  const [shown, showOption] = useOptimistic(value)
  const [announcement, setAnnouncement] = useState({ text: '', value })
  const chosen = useRef<string | undefined>(undefined)

  // The transition is over. When the page has the chosen value, the content is there, so tell
  // what was chosen; when the page kept its value, the choice failed and nothing is said.
  useEffect(() => {
    if (busy || chosen.current === undefined) {
      return
    }

    const option = options.find((candidate) => candidate.value === chosen.current)

    chosen.current = undefined

    if (option?.value === value) {
      setAnnouncement({ text: `${option.label} gekozen`, value })
    }
  }, [busy, options, value])

  const choose = (event: MouseEvent<HTMLDivElement>) => {
    const link = event.target instanceof Element ? event.target.closest('a') : null
    const option = options.find((candidate) => candidate.href === link?.getAttribute('href'))

    if (
      event.defaultPrevented ||
      !isPlainClick(event) ||
      link === null ||
      option === undefined ||
      (link.target !== '' && link.target !== '_self') ||
      link.hasAttribute('download')
    ) {
      return
    }

    event.preventDefault()

    if (option.value === shown) {
      return
    }

    // Safari does not focus a link that is clicked.
    link.focus({ preventScroll: true })
    chosen.current = option.value
    setAnnouncement({ text: '', value })
    startTransition(() => {
      showOption(option.value)
      router.push(option.href, { scroll: false })
    })
  }

  return (
    <>
      <SegmentedLinks {...props} aria-busy={busy ? true : undefined} onClick={choose} options={options} value={shown} />
      <Text className="hf-visually-hidden" role="status">
        {announcement.value === value ? announcement.text : ''}
      </Text>
    </>
  )
}
