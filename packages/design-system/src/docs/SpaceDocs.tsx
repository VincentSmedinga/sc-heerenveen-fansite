import { type CSSProperties, Fragment, type ReactNode } from 'react'

import { spaceSteps } from './space'

/** Text with `code` in it, from the list in space.ts, which is plain strings. */
const withCode = (text: string): ReactNode =>
  text
    .split('`')
    .map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : <Fragment key={index}>{part}</Fragment>))

/** Every step as a square of its own size, with its name, to compare the steps by eye. */
export const SpaceSteps = () => (
  <ul aria-label="De stappen van de ruimte" className="_hf-docs-space">
    {spaceSteps.map(({ label, name, token }) => (
      <li key={token}>
        <span
          aria-hidden="true"
          className="_hf-docs-space-block"
          style={{ '--hf-docs-space': `var(${token})` } as CSSProperties}
        />
        <span>
          <strong>{label}</strong> <code>{token}</code>
          {name ? <span className="_hf-docs-secondary"> {withCode(name)}</span> : null}
        </span>
      </li>
    ))}
  </ul>
)
