import { readFile } from 'node:fs/promises'
import path from 'node:path'

/**
 * Reads the manifests of the published Storybook from its folder on disk, in place of the
 * provider that comes with `@storybook/mcp`: that one fetches from the address of the request,
 * so a request with another `Host` header would make the server fetch from another host. This
 * one reads only `.json` files under `manifests/` in the folder, reads them again for every
 * request, and so shows a new deploy as soon as rsync has replaced the files.
 *
 * `manifestsPath` is what the library asks for: `./manifests/components.json`,
 * `./manifests/docs.json`, and any file those refer to.
 */
export function createManifestProvider(storybookDir: string) {
  const root = path.resolve(storybookDir)
  const manifestsDir = path.join(root, 'manifests')

  return async function manifestProvider(_request: Request | undefined, manifestsPath: string): Promise<string> {
    const file = path.resolve(root, manifestsPath)

    // The error names the path the library asked for, never the folder on the host.
    if (!file.startsWith(manifestsDir + path.sep) || path.extname(file) !== '.json') {
      throw new Error(`Not a manifest: ${manifestsPath}`)
    }

    try {
      return await readFile(file, 'utf8')
    } catch {
      throw new Error(`Manifest not found: ${manifestsPath}`)
    }
  }
}
