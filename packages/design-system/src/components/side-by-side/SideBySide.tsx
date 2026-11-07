import type { ComponentPropsWithoutRef } from 'react'

import { classNames } from '../classNames'

export type SideBySideAsideProps = ComponentPropsWithoutRef<'section'>

export type SideBySideMainProps = ComponentPropsWithoutRef<'div'>

export type SideBySideProps = ComponentPropsWithoutRef<'div'>

export type SideBySideTabsProps = ComponentPropsWithoutRef<'div'>

/**
 * Two parts of one task next to each other, such as a form and the preview of what it makes:
 * the main part on the left and the aside on the right, which stays in view while the main part
 * scrolls. Below the width of the place they are in, they stand one at a time, and the tabs
 * choose which: give the part that is not shown the `hidden` attribute, so what is in it keeps
 * its place and its values. Above that width both are shown whatever `hidden` says, and the
 * tabs are gone. It holds no state: the page decides which part is shown.
 * side-by-side.css gives it its look.
 */
export const SideBySide = ({ children, className, ...props }: SideBySideProps) => (
  <div {...props} className={classNames('hf-side-by-side', className)}>
    <div className="hf-side-by-side-grid">{children}</div>
  </div>
)

/**
 * The control that chooses between the two parts when they stand one at a time, such as a
 * `SegmentedControl`. It is only shown below the width where the parts stand side by side.
 */
const Tabs = ({ className, ...props }: SideBySideTabsProps) => (
  <div {...props} className={classNames('hf-side-by-side-tabs', className)} />
)

/** The main part, on the left. */
const Main = ({ className, ...props }: SideBySideMainProps) => (
  <div {...props} className={classNames('hf-side-by-side-main', className)} />
)

/**
 * The aside, on the right, which sticks to the top of the screen and scrolls by itself when it
 * is taller than the screen. Give it a name with `aria-labelledby` and make it focusable
 * (`tabIndex={0}`), so a keyboard can scroll it.
 */
const Aside = ({ className, ...props }: SideBySideAsideProps) => (
  <section {...props} className={classNames('hf-side-by-side-aside', className)} />
)

// The names in React's developer tools and in the code examples in Storybook.
Tabs.displayName = 'SideBySide.Tabs'
Main.displayName = 'SideBySide.Main'
Aside.displayName = 'SideBySide.Aside'

SideBySide.Tabs = Tabs
SideBySide.Main = Main
SideBySide.Aside = Aside
