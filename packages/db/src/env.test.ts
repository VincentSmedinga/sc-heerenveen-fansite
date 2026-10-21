import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { readDatabaseEnv } from './env.ts'

const example = readFileSync(new URL('../../../.env.example', import.meta.url), 'utf8')

describe('readDatabaseEnv', () => {
  it('accepts the DATABASE_URL in .env.example', () => {
    const url = /^DATABASE_URL=(.+)$/m.exec(example)?.[1]

    expect(url).toBeDefined()
    expect(readDatabaseEnv({ DATABASE_URL: url })).toEqual({ DATABASE_URL: url })
  })

  it('stops when DATABASE_URL is missing', () => {
    expect(() => readDatabaseEnv({})).toThrow('- DATABASE_URL is missing')
  })

  it('stops when DATABASE_URL is not a mysql URL', () => {
    expect(() => readDatabaseEnv({ DATABASE_URL: 'postgres://user:secret@localhost:5432/fansite' })).toThrow(
      /- DATABASE_URL: /,
    )
  })

  it('never repeats the value in the message', () => {
    expect(() => readDatabaseEnv({ DATABASE_URL: 'postgres://user:secret@localhost:5432/fansite' })).not.toThrow(
      /secret/,
    )
  })
})
