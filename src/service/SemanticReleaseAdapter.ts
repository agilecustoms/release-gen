import esmock from 'esmock'
import type { BranchSpec, Config, Options, PluginSpec, Result } from 'semantic-release'
import type { SemanticReleaseResult } from '../model.js'

/**
 * There are 4 default plugins:<br>
 * First two are used by `release-gen`
 * Next two are discarded silently as they could come from default configuration
 * Any other plugin is shows warning
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
    let prerelease: boolean = false
    let minorMaintenance: boolean = false

    const originalPluginsFunc = (await import(pluginsPath)).default
    const getConfig: (context: Config, cliOptions?: Options) => Promise<object> = await esmock(
      getConfigPath,
      {
        [pluginsPath]: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          default: async (context: any, pluginsPath: Record<string, string>) => {
            const options = context.options
            prerelease = this.isPrerelease(options.branches, currentBranch)
            if (!prerelease) {
              minorMaintenance = this.isMinorMaintenance(options.branches, currentBranch)
            }
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
    const result = await semanticRelease(opts, config)
    return result ? { ...result, prerelease, minorMaintenance } : result
  }

  public isPrerelease(branches: BranchSpec[], branch: string): boolean {
    return branches.some((branchSpec) => {
      return typeof branchSpec === 'object' && branchSpec.name === branch && branchSpec.prerelease === true
    })
  }

  public isMinorMaintenance(branches: BranchSpec[], branch: string): boolean {
    let range = ''
    for (const spec of branches) {
      if (spec === branch) {
        range = branch
        break
      }
      if (typeof spec === 'object' && spec.name === branch) {
        range = spec.range || spec.name
        break
      }
    }
    return /\d+\.\d+\.x/.test(range)
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
