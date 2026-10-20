import type * as z from 'zod'

type EnvSource = Record<string, string | undefined>

/**
 * Checks environment variables against a schema when an app starts. Throws one error that lists every missing or
 * invalid variable, so a fresh clone stops with a clear list instead of failing halfway through a request.
 *
 * An empty value counts as missing, because a copy of `.env.example` has every name but no values yet. The error
 * never repeats a value, since it may be a secret. That's also why a transform in the schema should report a problem
 * with `ctx.addIssue()` rather than throw: a thrown error, like the one from `JSON.parse`, passes through as it is and
 * may quote the value.
 */
export function parseEnv<Schema extends z.ZodObject>(schema: Schema, source: EnvSource): z.output<Schema> {
  const filled = Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined && value !== ''))
  const result = schema.safeParse(filled)

  if (result.success) {
    return result.data
  }

  const problems = result.error.issues.map((issue) => {
    const [variable] = issue.path

    if (variable === undefined) {
      return `- ${issue.message}`
    }

    const name = issue.path.map(String).join('.')

    return Object.hasOwn(filled, variable) ? `- ${name}: ${issue.message}` : `- ${name} is missing`
  })

  throw new Error(
    ['Environment variables are missing or invalid. See .env.example for what each one is for.', ...problems].join(
      '\n',
    ),
  )
}
