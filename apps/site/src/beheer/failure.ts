/**
 * The line in the server log when an action in Beheer fails (#1176): what failed, with the id
 * of what was changed, and the kind of error. Never the message of the error: Drizzle puts the
 * query with all its values in it, and MariaDB can quote a value, such as a birth date or an
 * address.
 */
export function adminFailure(what: string, error: unknown): string {
  return `Could not ${what}: ${kindOf(error)}`
}

/**
 * The kind of an error, for the log: the code that MariaDB gives (`ER_DUP_ENTRY`), from the
 * error or from one of its causes, and otherwise the name of the error (`TypeError`).
 */
export function kindOf(error: unknown): string {
  let current: unknown = error
  let name = 'unknown error'

  for (let depth = 0; current instanceof Error && depth < 5; depth += 1) {
    const { code } = current as { code?: unknown }

    if (typeof code === 'string' && code !== '') {
      return code
    }

    name = current.name
    current = current.cause
  }

  return name
}
