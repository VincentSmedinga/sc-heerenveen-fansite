// Asks an MCP server of the design system what an agent asks first, and checks the answers
// against the manifests of the Storybook that it should show. Dependency-free, so the workflow
// runs it right after a deploy, on the real address.
//
//   node scripts/check.js <address of the server> <folder of the Storybook build>
//     [seconds to try]
//
// Fails (exit code 1) if the server doesn't answer, offers other tools than the three for the
// documentation, or leaves a component of the build out of the overview. With a number of
// seconds it tries again until the server answers, because the host starts the app on the first
// request after a restart.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'

let nextId = 1

export async function callTool(url, name, args) {
  const result = await rpc(url, 'tools/call', { arguments: args, name })

  assert.notEqual(result.isError, true, `${name} answered an error: ${result.content?.[0]?.text}`)

  return result.content[0].text
}

/** Throws if the server at `url` doesn't show the components of the build in `storybookDir`. */
export async function check(url, storybookDir) {
  const { components } = JSON.parse(readFileSync(path.join(storybookDir, 'manifests/components.json'), 'utf8'))
  const ids = Object.keys(components)

  assert.ok(ids.length > 0, 'The build has no components to look for')

  const initialized = await rpc(url, 'initialize', {
    capabilities: {},
    clientInfo: { name: 'design-system-check', version: '1' },
    protocolVersion: '2025-06-18',
  })

  assert.ok(initialized.serverInfo, 'initialize answered without serverInfo')

  const { tools } = await rpc(url, 'tools/list', {})

  assert.deepEqual(tools.map((tool) => tool.name).sort(), ['docs-list', 'docs-show', 'docs-show-story'])

  const overview = await callTool(url, 'docs-list', {})
  const missing = ids.filter((id) => !overview.includes(`(${id})`))

  assert.deepEqual(missing, [], `docs-list leaves out ${missing.length} of ${ids.length} components of the build`)

  // One component with props, to show that docs-show reads the manifest and not only the
  // overview.
  const withProps = ids.find((id) => Object.keys(components[id].reactComponentMeta?.props ?? {}).length > 0)

  if (withProps !== undefined) {
    const shown = await callTool(url, 'docs-show', { id: withProps })

    assert.ok(shown.includes('## Props'), `docs-show for ${withProps} gives no props`)

    for (const prop of Object.keys(components[withProps].reactComponentMeta.props)) {
      assert.ok(shown.includes(prop), `docs-show for ${withProps} leaves out the prop ${prop}`)
    }
  }

  return { components: ids.length }
}

const guide = 'docs/designsysteem-publiceren.md, under "Als het niet werkt"'

/**
 * Says what an answer that is not a 200 means and where to look. The app answers with plain
 * text, so any other kind of answer, such as the HTML page of the web server, came from the
 * host and never reached the app.
 */
export function describeAnswer(method, response) {
  const status = response.status
  const contentType = response.headers.get('content-type') ?? 'none'
  const server = response.headers.get('server')
  const seen = `${method} answered ${status} (content-type: ${contentType}${server ? `, server: ${server}` : ''}).`
  const fromApp = contentType.startsWith('text/plain')

  if (fromApp && status >= 500) {
    return `${seen} The app answered with an error. Read stderr.log in domains/ds.heerenveen.org/mcp on the host. See ${guide}, the item about 500 or 503.`
  }

  if (fromApp) {
    return `${seen} The app answered, so the request reached it, but not on a path it serves. Check the address of the app in Setup Node.js App. See ${guide}, the item about 404.`
  }

  if (status === 404) {
    return `${seen} That is the page of the web server, not of the app: the host does not send this address to the Node.js app, or the app does not exist. Check Setup Node.js App on the host (step 7 of "Eenmalig instellen"). See ${guide}, the item about 404.`
  }

  if (status >= 500) {
    return `${seen} The host answered with an error, so the app probably does not start. Read stderr.log in domains/ds.heerenveen.org/mcp. See ${guide}, the item about 500 or 503.`
  }

  return `${seen} See ${guide}.`
}

export async function rpc(url, method, params) {
  const response = await fetch(url, {
    body: JSON.stringify({ id: nextId++, jsonrpc: '2.0', method, params }),
    headers: { accept: 'application/json, text/event-stream', 'content-type': 'application/json' },
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
  })
  const text = await response.text()

  if (response.status !== 200) {
    throw new Error(describeAnswer(method, response))
  }

  // The answer is an event stream with one message, or plain JSON.
  const data = response.headers.get('content-type')?.includes('text/event-stream')
    ? text
        .split('\n')
        .find((line) => line.startsWith('data: '))
        ?.slice('data: '.length)
    : text

  assert.ok(data, `${method} answered without a message`)

  const message = JSON.parse(data)

  assert.equal(message.error, undefined, `${method} answered an error: ${JSON.stringify(message.error)}`)

  return message.result
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [url, storybookDir, seconds = '0'] = process.argv.slice(2)

  if (url === undefined || storybookDir === undefined) {
    console.error(
      'Usage: node scripts/check.js <address of the server> <folder of the Storybook build> [seconds to try]',
    )
    process.exit(2)
  }

  const deadline = Date.now() + Number(seconds) * 1000

  for (;;) {
    try {
      const { components } = await check(url, storybookDir)

      console.log(`${url} answers, and docs-list names all ${components} components of the build.`)
      break
    } catch (error) {
      if (Date.now() >= deadline) {
        const reason = error instanceof Error ? error.message : String(error)

        console.error(`${url} failed the check: ${reason}`)

        if (process.env['GITHUB_ACTIONS'] === 'true') {
          console.error(`::error title=Check ds.heerenveen.org/mcp failed::${url} failed the check: ${reason}`)
        }

        process.exit(1)
      }

      console.log(`${url} does not pass yet: ${error instanceof Error ? error.message : error}`)
      await sleep(5000)
    }
  }
}
