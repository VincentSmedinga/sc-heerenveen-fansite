// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { QuestionHeading, questionHeadingId } from './QuestionHeading'

afterEach(cleanup)

describe('the heading of the question', () => {
  it('takes the focus when the player changes after an answer, so a screen reader starts at the new question', () => {
    const { rerender } = render(
      <QuestionHeading focus personId={1}>
        Speler 1
      </QuestionHeading>,
    )

    expect(document.activeElement?.id).toBe(questionHeadingId)

    // Something else has the focus now, as a button after a press does; the next player comes.
    ;(document.activeElement as HTMLElement).blur()
    expect(document.activeElement).toBe(document.body)

    rerender(
      <QuestionHeading focus personId={2}>
        Speler 2
      </QuestionHeading>,
    )

    expect(document.activeElement?.id).toBe(questionHeadingId)
    expect(document.activeElement?.textContent).toBe('Speler 2')
  })

  it('leaves the focus alone on the first visit, and does not steal it while the player stays', () => {
    const { rerender } = render(
      <QuestionHeading focus={false} personId={1}>
        Speler 1
      </QuestionHeading>,
    )

    expect(document.activeElement).toBe(document.body)

    rerender(
      <QuestionHeading focus={false} personId={2}>
        Speler 2
      </QuestionHeading>,
    )

    expect(document.activeElement).toBe(document.body)
  })

  it('can be reached by the focus without being in the tab order', () => {
    render(
      <QuestionHeading focus={false} personId={1}>
        Speler 1
      </QuestionHeading>,
    )

    expect(document.getElementById(questionHeadingId)?.getAttribute('tabindex')).toBe('-1')
  })
})
