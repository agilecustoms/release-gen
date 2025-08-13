import esmock from 'esmock'
import type { BranchObject, BranchSpec, Config, Options, PluginSpec, Result } from 'semantic-release'
import { ReleaseError, type SemanticReleaseResult } from '../model.js'

/**
 * There are 4 default plugins:<br>
 * First two are used by `release-gen`
 * Next two are discarded silently as they could come from the default configuration
 * Any other plugin shows a warning
 */
const allowedPlugins = [
  '@semantic-release/commit-analyzer', // https://github.com/semantic-release/commit-analyzer
  '@semantic-release/release-notes-generator', // https://github.com/semantic-release/release-notes-generator
]
const defaultPlugins = [
  '@semantic-release/npm',
  '@semantic-release/github', // creates a GitHub release
]

export class SemanticReleaseAdapter {
  public async run(opts: Options, config: Config): Promise<SemanticReleaseResult> {
    const pluginsPath = 'semantic-release/lib/plugins/index.js'
    const getConfigPath = 'semantic-release/lib/get-config.js'

    const currentBranch = opts['currentBranch'] as string
    let branch: BranchObject = { name: currentBranch }

    const originalPluginsFunc = (await import(pluginsPath)).default
    const getConfig: (context: Config, cliOptions?: Options) => Promise<object> = await esmock(
      getConfigPath,
      {
        [pluginsPath]: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          default: async (context: any, pluginsPath: Record<string, string>) => {
            const options = context.options
            branch = this.findBranch(options.branches, currentBranch)
            options.plugins = this.fixPlugins(options.plugins)
            return await originalPluginsFunc(context, pluginsPath)
          }
        }
      }
    )

    const semanticRelease: (options: Options, environment?: Config) => Promise<Result> = await esmock(
      'semantic-release',
      {
        [getConfigPath]: {
          default: async (context: Config, cliOptions?: Options) => {
            return await getConfig(context, cliOptions)
          },
        },
      }
    )
    const result: Result = await semanticRelease(opts, config)
    if (!result) {
      return false
    }

    return { ...result, branch } // channel, prerelease, gitTags, tags }
  }

  public findBranch(branches: BranchSpec[], branch: string): BranchObject {
    for (const spec of branches) {
      if (spec === branch) {
        return { name: branch }
      }
      if (typeof spec === 'object' && spec.name === branch) {
        return { ...spec } // clone the object to avoid mutation
      }
    }
    throw new ReleaseError(`Branch "${branch}" not found in branches: ${JSON.stringify(branches)}`)
  }

  public fixPlugins(plugins: ReadonlyArray<PluginSpec>): ReadonlyArray<PluginSpec> {
    return plugins.filter((plugin) => {
      const name = typeof plugin === 'string' ? plugin : plugin[0]
      if (allowedPlugins.includes(name)) {
        return true
      }
      if (!defaultPlugins.includes(name)) {
        console.warn(`Plugin "${name}" is not supported by in "release-gen" action, skipping it`)
      }
      return false
    })
  }
}
