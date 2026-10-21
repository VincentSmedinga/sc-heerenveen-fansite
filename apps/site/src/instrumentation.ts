// Next.js calls this once when the server starts. The check lives in its own file, so the Edge build doesn't see the Node
// API it uses.
export async function register() {
  if (process.env['NEXT_RUNTIME'] === 'nodejs') {
    const { checkEnv } = await import('./instrumentation-node')

    checkEnv()
  }
}
