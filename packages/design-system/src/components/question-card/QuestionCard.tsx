import type { ComponentPropsWithoutRef, ReactNode } from 'react'

import { classNames } from '../classNames'

export type QuestionCardGridProps = Omit<ComponentPropsWithoutRef<'ul'>, 'role'>

export type QuestionCardProps = Omit<ComponentPropsWithoutRef<'li'>, 'children' | 'title'> & {
  /** The short line under the number, such as `sinds 1990/91`. It can be left out. */
  children?: ReactNode
  /** The number the question gives, large: a count, or a score such as `11–1`. */
  figure: string
  /** Where the card goes. The whole card is the link, so there is one address. */
  href: string
  /** The question, in plain words: `Alle 0–0’s`. */
  question: string
}

/**
 * The grid the cards stand in: a list, so a screen reader says how many there are, with the
 * cards in three columns on a wide screen and under each other on a phone. It only holds
 * QuestionCard elements, so it is written as QuestionCard.Grid. Give it a name with
 * `aria-label`.
 */
const Grid = ({ className, ...props }: QuestionCardGridProps) => (
  // role="list" keeps the list for a screen reader when the list style is none (Safari).
  <ul className={classNames('hf-question-grid', className)} role="list" {...props} />
)

// The name in React's developer tools and in the code examples in Storybook.
Grid.displayName = 'QuestionCard.Grid'

/**
 * A question with its answer as a number, as a card that is one link to the search that
 * answers it. The link is named by the question, the number and the line together, so a screen
 * reader hears the whole card. Put the cards in a QuestionCard.Grid, which makes the list.
 */
export const QuestionCard = ({ children, className, figure, href, question, ...props }: QuestionCardProps) => (
  <li className={classNames('hf-question-item', className)} {...props}>
    <a className="hf-card hf-question-card" href={href}>
      <span className="hf-question-text">{question}</span> <span className="hf-question-figure">{figure}</span>
      {children === undefined ? null : (
        <>
          {' '}
          <span className="hf-question-note">{children}</span>
        </>
      )}
    </a>
  </li>
)

QuestionCard.Grid = Grid
