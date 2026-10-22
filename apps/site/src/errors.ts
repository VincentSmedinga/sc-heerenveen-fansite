/**
 * The first line of an error's message, with the message of its cause, such as `connect ECONNREFUSED 127.0.0.1:3306`.
 * Drizzle's message goes on with the values of the query, which the log doesn't need.
 */
export function reasonOf(error: unknown) {
  if (!(error instanceof Error)) {
    return 'unknown error'
  }

  const cause = error.cause instanceof Error ? ` (${error.cause.message})` : ''

  return `${error.message.split('\n')[0]}${cause}`
}
