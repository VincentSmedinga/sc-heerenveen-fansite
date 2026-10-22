// Next.js calls this once when the server starts, and answers no request until it is done. The work lives in its own file,
// so the Edge build doesn't see the Node API it uses.
export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { checkEnv, prepareDatabaseOnStart } = await import('./instrumentation-node')

    await prepareDatabaseOnStart(checkEnv())
  }
}
