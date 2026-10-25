import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import type { Pair, ScaleName, Theme } from './tokens'

import { contrastRatio, flatten, formatRatio, toRgb } from './contrast'
import {
  pairGroups,
  requirementLabel,
  requirementMinimum,
  scaleLabels,
  scales,
  scaleSteps,
  semanticTokenGroups,
} from './tokens'

const primitiveName = (scale: ScaleName, step: number) => `--hf-colour-${scale}-${step}`

const primitiveNames = [
  '--hf-colour-white',
  ...scales.flatMap(({ name, steps = scaleSteps }) => steps.map((step) => primitiveName(name, step))),
]

/** Read custom properties from the root element. Cheap enough to do on every render. */
const readRootProperties = (names: string[]): Record<string, string> => {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]))
}

/**
 * A number that changes whenever the page's styles change, such as after a hot update of the
 * CSS, so the docs read the tokens and measure the contrast again.
 */
const useStyleVersion = () => {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let frame = 0
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setVersion((current) => current + 1))
    })
    observer.observe(document.head, { characterData: true, childList: true, subtree: true })

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [])

  return version
}

const colourKey = (value: string) => toRgb(value)?.join(',')

/** Dutch name of a primitive, such as grijs-100, for a colour in any CSS syntax. */
const primitiveLabeller = () => {
  const values = readRootProperties(primitiveNames)

  return (colour: string) => {
    const key = colourKey(colour)
    const name = Object.entries(values).find(([, value]) => key !== undefined && colourKey(value) === key)?.[0]
    if (!name) return colour
    if (name === '--hf-colour-white') return 'wit'

    const [, scale, step] = /^--hf-colour-([a-z-]+)-(\d+)$/.exec(name) ?? []
    return `${scaleLabels[scale as ScaleName]}-${step}`
  }
}

export const ColourScales = () => {
  useStyleVersion()
  const values = readRootProperties(primitiveNames)

  return (
    <div className="_hf-docs-stack">
      {scales.map(({ description, label, name, steps = scaleSteps }) => (
        <section aria-labelledby={`scale-${name}`} key={name}>
          <h3 className="hf-heading-3" id={`scale-${name}`}>
            {label}
          </h3>
          <p className="hf-meta _hf-docs-secondary">{description}</p>
          <ol className="_hf-docs-scale">
            {steps.map((step) => {
              const hex = values[primitiveName(name, step)] ?? ''
              return (
                <li key={step}>
                  <span className="_hf-docs-swatch" style={{ backgroundColor: `var(${primitiveName(name, step)})` }} />
                  <span className="_hf-docs-step">{step}</span>
                  <code>{hex}</code>
                  <span className="hf-meta _hf-docs-secondary">{formatRatio(contrastRatio(hex, '#fff'))} op wit</span>
                </li>
              )
            })}
          </ol>
        </section>
      ))}
    </div>
  )
}

/** The light and the dark value of a light-dark() value, or the value itself for both. */
const splitLightDark = (value: string): [string, string] => {
  const inner = /^light-dark\((.*)\)$/s.exec(value.trim())?.[1]
  if (inner === undefined) return [value, value]

  // Split on the first comma outside parentheses, so values such as oklch(…) stay whole.
  let depth = 0
  for (let index = 0; index < inner.length; index++) {
    const char = inner[index]
    if (char === '(') depth++
    else if (char === ')') depth--
    else if (char === ',' && depth === 0) return [inner.slice(0, index).trim(), inner.slice(index + 1).trim()]
  }

  return [value, value]
}

export const SemanticTokenTable = () => {
  useStyleVersion()
  const names = semanticTokenGroups.flatMap(({ tokens }) => tokens.map(({ name }) => name))
  const values = readRootProperties(names)
  const label = primitiveLabeller()

  const themeValue = (name: string, theme: Theme) => splitLightDark(values[name] ?? '')[theme === 'light' ? 0 : 1]

  return (
    <>
      {semanticTokenGroups.map((group) => (
        <table className="_hf-docs-table" key={group.label}>
          <caption>{group.label}</caption>
          <thead>
            <tr>
              <th scope="col">Token</th>
              <th scope="col">Gebruik</th>
              <th scope="col">Licht</th>
              <th scope="col">Donker</th>
            </tr>
          </thead>
          <tbody>
            {group.tokens.map(({ name, provisional = [], use }) => (
              <tr key={name}>
                <td>
                  <code>{name}</code>
                </td>
                <td>{use}</td>
                {(['light', 'dark'] as const).map((theme) => {
                  const colour = themeValue(name, theme)
                  return (
                    <td key={theme}>
                      <span className="_hf-docs-value">
                        <span className="_hf-docs-chip" style={{ backgroundColor: colour }} />
                        {label(colour)}
                        {provisional.includes(theme) && <span className="_hf-docs-provisional">voorlopig</span>}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      ))}
    </>
  )
}

const tokenLabel = (name: string) => name.replace('--hf-colour-', '')

const outcome = (ratio: number | undefined, minimum: number) => {
  if (minimum === 0) return '–'
  if (ratio === undefined) return 'onbekend'
  return ratio >= minimum ? 'voldoet' : <strong className="_hf-docs-fail">voldoet niet</strong>
}

const PairRow = ({ pair, text }: { pair: Pair; text: boolean }) => {
  const sample = useRef<HTMLSpanElement>(null)
  const stripe = useRef<HTMLSpanElement>(null)
  const [ratio, setRatio] = useState<number>()
  const version = useStyleVersion()

  // Measure what the browser actually renders; again whenever the styles change.
  // A background that isn't opaque, such as a stripe, is measured on the surface it lies on.
  useLayoutEffect(() => {
    if (!sample.current) return
    const style = getComputedStyle(sample.current)
    const background = stripe.current
      ? flatten(getComputedStyle(stripe.current).color, style.backgroundColor)
      : style.backgroundColor
    setRatio(background === undefined ? undefined : contrastRatio(style.color, background))
  }, [version])

  const minimum = requirementMinimum[pair.requirement]

  return (
    <tr>
      <td>
        <span
          aria-hidden={text ? undefined : true}
          className={text ? '_hf-docs-sample' : '_hf-docs-sample _hf-docs-sample-ring'}
          ref={sample}
          style={
            pair.under
              ? {
                  backgroundColor: `var(${pair.under})`,
                  backgroundImage: `linear-gradient(var(${pair.background}), var(${pair.background}))`,
                  color: `var(${pair.foreground})`,
                }
              : { backgroundColor: `var(${pair.background})`, color: `var(${pair.foreground})` }
          }
        >
          {text ? 'Heerenveen' : null}
        </span>
        {pair.under && <span hidden ref={stripe} style={{ color: `var(${pair.background})` }} />}
      </td>
      <td>
        {pair.label}
        <br />
        <code className="_hf-docs-pair">
          {tokenLabel(pair.foreground)} op {tokenLabel(pair.background)}
        </code>
      </td>
      <td className="hf-numeric">{formatRatio(ratio)}</td>
      <td>{requirementLabel[pair.requirement]}</td>
      <td>{outcome(ratio, minimum)}</td>
    </tr>
  )
}

const themeLabels: Record<Theme, string> = { dark: 'Donker', light: 'Licht' }

export const ContrastTables = ({ theme }: { theme: Theme }) => (
  <section aria-labelledby={`contrast-${theme}`} className="_hf-docs-theme-panel" data-theme={theme}>
    <h3 className="hf-heading-3" id={`contrast-${theme}`}>
      {themeLabels[theme]}
    </h3>
    {pairGroups.map((group) => (
      <table className="_hf-docs-table" key={group.label}>
        <caption>
          {group.label}
          <span className="hf-meta _hf-docs-caption-note">{group.description}</span>
        </caption>
        <thead>
          <tr>
            <th scope="col">Voorbeeld</th>
            <th scope="col">Paar</th>
            <th className="hf-numeric" scope="col">
              Contrast
            </th>
            <th scope="col">Eis</th>
            <th scope="col">Uitkomst</th>
          </tr>
        </thead>
        <tbody>
          {group.pairs.map((pair) => (
            <PairRow key={`${pair.foreground}-${pair.background}`} pair={pair} text={group.text} />
          ))}
        </tbody>
      </table>
    ))}
  </section>
)

const stepIndex = (step: number) => (scaleSteps as readonly number[]).indexOf(step)

/** Runs of consecutive steps, such as [100], [300] for a scale with steps 100 and 300. */
const consecutiveRuns = (steps: readonly number[]) =>
  steps.reduce<number[][]>((runs, step) => {
    const run = runs.at(-1)
    const previous = run?.at(-1)
    if (run && previous !== undefined && stepIndex(previous) === stepIndex(step) - 1) run.push(step)
    else runs.push([step])
    return runs
  }, [])

/**
 * A compact view of the scales, for the brand page. A partial scale sits under the steps it
 * shares.
 */
export const PaletteStrip = () => (
  <div className="_hf-docs-stack">
    {scales.map(({ label, name, steps }) => {
      const swatches = (run: readonly number[]) =>
        run.map((step) => (
          <span
            key={step}
            style={{ backgroundColor: `var(${primitiveName(name, step)})` }}
            title={`${label} ${step}`}
          />
        ))

      return (
        <div key={name}>
          <p className="hf-label" style={{ marginBlockEnd: '0.5rem' }}>
            {label}
          </p>
          {steps ? (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${scaleSteps.length}, minmax(0, 1fr))` }}>
              {consecutiveRuns(steps).map((run) => {
                const [first = 0] = run
                return (
                  <div
                    className="_hf-docs-strip"
                    key={first}
                    style={{
                      gridColumn: `${stepIndex(first) + 1} / span ${run.length}`,
                      gridTemplateColumns: `repeat(${run.length}, minmax(0, 1fr))`,
                    }}
                  >
                    {swatches(run)}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="_hf-docs-strip">{swatches(scaleSteps)}</div>
          )}
        </div>
      )
    })}
  </div>
)
