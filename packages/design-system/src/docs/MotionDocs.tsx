import { Fragment, type ReactNode, useState } from 'react'

import { Button } from '../components/button/Button'
import { ThemeButton } from '../components/theme-button/ThemeButton'
import { motionChanges, type MotionGroupId, motionGroups, motionTokens } from './motion'

/** Text with `code` in it, from the lists in motion.ts, which are plain strings. */
const withCode = (text: string): ReactNode =>
  text
    .split('`')
    .map((part, index) => (index % 2 === 1 ? <code key={index}>{part}</code> : <Fragment key={index}>{part}</Fragment>))

/** Read custom properties from the root element. */
const readRootProperties = (names: string[]): Record<string, string> => {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]))
}

const seconds = (value: string) => value.replace('.', ',').replace(/s$/, ' s')

export const MotionTokenTable = () => {
  const values = readRootProperties(motionTokens.map(({ name }) => name))

  return (
    <table className="_hf-docs-table">
      <caption>Duren en versnellingen</caption>
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Gebruik</th>
          <th scope="col">Waarde</th>
          <th scope="col">Met minder beweging</th>
        </tr>
      </thead>
      <tbody>
        {motionTokens.map(({ name, use }) => (
          <tr key={name}>
            <td>
              <code>{name}</code>
            </td>
            <td>{use}</td>
            <td>{name.includes('duration') ? seconds(values[name] ?? '') : (values[name] ?? '')}</td>
            <td>{name.includes('duration') ? '0 s' : 'zonder duur, dus zonder effect'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export const MotionGroupTable = () => (
  <table className="_hf-docs-table">
    <caption>De groepen</caption>
    <thead>
      <tr>
        <th scope="col">Groep</th>
        <th scope="col">Wat erbij hoort</th>
        <th scope="col">Wat beweegt</th>
        <th scope="col">Waarom</th>
        <th scope="col">Tokens</th>
      </tr>
    </thead>
    <tbody>
      {motionGroups.map(({ contains, id, label, moves, tokens, why }) => (
        <tr key={id}>
          <th scope="row">{label}</th>
          <td>{withCode(contains)}</td>
          <td>{withCode(moves)}</td>
          <td>{withCode(why)}</td>
          <td>
            {tokens.length === 0 ? (
              'Geen'
            ) : (
              <ul className="_hf-docs-motion-tokens">
                {tokens.map((token) => (
                  <li key={token}>
                    <code>{token}</code>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
)

export const MotionChangeTable = () => (
  <>
    {motionGroups.map(({ id, label }) => (
      <table className="_hf-docs-table" key={id}>
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Onderdeel</th>
            <th scope="col">Wat wisselt</th>
            <th scope="col">Waardoor</th>
            <th scope="col">Nu</th>
          </tr>
        </thead>
        <tbody>
          {motionChanges
            .filter(({ group }) => group === id)
            .map(({ component, now, what, why }) => (
              <tr key={`${component}-${why}`}>
                <th scope="row">{component}</th>
                <td>{withCode(what)}</td>
                <td>{withCode(why)}</td>
                <td>{withCode(now)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    ))}
  </>
)

/** The words with a group of the examples: what to do, to see it. */
const Example = ({ children, group, hint }: { children: ReactNode; group: MotionGroupId; hint: string }) => {
  const { label } = motionGroups.find(({ id }) => id === group) ?? { label: group }

  return (
    <section aria-label={label} className="_hf-docs-motion-example">
      <p className="_hf-docs-secondary">{hint}</p>
      <div className="_hf-docs-motion-stage">{children}</div>
    </section>
  )
}

/** Aanwijzen: a link and a button, under the mouse and with Tab. */
export const PointExample = () => (
  <Example group="aanwijzen" hint="Wijs de link en de knop aan, of loop er met Tab naartoe.">
    <a className="_hf-docs-motion-point" href="#aanwijzen">
      Een link
    </a>
    <Button className="_hf-docs-motion-button" type="button">
      Een knop
    </Button>
  </Example>
)

/** Ingedrukt en geselecteerd: a button that stays pressed. */
export const SelectExample = () => {
  const [pressed, setPressed] = useState(false)

  return (
    <Example group="selecteren" hint="Druk de knop in en houd vast, laat los, en druk nog eens.">
      <Button
        aria-pressed={pressed}
        className="_hf-docs-motion-toggle"
        onClick={() => setPressed((current) => !current)}
        type="button"
      >
        Een keuze
      </Button>
    </Example>
  )
}

/** Verschijnen en verdwijnen: a panel that keeps its place and only fades. */
export const AppearExample = () => {
  const [open, setOpen] = useState(true)

  return (
    <Example group="verschijnen" hint="Toon en verberg het paneel: er verschuift niets.">
      <Button
        aria-controls="docs-motion-panel"
        aria-expanded={open}
        className="_hf-docs-motion-toggle"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {open ? 'Verberg' : 'Toon'} het paneel
      </Button>
      <p className="_hf-docs-motion-panel" data-open={open ? '' : undefined} id="docs-motion-panel" inert={!open}>
        Dit paneel heeft altijd zijn plek. Alleen de doorzichtigheid verandert.
      </p>
    </Example>
  )
}

/** De hele pagina: the theme button, as in the header, in its own dark blue. */
export const PageExample = () => {
  const [dark, setDark] = useState(false)

  return (
    <Example group="pagina" hint="Wijs de knop aan en klik: de zon en de maan gaan in elkaar over.">
      <div className="_hf-docs-motion-header">
        <ThemeButton dark={dark} label="Donker" onClick={() => setDark((current) => !current)} />
      </div>
    </Example>
  )
}

/** Zonder overgang: the focus ring and a field with an error. */
export const DirectExample = () => (
  <Example group="direct" hint="Loop met Tab naar de knop: de focusrand staat er meteen. Het veld met een fout ook.">
    <Button type="button">Een knop</Button>
    <input aria-invalid="true" aria-label="Een veld met een fout" defaultValue="Fout" type="text" />
  </Example>
)
