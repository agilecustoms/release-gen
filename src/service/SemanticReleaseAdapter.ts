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
    const gitPath = 'semantic-release/lib/git.js'

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
      'semantic-release/index.js',
      {
        [getConfigPath]: {
          default: async (context: Config, cliOptions?: Options) => {
            return await getConfig(context, cliOptions)
          },
        },
        [gitPath]: {
          verifyAuth: async (_: string, __: string, ___: object) => {
            // override with noop to avoid any error
            // (real implementation calls 'git push --dry-run' which causes authorization error)
          }
          // other two functions being used are: getGitHead, getTagHead - I do not override them, so real implementation are used
        }
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

  public fixPlugins(plugins: ReadonlyArray<PluginSpec>): PluginSpec[] {
    const res: PluginSpec[] = []
    for (let plugin of plugins) {
      let name
      if (typeof plugin === 'string') {
        name = plugin
        plugin = [plugin, { }]
      } else {
        name = plugin[0]
      }

      if (!allowedPlugins.includes(name)) {
        if (!defaultPlugins.includes(name)) {
          console.warn(`Plugin "${name}" is not supported by in "release-gen" action, skipping it`)
        }
        continue
      }

      const spec = plugin[1]
      if (!spec.preset) {
        spec.preset = 'conventionalcommits'
      } else if (spec.preset !== 'conventionalcommits') {
        throw new ReleaseError(`Starting from v4 (Feb 1, 2026) only "conventionalcommits" preset supported. Encountered "${spec.preset}"`)
      }
      res.push(plugin)
    }
    return res
  }
}
