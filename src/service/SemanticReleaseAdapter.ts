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

const MAINTENANCE_BRANCH = /\d+\.\d+\.x/
const MINOR_MAINTENANCE_BRANCH = /\d+\.x\.x/

function isMaintenance(branch: string): boolean {
  return MAINTENANCE_BRANCH.test(branch) || MINOR_MAINTENANCE_BRANCH.test(branch)
}

export class SemanticReleaseAdapter {
  public async run(opts: Options, config: Config): Promise<SemanticReleaseResult> {
    const pluginsPath = 'semantic-release/lib/plugins/index.js'
    const getConfigPath = 'semantic-release/lib/get-config.js'

    const currentBranch = opts['currentBranch'] as string
    let channel: undefined | string
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
            channel = this.getChannel(options.branches, currentBranch)
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
    if (!result) {
      return false
    }
    const tag = result.nextRelease.gitTag
    const gitTags = this.getGitTags(tag, prerelease, minorMaintenance)
    return { ...result, channel, prerelease, gitTags }
  }

  private getGitTags(tag: string, prerelease: boolean, minorMaintenance: boolean): string[] {
    if (prerelease) {
      return [tag]
    }
    const minor = tag.slice(0, tag.lastIndexOf('.'))
    if (minorMaintenance) {
      return [tag, minor]
    }
    const major = minor.slice(0, minor.lastIndexOf('.'))
    return [tag, minor, major]
  }

  public getChannel(branches: BranchSpec[], branch: string): string | undefined {
    for (const spec of branches) {
      if (spec === branch) {
        return isMaintenance(branch) ? undefined : 'latest' // default channel for the branch
      }
      if (typeof spec === 'object' && spec.name === branch) {
        if (spec.prerelease) {
          return spec.channel || branch
        }
        if ('channel' in spec) {
          return spec.channel || undefined
        }
        if (spec.range) {
          return undefined
        }
        return 'latest'
      }
    }
    return undefined // no matching branch found
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
    return MAINTENANCE_BRANCH.test(range)
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
