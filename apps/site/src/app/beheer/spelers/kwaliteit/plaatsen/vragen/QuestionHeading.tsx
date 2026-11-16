'use client'

import { Heading } from '@fansite/design-system'
import { type ReactNode, useEffect } from 'react'

/** The `id` of the heading of the question, which the quiz gives the focus. */
export const questionHeadingId = 'vraag-kop'

/**
 * The heading of the question of the quiz (issue 1194). After an answer or a skip the server
 * shows the next player on the same page, so the browser keeps the old heading and the focus
 * stays where it was. With `focus` this moves it to the heading when the player changes, so a
 * screen reader starts at the new question. The first visit has no focus of its own to move.
 */
export function QuestionHeading({
  children,
  focus,
  personId,
}: {
  children: ReactNode
  focus: boolean
  personId: number
}) {
  useEffect(() => {
    if (focus) {
      document.getElementById(questionHeadingId)?.focus()
    }
  }, [focus, personId])

  return (
    <Heading id={questionHeadingId} level={2} tabIndex={-1}>
      {children}
    </Heading>
  )
}
