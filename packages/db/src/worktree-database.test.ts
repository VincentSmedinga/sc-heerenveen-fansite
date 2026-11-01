import { describe, expect, it } from 'vitest'

import { scratchDatabaseName } from './test-database.ts'
import { worktreeDatabaseName } from './worktree-database.ts'

describe('scratchDatabaseName', () => {
  it('has no worktree in it for the database fansite', () => {
    expect(scratchDatabaseName('test', 'mysql://root@127.0.0.1:3306/fansite')).toMatch(/^fansite_test_[0-9a-f]{12}$/)
    expect(scratchDatabaseName('smoke', 'mysql://root@127.0.0.1:3306/fansite')).toMatch(/^fansite_smoke_[0-9a-f]{12}$/)
  })

  it('has the worktree in it, and something unique per run', () => {
    const url = 'mysql://root@127.0.0.1:3306/fansite_514_worktree_env'
    const first = scratchDatabaseName('test', url)

    expect(first).toMatch(/^fansite_test_514_worktree_env_[0-9a-f]{12}$/)
    expect(scratchDatabaseName('test', url)).not.toBe(first)
  })

  it('stays within the 64 characters of MariaDB, whatever the name of the database', () => {
    const name = scratchDatabaseName('smoke', `mysql://root@127.0.0.1:3306/fansite_${'a'.repeat(50)}`)

    expect(name.length).toBeLessThanOrEqual(64)
  })
})

describe('worktreeDatabaseName', () => {
  it('takes the name of a worktree database', () => {
    expect(worktreeDatabaseName('mysql://root@127.0.0.1:3306/fansite_514_worktree_env')).toBe(
      'fansite_514_worktree_env',
    )
  })

  it('leaves fansite and other databases alone', () => {
    for (const name of ['fansite', 'mysql', 'other', 'fansite_', 'Fansite_x', 'fansite_a-b']) {
      expect(() => worktreeDatabaseName(`mysql://root@127.0.0.1:3306/${name}`), name).toThrow(/leaves it alone/)
    }
  })
})
