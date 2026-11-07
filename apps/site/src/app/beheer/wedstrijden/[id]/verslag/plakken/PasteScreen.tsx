'use client'

import {
  Button,
  Card,
  CheckboxGroup,
  Disclosure,
  ErrorSummary,
  Field,
  Form,
  Heading,
  Link,
  List,
  Notice,
  Page,
  Strong,
  Text,
  Textarea,
} from '@fansite/design-system'
import { createContext, type ReactNode, use, useActionState, useEffect } from 'react'

import {
  firstPasteState,
  type PasteAsk,
  pasteExample,
  pasteMaxLength,
  type PasteRead_,
  type PasteState,
} from '#src/beheer/report-paste-state'

import { type ReportChoices, ReportErrorSummary, ReportFields, ReportFormShell, ReportSavePanel } from '../ReportForm'

/** The `id` of the card with what the reading says, which gets the focus after a paste. */
const outcomeId = 'plakresultaat'

/** The rules of the format, one line each, for under the field. */
const formatRules = [
  'Elk kopje staat op een eigen regel.',
  'De kopjes voor sc Heerenveen zijn Opstelling, Bank, Wissels, Doelpunten, Kaarten en Strafschoppen.',
  'Na het kopje Tegenstander staan dezelfde kopjes voor de tegenstander.',
  'Een kopje dat ontbreekt is leeg, en hoofdletters en de volgorde van de kopjes doen er niet toe.',
  'Opstelling en Bank: een rugnummer en een naam, zoals "4 Van Aken", met "(a)" erachter voor de aanvoerder.',
  'Een speler van ons mag alleen een rugnummer zijn, als hij in de selectie van het seizoen staat.',
  'Wissels: de minuut, wie erin komt en voor wie, zoals "61 12 voor 8" of "90+2 Smit voor Jansen".',
  'Doelpunten: de minuut en de speler die scoorde, zoals "23 Smit".',
  'Zet "assist Jansen", "penalty" of "eigen doelpunt" achter een doelpunt waar dat bij hoort.',
  'Onder het kopje van een kant staan de doelpunten die die kant kreeg.',
  'Bij een eigen doelpunt is de naam een speler van de andere kant.',
  'Kaarten: de minuut, geel, geel-rood of rood, en de speler, zoals "34 geel Jansen".',
  'Strafschoppen: de minuut, gemist of gestopt, en de nemer, zoals "55 gemist Jansen".',
  'Formatie: de formatie van het team, zoals "Formatie: 4-3-3", op een eigen regel bij het team.',
  'Een formatie is getallen met een koppelteken ertussen, zonder spaties, en de getallen zijn samen tien.',
  'Een naam mag een rugnummer zijn, en een regel die met # begint, is commentaar.',
]

type PasteContext = {
  cancelHref: string
  /** What the report has now, in words, or `undefined` for a match without a report. */
  existing: string | undefined
  formAction: (formData: FormData) => void
  pending: boolean
  state: PasteState
}

/**
 * What the reading says, above the form: how many lines were read, the lines that were not
 * (with their number and why), and the doubts that the editor settles in the form. It is text,
 * not colour, and it gets the focus after a paste.
 */
export function PasteOutcome({ state }: { state: PasteRead_ }) {
  useEffect(() => {
    document.getElementById(outcomeId)?.focus()
  }, [])

  const { choices, read, unread } = state
  const lines =
    read.length + unread.length + choices.filter((choice) => !read.some((line) => line.line === choice.line)).length

  return (
    <Card aria-labelledby="plakresultaat-kop" id={outcomeId} tabIndex={-1}>
      <Heading id="plakresultaat-kop" level={2}>
        Gelezen
      </Heading>
      <Notice>
        <Strong>Er is nog niets bewaard.</Strong> Kijk het formulier na en kies Opslaan. Wat hier niet gelezen is,
        ontbreekt in het formulier.
      </Notice>
      <Text>
        {`We lazen ${read.length} van de ${lines} regels. ${unread.length === 0 ? 'Alle regels zijn gelezen.' : `${unread.length} ${unread.length === 1 ? 'regel is' : 'regels zijn'} niet gelezen.`} ${choices.length === 0 ? '' : `${choices.length} ${choices.length === 1 ? 'regel vraagt' : 'regels vragen'} een keuze van jou.`}`.trim()}
      </Text>
      {unread.length === 0 ? null : (
        <>
          <Heading id="niet-gelezen" level={3}>
            Niet gelezen
          </Heading>
          <List aria-labelledby="niet-gelezen" as="ol">
            {unread.map((line) => (
              <List.Item key={line.line}>
                <Strong>Regel {line.line}:</Strong> {line.text}{' '}
                <Text appearance="meta" as="span">
                  ({line.reason})
                </Text>
              </List.Item>
            ))}
          </List>
        </>
      )}
      {choices.length === 0 ? null : (
        <>
          <Heading id="kies-een-speler" level={3}>
            Kies een speler
          </Heading>
          <List aria-labelledby="kies-een-speler" as="ol">
            {choices.map((choice) => (
              <List.Item key={`${choice.line}-${choice.message}`}>
                {choice.message}
                {choice.names.length === 0 ? '' : ` Het kan ${choice.names.join(' of ')} zijn.`}
              </List.Item>
            ))}
          </List>
        </>
      )}
      <Disclosure summary="Wat we lazen">
        <List aria-label="Gelezen regels" as="ol">
          {read.map((line) => (
            <List.Item key={line.line}>
              <Strong>Regel {line.line}:</Strong> {line.meaning}
            </List.Item>
          ))}
        </List>
      </Disclosure>
    </Card>
  )
}

const PasteContext = createContext<PasteContext | undefined>(undefined)

/**
 * The main column: the field for the text and the format before the text is read, and after it
 * what the reading says above the form of the report.
 */
export function PasteBody() {
  const { cancelHref, existing, formAction, pending, state } = usePaste()

  if (state.kind === 'read') {
    return (
      <>
        <PasteOutcome state={state} />
        <ReportErrorSummary />
        <ReportFields />
      </>
    )
  }

  return (
    <>
      <Card aria-labelledby="tekst-kop">
        <Heading id="tekst-kop" level={2}>
          Tekst plakken
        </Heading>
        <PasteError state={state} />
        <Form action={formAction} key={state.version}>
          <Field
            error={state.field === 'vervangen' ? undefined : state.error}
            hint={`Plak de tekst in het formaat hieronder. Hoogstens ${pasteMaxLength.toLocaleString('nl-NL')} tekens. Er wordt niets bewaard voordat je in het formulier Opslaan kiest.`}
            id="tekst"
            label="Tekst van het verslag"
          >
            <Textarea defaultValue={state.text} name="tekst" rows={16} spellCheck={false} />
          </Field>
          {existing === undefined ? null : (
            <>
              <Text id="vervangen-uitleg">
                {`In het verslag staat al iets: ${existing}. Plakken vervangt alles in het formulier. Het verslag in de database verandert pas als je Opslaan kiest.`}
              </Text>
              {state.field === 'vervangen' ? (
                <Text id="vervangen-fout">
                  <Strong>{state.error}</Strong>
                </Text>
              ) : null}
              <CheckboxGroup
                aria-describedby={state.field === 'vervangen' ? 'vervangen-uitleg vervangen-fout' : 'vervangen-uitleg'}
                id="vervangen"
                legend="Vervangen"
                name="vervangen"
                options={[{ label: 'Ja, vervang wat nu in het verslag staat', value: 'ja' }]}
                tabIndex={-1}
                value={state.replace ? ['ja'] : []}
              />
            </>
          )}
          <Button disabled={pending} type="submit">
            Tekst lezen
          </Button>
          <Text>
            <Link href={cancelHref}>Annuleren</Link>
          </Text>
        </Form>
      </Card>
      <Card aria-labelledby="formaat-kop">
        <Heading id="formaat-kop" level={2}>
          Het formaat
        </Heading>
        <List>
          {formatRules.map((rule) => (
            <List.Item key={rule}>{rule}</List.Item>
          ))}
        </List>
        <Field
          hideOptional
          hint="Kopieer dit voorbeeld, het zijn verzonnen spelers, en pas het aan."
          id="voorbeeld"
          label="Voorbeeld"
          required={false}
        >
          <Textarea defaultValue={pasteExample} readOnly rows={22} spellCheck={false} />
        </Field>
      </Card>
    </>
  )
}

/**
 * The state of the screen "Tekst plakken", shared by its body and its sidebar: the answer of
 * the server to the text, and, once the text is read, the form of the report with the values
 * filled in. The page puts the two in the columns of the page, as the screen of the report
 * does, so they sit in this provider. Nothing is stored until the form is saved. Without
 * JavaScript it is two plain posts: the text, then the form.
 */
export function PasteProvider({
  action,
  cancelHref,
  children,
  choices,
  existing,
}: {
  action: (previous: PasteState, formData: FormData) => Promise<PasteState>
  cancelHref: string
  children: ReactNode
  choices: ReportChoices
  existing: string | undefined
}) {
  const [state, formAction, pending] = useActionState(action, firstPasteState)
  const context = { cancelHref, existing, formAction, pending, state }

  if (state.kind === 'read') {
    return (
      <PasteContext value={context}>
        <ReportFormShell
          choices={choices}
          formAction={formAction}
          key={state.version}
          pending={pending}
          state={state.form}
          title="Controleer het verslag"
        >
          {children}
        </ReportFormShell>
      </PasteContext>
    )
  }

  return <PasteContext value={context}>{children}</PasteContext>
}

/** The sidebar: "Opslaan" for the form, which is only there once the text is read. */
export function PasteSidebar() {
  const { cancelHref, state } = usePaste()

  return state.kind === 'read' ? (
    <Page.Sidebar aria-label="Opslaan" sticky>
      <ReportSavePanel cancelHref={cancelHref} />
    </Page.Sidebar>
  ) : null
}

/**
 * The error of the field for the text, in a list of its own that gets the focus after the
 * server answered, as the list of errors of the form does: the remade form would otherwise
 * leave the focus on the page, and a screen reader would not say what is wrong.
 */
function PasteError({ state }: { state: PasteAsk }) {
  useEffect(() => {
    if (state.version > 0 && state.error !== undefined) {
      document.getElementById('plak-fouten')?.focus()
    }
  }, [state])

  return state.error === undefined ? null : (
    <ErrorSummary
      errors={[{ id: state.field ?? 'tekst', message: state.error }]}
      id="plak-fouten"
      level={3}
      tabIndex={-1}
      title="Er is iets mis"
    />
  )
}

function usePaste() {
  const context = use(PasteContext)

  if (context === undefined) {
    throw new Error('PasteBody and PasteSidebar belong in a PasteProvider.')
  }

  return context
}
