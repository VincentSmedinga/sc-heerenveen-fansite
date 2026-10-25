import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { createManifestProvider } from './manifests.ts'

const storybookDir = path.resolve(import.meta.dirname, 'fixtures')

describe('the manifest provider', () => {
  const provider = createManifestProvider(storybookDir)

  it('reads the manifests, and the files they refer to', async () => {
    expect(JSON.parse(await provider(undefined, './manifests/components.json'))).toHaveProperty('components')
    expect(JSON.parse(await provider(undefined, './manifests/docs.json'))).toHaveProperty('docs')
  })

  it.each([
    '../index.json',
    './manifests/../index.json',
    './manifests/../../package.json',
    '/etc/passwd',
    './index.json',
    './manifests',
    './manifests/components.html',
    './manifests/components',
    './manifestsx/components.json',
  ])('refuses %s, which is not a .json file under manifests/', async (manifestsPath) => {
    await expect(provider(undefined, manifestsPath)).rejects.toThrow(/^Not a manifest: /)
  })

  it('names the path that was asked for, not the folder on the host, when a manifest is missing', async () => {
    const error = await provider(undefined, './manifests/missing.json').catch((reason: Error) => reason)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).message).toBe('Manifest not found: ./manifests/missing.json')
    expect((error as Error).message).not.toContain(storybookDir)
  })
})
