'use client'

import {
  Button,
  Card,
  CheckboxGroup,
  Disclosure,
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
import { type ReactNode, useActionState, useEffect } from 'react'

import type { ReportFormState } from '#src/beheer/report-fields'

import { pasteMaxLength } from '#src/beheer/report-paste'
import { firstPasteState, pasteExample, type PasteRead_, type PasteState } from '#src/beheer/report-paste-state'

import {
  type ReportChoices,
  ReportErrorSummary,
  ReportFields,
  ReportFormProvider,
  ReportSavePanel,
} from '../ReportForm'

/** The `id` of the card with what the reading says, which gets the focus after a paste. */
const outcomeId = 'plakresultaat'

/** The rules of the format, one line each, for under the field. */
const formatRules = [
  'Elk kopje staat op een eigen regel: Opstelling, Bank, Wissels, Doelpunten, Kaarten en Strafschoppen voor sc Heerenveen, en na het kopje Tegenstander dezelfde kopjes voor de tegenstander.',
  'Een kopje dat ontbreekt is leeg. Hoofdletters en de volgorde van de kopjes doen er niet toe.',
  'Opstelling en Bank: een rugnummer en een naam, zoals "4 Van Aken", en "(a)" erachter voor de aanvoerder. Een speler van ons mag alleen een rugnummer zijn, als hij in de selectie staat.',
  'Wissels: de minuut, wie erin komt en voor wie, zoals "61 12 voor 8" of "90+2 Smit voor Jansen".',
  'Doelpunten: de minuut en de speler die scoorde, met "assist Jansen", "penalty" of "eigen doelpunt" erachter. Onder het kopje van een kant staan de doelpunten die die kant kreeg; bij een eigen doelpunt is de naam een speler van de andere kant.',
  'Kaarten: de minuut, geel, geel-rood of rood, en de speler, zoals "34 geel Jansen".',
  'Strafschoppen: de minuut, gemist of gestopt, en de nemer, zoals "55 gemist Jansen".',
  'Een naam mag een rugnummer zijn. Een regel die met # begint, is commentaar.',
]

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

/**
 * The screen "Tekst plakken": a field for the text, and after the text is read the form of the
 * report with the values filled in, the doubts and the lines that could not be read. Nothing is
 * stored until the form is saved. Without JavaScript it is two plain posts: the text, then the
 * form.
 */
export function PasteScreen({
  action,
  cancelHref,
  choices,
  existing,
  intro,
  saveAction,
}: {
  action: (previous: PasteState, formData: FormData) => Promise<PasteState>
  cancelHref: string
  choices: ReportChoices
  /** What the report has now, in words, or `undefined` for a match without a report. */
  existing: string | undefined
  intro: ReactNode
  saveAction: (previous: ReportFormState, formData: FormData) => Promise<ReportFormState>
}) {
  const [state, formAction, pending] = useActionState(action, firstPasteState)

  if (state.kind === 'read') {
    return (
      <ReportFormProvider
        action={saveAction}
        choices={choices}
        initial={state.form}
        key={state.version}
        title="Controleer het verslag"
      >
        <Page.Main className="hf-density-compact" intro={intro} wide>
          <PasteOutcome state={state} />
          <ReportErrorSummary />
          <ReportFields />
        </Page.Main>
        <Page.Sidebar aria-label="Opslaan" sticky>
          <ReportSavePanel cancelHref={cancelHref} />
        </Page.Sidebar>
      </ReportFormProvider>
    )
  }

  return (
    <>
      <Page.Main intro={intro} wide>
        <Card aria-labelledby="tekst-kop">
          <Heading id="tekst-kop" level={2}>
            Tekst plakken
          </Heading>
          <Form action={formAction} key={state.version}>
            <Field
              error={state.error}
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
                <CheckboxGroup
                  aria-describedby="vervangen-uitleg"
                  legend="Vervangen"
                  name="vervangen"
                  options={[{ label: 'Ja, vervang wat nu in het verslag staat', value: 'ja' }]}
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
      </Page.Main>
    </>
  )
}
