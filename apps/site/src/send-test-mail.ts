// The command that sends one test mail, for the owner to see that mail leaves the site (see docs/acceptatieomgeving.md).
// `pnpm --filter site assemble` bundles it into apps/site/send-test-mail.mjs, which runs on the host with the settings of
// the mail server in the environment, as `node --env-file=<file> send-test-mail.mjs <address>`. It runs as soon as it
// loads, like the import command, and says nothing about the settings or the address except what is wrong with them.
import { readMailEnv } from './env'
import { MailError, sendMail } from './mail'

/** Sends the test mail, and returns the exit code. */
async function sendTestMail(to: string) {
  try {
    await sendMail({
      subject: 'Proefmail van de sc Heerenveen Fansite',
      text: 'Dit is een proefmail. Ontvang je hem, dan kan de site mailen. Je hoeft niets te doen.\n',
      to,
    })

    // Without settings, which only the local environment allows, sendMail has logged the mail instead.
    if (readMailEnv().SMTP_HOST !== undefined) {
      console.log('The mail server took the test mail. Look in the mailbox of the address.')
    }

    return 0
  } catch (error) {
    console.error(error instanceof MailError ? error.message : `Could not send the test mail: ${String(error)}`)

    return 1
  }
}

const [to, ...rest] = process.argv.slice(2)

if (to === undefined || rest.length > 0) {
  console.error('Usage: node send-test-mail.mjs <the address to send the test mail to>')
  process.exitCode = 2
} else {
  void sendTestMail(to).then((code) => {
    process.exitCode = code
  })
}
