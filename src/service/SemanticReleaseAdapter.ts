import esmock from 'esmock'
import type { Config, Options, PluginSpec, Result } from 'semantic-release'

/**
 * There are 4 default plugins:
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
  public async run(opts: Options, config: Config): Promise<Result> {
    const pluginsPath = 'semantic-release/lib/plugins/index.js'
    const getConfigPath = 'semantic-release/lib/get-config.js'

    const originalPluginsFunc = (await import(pluginsPath)).default
    const getConfig: (context: Config, cliOptions?: Options) => Promise<object> = await esmock(
      getConfigPath,
      {
        [pluginsPath]: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          default: async (context: any, pluginsPath: Record<string, string>) => {
            context.options.plugins = this.fixPlugins(context.options.plugins)
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
    return await semanticRelease(opts, config)
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
