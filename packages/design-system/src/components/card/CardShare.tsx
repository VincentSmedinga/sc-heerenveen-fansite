'use client'

import { type ReactNode, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

import { classNames } from '../classNames'
import { Icon } from '../icon/Icon'
import { Logo } from '../logo/Logo'
import { Text } from '../text/Text'
import { makeCardImage } from './makeCardImage'
import { deliverImage, imageButtonName, imageDay, imageFileName } from './shareImage'
import { shareMarker } from './shareMarker'

type Phase = 'busy' | 'done' | 'error' | 'idle'

const messages: Record<Phase, string> = {
  busy: 'Afbeelding wordt gemaakt',
  done: 'Afbeelding is klaar',
  error: 'Het maken van de afbeelding is niet gelukt.',
  idle: '',
}

export type CardShareProps = {
  /**
   * The season the card is about, such as `2025/26`, for a card of a season that is over. It
   * goes under the image and into the name of the file, so an image that is shared later still
   * says which season it shows. Leave it out for the current season.
   */
  season?: string | undefined
  /** The credit of the data in the card, which goes under the image. */
  source: ReactNode
}

/**
 * The button of a card that makes an image of it, and the message that tells how that goes. It
 * is a client component and shows nothing until it is in the browser, so without JavaScript the
 * card has no button that does nothing. It names the button after the heading of the card, and
 * makes the image from a copy of the card on a stage out of sight, with the strip under it that
 * holds the logo, the address, the day and the source. card-share.css gives it its look.
 */
export const CardShare = ({ season, source }: CardShareProps) => {
  const root = useRef<HTMLDivElement>(null)
  const slot = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const [title, setTitle] = useState<string>()
  const [phase, setPhase] = useState<Phase>('idle')
  const [today, setToday] = useState(() => new Date())
  // Where the stage goes: next to the card, so it has the theme and the fonts the card has.
  const [host, setHost] = useState<Element>()

  // The card is only known once it is in the page: its heading gives the name of the button.
  useEffect(() => {
    const heading = root.current?.closest('.hf-card')?.querySelector(':scope > :is(h1, h2, h3, h4, h5, h6)')
    const text = heading?.textContent?.trim()

    setTitle(text === undefined || text === '' ? undefined : text)
  }, [])

  useEffect(() => {
    const card = root.current?.closest('.hf-card')

    if (phase !== 'busy' || title === undefined || !card || !slot.current || !stage.current) {
      return
    }

    let current = true
    const copy = card.cloneNode(true) as HTMLElement

    copy.querySelectorAll(`[${shareMarker}]`).forEach((part) => part.remove())
    copy.classList.remove('hf-card-shareable')
    copy.classList.add('hf-card-share-copy')
    slot.current.replaceChildren(copy)

    const make = async (target: HTMLElement) => {
      try {
        const blob = await makeCardImage(target)
        const delivery = await deliverImage(blob, { fileName: imageFileName(title, today, season), title })

        if (current) {
          setPhase(delivery === 'cancelled' ? 'idle' : 'done')
        }
      } catch {
        if (current) {
          setPhase('error')
        }
      }
    }

    void make(stage.current)

    return () => {
      current = false
    }
  }, [phase, season, title, today])

  if (title === undefined) {
    return <div className="hf-card-share" ref={root} {...{ [shareMarker]: '' }} />
  }

  const busy = phase === 'busy'

  return (
    <div className="hf-card-share" ref={root} {...{ [shareMarker]: '' }}>
      <button
        aria-disabled={busy || undefined}
        aria-label={imageButtonName(title)}
        className="hf-card-share-button"
        data-busy={busy ? '' : undefined}
        onClick={() => {
          if (!busy) {
            setToday(new Date())
            setHost(root.current?.closest('.hf-card')?.parentElement ?? document.body)
            setPhase('busy')
          }
        }}
        type="button"
      >
        <Icon name="image" />
      </button>
      <p className={classNames('hf-card-share-status', phase !== 'error' && 'hf-visually-hidden')} role="status">
        {messages[phase]}
      </p>
      {busy &&
        host !== undefined &&
        createPortal(
          <div aria-hidden="true" className="hf-card-share-offscreen" inert>
            <div className="hf-card-share-stage" ref={stage}>
              <div ref={slot} />
              <footer className="hf-card-share-strip">
                <Logo />
                <div className="hf-card-share-lines">
                  <Text appearance="meta" className="hf-card-share-address">
                    {season === undefined ? '' : `Seizoen ${season} · `}
                    {window.location.host} · {imageDay(today)}
                  </Text>
                  <div className="hf-card-share-credit">{source}</div>
                </div>
              </footer>
            </div>
          </div>,
          host,
        )}
    </div>
  )
}
