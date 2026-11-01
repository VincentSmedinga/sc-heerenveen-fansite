import { describe, expect, it } from 'vitest'

import { readAlertEnv } from './mail-env.ts'

describe('readAlertEnv', () => {
  it('reads one address, or a name followed by an address', () => {
    expect(readAlertEnv({ ALERT_MAIL_TO: 'eigenaar@example.org' })).toEqual({ ALERT_MAIL_TO: 'eigenaar@example.org' })
    expect(readAlertEnv({ ALERT_MAIL_TO: 'Eigenaar <eigenaar@example.org>' })).toEqual({
      ALERT_MAIL_TO: 'Eigenaar <eigenaar@example.org>',
    })
  })

  it('does not need it: empty and missing are the same', () => {
    expect(readAlertEnv({})).toEqual({})
    expect(readAlertEnv({ ALERT_MAIL_TO: '' })).toEqual({})
  })

  it('refuses two recipients or a new line, without repeating the value', () => {
    for (const value of [
      'a@example.org, b@example.org',
      'a@example.org;b@example.org',
      'a@example.org\nBcc: b@example.org',
    ]) {
      expect(() => readAlertEnv({ ALERT_MAIL_TO: value })).toThrow('- ALERT_MAIL_TO: must be an email address')
      expect(() => readAlertEnv({ ALERT_MAIL_TO: value })).not.toThrow(/b@example/)
    }
  })
})
