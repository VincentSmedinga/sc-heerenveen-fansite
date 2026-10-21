import { readEnv } from './env'

/**
 * Checks the environment variables when the server starts. When this throws, Next.js logs the error but keeps the
 * server running, and then every request fails. We stop the process instead, so the host reports a site that can't
 * start.
 */
export function checkEnv() {
  try {
    readEnv()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
