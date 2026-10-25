import type { Database } from '@fansite/db/client'

import { adminRoles } from '@fansite/db/schema'

import { createAccount, isAdminRole, normaliseEmail, revokeAccount } from './accounts.ts'

const usage = [
  'Usage:',
  `  admin create <email address> <role: ${adminRoles.join(' or ')}>`,
  '  admin revoke <email address>',
].join('\n')

/**
 * Runs one of the commands that manage the accounts of the admin, and returns the exit code: 0
 * when it did what was asked, 1 when it did nothing because of the state of the accounts, and 2
 * when the command is wrong. It tells the owner what happened. `pnpm admin:create` and `pnpm
 * admin:revoke` run it locally, and the file that `assemble` makes runs it on the host (see
 * docs/acceptatieomgeving.md).
 */
export async function runAdminCommand(db: Database, args: readonly string[], now = new Date()) {
  const [command, address, role, ...rest] = args
  const email = address === undefined ? undefined : normaliseEmail(address)

  if (command === 'create' && email !== undefined && role !== undefined && isAdminRole(role) && rest.length === 0) {
    const result = await createAccount(db, email, role, now)

    console.log(
      {
        created: `Made the account for ${email}, as ${role}.`,
        enabled: `The account for ${email} was turned off. It is on again, as ${role}.`,
        exists: `${email} has an account already. Nothing changed.`,
      }[result],
    )

    return result === 'exists' ? 1 : 0
  }

  if (command === 'revoke' && email !== undefined && role === undefined) {
    const { result, sessions } = await revokeAccount(db, email, now)

    console.log(
      {
        'already-off': `The account for ${email} was turned off already. Its sessions are gone.`,
        revoked: `Turned off the account for ${email} and ended ${sessions} ${sessions === 1 ? 'session' : 'sessions'}.`,
        unknown: `There is no account for ${email}.`,
      }[result],
    )

    return result === 'unknown' ? 1 : 0
  }

  console.error(usage)

  return 2
}
