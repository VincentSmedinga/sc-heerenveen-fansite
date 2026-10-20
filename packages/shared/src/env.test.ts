import { describe, expect, it } from 'vitest'
import * as z from 'zod'

import { parseEnv } from './env.ts'

const schema = z.object({
  DATABASE_URL: z.url(),
  IMPORT_INTERVAL_MINUTES: z.coerce.number().int().positive(),
  LOG_LEVEL: z.enum(['debug', 'info']).default('info'),
})

function errorMessage(callback: () => unknown): string {
  try {
    callback()
  } catch (error) {
    return error instanceof Error ? error.message : String(error)
  }

  throw new Error('Expected the callback to throw')
}

describe('parseEnv', () => {
  it('returns the parsed values and leaves out other variables', () => {
    const env = parseEnv(schema, {
      DATABASE_URL: 'postgres://localhost:5432/fansite',
      IMPORT_INTERVAL_MINUTES: '15',
      PATH: '/usr/bin',
    })

    expect(env).toEqual({
      DATABASE_URL: 'postgres://localhost:5432/fansite',
      IMPORT_INTERVAL_MINUTES: 15,
      LOG_LEVEL: 'info',
    })
  })

  it('names every missing variable in one error', () => {
    const message = errorMessage(() => parseEnv(schema, {}))

    expect(message).toContain('- DATABASE_URL is missing\n- IMPORT_INTERVAL_MINUTES is missing')
    expect(message).not.toContain('LOG_LEVEL')
  })

  it('counts an empty value as missing', () => {
    const message = errorMessage(() => parseEnv(schema, { DATABASE_URL: '', IMPORT_INTERVAL_MINUTES: '15' }))

    expect(message).toContain('- DATABASE_URL is missing')
  })

  it('says why a value is invalid without repeating it', () => {
    const message = errorMessage(() =>
      parseEnv(schema, { DATABASE_URL: 'not a url', IMPORT_INTERVAL_MINUTES: '-5', LOG_LEVEL: 'loud' }),
    )

    expect(message).toMatch(/- DATABASE_URL: .+\n- IMPORT_INTERVAL_MINUTES: .+\n- LOG_LEVEL: .+/)
    expect(message).not.toMatch(/not a url|-5|loud/)
  })

  it('names the variable of a nested problem without calling it missing', () => {
    const nested = z.object({
      SOURCES: z
        .string()
        .transform((value): unknown => JSON.parse(value))
        .pipe(z.object({ limit: z.number() })),
    })
    const message = errorMessage(() => parseEnv(nested, { SOURCES: '{"limit":"ten"}' }))

    expect(message).toMatch(/- SOURCES\.limit: .+/)
    expect(message).not.toContain('is missing')
  })
})
