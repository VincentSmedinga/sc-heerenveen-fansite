/**
 * The input of the form of a match report, kept in the browser of the editor, so a save that
 * fails (a lost connection, a time-out, a session that ran out) costs nothing. The server gives
 * the input back only when it answers.
 *
 * What is stored is the fields of the form and the moment of storing, under the key
 * `fansite-verslag-<match>`, and nothing more: no address, no name of the editor and nothing of
 * visitors. It never goes to the server. It goes away after a save that worked, at logging out
 * (`clearAllDrafts`, called from the admin like the mark of the menu in `admin-marker.ts`) and
 * after thirty days.
 */
import { type FieldName, type ReportValues, type Row, rowFields, rowKinds, sides } from './report-fields'

/** The start of every key: logging out takes away every key that starts with it. */
export const draftKeyPrefix = 'fansite-verslag-'

/** How long a draft is kept, in milliseconds: thirty days. */
export const draftLifetime = 30 * 24 * 60 * 60 * 1000

/** The event that tells the form in the same tab that its draft changed. */
export const draftEvent = 'fansite-verslag-change'

export type ReportDraft = { savedAt: number; values: ReportValues }

/** The key of the draft of a match. */
export const draftKey = (matchId: number) => `${draftKeyPrefix}${matchId}`

/**
 * The values as the text the form shows, to compare two of them: only the fields of the form, a
 * missing field as empty, and the name of one of ours who is chosen from the squad as empty, as
 * the form sends it.
 */
export function canonicalValues(values: ReportValues): string {
  const side = (of: (typeof sides)[number]) =>
    rowKinds.map((kind) =>
      values[of][kind].map((row: Row) =>
        rowFields[kind].map((field: FieldName) =>
          kind === 'speler' && of === 'wij' && field === 'naam' && row.keuze !== 'andere' ? '' : (row[field] ?? ''),
        ),
      ),
    )

  return JSON.stringify([
    values.bron,
    values.status,
    values.tegenstander,
    sides.map((of) => [values.formatie[of].keuze, values.formatie[of].eigen]),
    sides.map(side),
  ])
}

const isText = (value: unknown): value is string => typeof value === 'string'

/** The key that holds for which save the draft of a match was taken away. */
const afterSaveKey = (matchId: number) => `${draftKey(matchId)}-opgeslagen`

/** Takes away every draft, at logging out. */
export function clearAllDrafts(storage?: Storage) {
  try {
    const store = storage ?? localStorage
    const keys = Array.from({ length: store.length }, (_unused, index) => store.key(index)).filter(
      (key): key is string => key !== null && key.startsWith(draftKeyPrefix),
    )

    for (const key of keys) {
      store.removeItem(key)
    }
  } catch {
    // Storage can be blocked.
  }

  tell()
}

/** Takes away the draft of a match. */
export function clearDraft(matchId: number, storage?: Storage) {
  try {
    ;(storage ?? localStorage).removeItem(draftKey(matchId))
  } catch {
    // Storage can be blocked.
  }

  tell()
}

/** Takes the draft away after the save at `savedAt`, once, and remembers that it did. */
export function clearDraftAfterSave(matchId: number, savedAt: number, storage?: Storage) {
  if (!draftDueAfterSave(matchId, savedAt, storage)) {
    return
  }

  try {
    ;(storage ?? localStorage).setItem(afterSaveKey(matchId), String(savedAt))
  } catch {
    // Storage can be blocked: there is no draft either.
  }

  clearDraft(matchId, storage)
}

/**
 * Whether the page after a save still has to take the draft away: once for each save, so a page
 * that opens again at the same address (a reload, the way back) leaves input typed after that
 * save alone. `savedAt` is the moment the server saved the report, which changes with a save.
 */
export function draftDueAfterSave(matchId: number, savedAt: number, storage?: Storage): boolean {
  try {
    return (storage ?? localStorage).getItem(afterSaveKey(matchId)) !== String(savedAt)
  } catch {
    return false
  }
}

/** The draft in a text, or `undefined` when the text is not one. */
export function parseDraft(text: null | string): ReportDraft | undefined {
  if (text === null) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(text)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'savedAt' in parsed &&
      typeof parsed.savedAt === 'number' &&
      'values' in parsed &&
      isValues(parsed.values)
    ) {
      return { savedAt: parsed.savedAt, values: parsed.values }
    }
  } catch {
    // Broken text: no draft.
  }

  return undefined
}

/**
 * The draft of a match as the text in storage, or `null` when there is none, it is broken or it
 * is older than thirty days (it is taken away then). It is the text and not the draft, so
 * `useSyncExternalStore` can compare it.
 */
export function readDraftText(matchId: number, now = Date.now(), storage?: Storage): null | string {
  try {
    const store = storage ?? localStorage
    const text = store.getItem(draftKey(matchId))

    if (text === null) {
      return null
    }

    const draft = parseDraft(text)

    if (draft === undefined || now - draft.savedAt > draftLifetime || draft.savedAt - now > draftLifetime) {
      store.removeItem(draftKey(matchId))

      return null
    }

    return text
  } catch {
    // Storage can be blocked: the form works without it.
    return null
  }
}

/**
 * Keeps the values as the draft of the match, only when they differ from what is stored (so
 * nothing is written for nothing). Values that are the same as the server has are no draft:
 * the key goes away then.
 */
export function saveDraft(
  matchId: number,
  values: ReportValues,
  server: ReportValues,
  now = Date.now(),
  storage?: Storage,
) {
  try {
    const store = storage ?? localStorage
    const stored = parseDraft(store.getItem(draftKey(matchId)))

    if (canonicalValues(values) === canonicalValues(server)) {
      if (store.getItem(draftKey(matchId)) !== null) {
        store.removeItem(draftKey(matchId))
        tell()
      }

      return
    }

    if (stored !== undefined && canonicalValues(stored.values) === canonicalValues(values)) {
      return
    }

    store.setItem(draftKey(matchId), JSON.stringify({ savedAt: now, values } satisfies ReportDraft))
    tell()
  } catch {
    // Storage can be blocked or full: the form works without it.
  }
}

/** For `useSyncExternalStore`: calls `onChange` when a draft changes here or in another tab. */
export function subscribeToDrafts(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith(draftKeyPrefix)) {
      onChange()
    }
  }

  window.addEventListener(draftEvent, onChange)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(draftEvent, onChange)
    window.removeEventListener('storage', onStorage)
  }
}

/** Whether a parsed value has the shape of the values of the form: texts in rows in lists. */
/** Whether a parsed value has the shape of the values of the form: texts in rows in lists. */
function isValues(value: unknown): value is ReportValues {
  const record = (item: unknown): item is Record<string, unknown> => typeof item === 'object' && item !== null
  const get = (item: Record<string, unknown>, key: string) => item[key]

  if (
    !record(value) ||
    !isText(get(value, 'bron')) ||
    !isText(get(value, 'status')) ||
    !isText(get(value, 'tegenstander'))
  ) {
    return false
  }

  const formation = get(value, 'formatie')

  if (!record(formation)) {
    return false
  }

  return sides.every((of) => {
    const chosen = get(formation, of)
    const rows = get(value, of)

    return (
      record(chosen) &&
      isText(get(chosen, 'keuze')) &&
      isText(get(chosen, 'eigen')) &&
      record(rows) &&
      rowKinds.every((kind) => {
        const list = get(rows, kind)

        return (
          Array.isArray(list) &&
          list.every((row: unknown) => record(row) && Object.values(row).every((field) => isText(field)))
        )
      })
    )
  })
}

/** Tells the form in this tab that a draft changed. */
function tell() {
  try {
    window.dispatchEvent(new Event(draftEvent))
  } catch {
    // No window (a test of the storage alone).
  }
}
