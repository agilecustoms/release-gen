import process from 'node:process'
import esmock from 'esmock'
import type { Config, NextRelease, Options, Result } from 'semantic-release'
import type { Release, ReleaseOptions } from '../model.js'
import type { ChangelogGenerator } from './ChangelogGenerator.js'

/**
 * default plugins:
 * "@semantic-release/commit-analyzer"
 * "@semantic-release/release-notes-generator"
 * "@semantic-release/npm"
 * "@semantic-release/github" - creates a GitHub release
 * <br>
 * Only the first two are needed, so specify them explicitly
 */
const plugins = [
  '@semantic-release/commit-analyzer', // https://github.com/semantic-release/commit-analyzer
  '@semantic-release/release-notes-generator', // https://github.com/semantic-release/release-notes-generator
]

export class ReleaseProcessor {
  private changelogGenerator: ChangelogGenerator

  constructor(changelogGenerator: ChangelogGenerator) {
    this.changelogGenerator = changelogGenerator
  }

  public async process(options: ReleaseOptions): Promise<Release | false> {
    const result: Result = await this.semanticRelease(options.tagFormat)
    if (!result) {
      return false
    }

    const nextRelease: NextRelease = result.nextRelease
    const version = nextRelease.gitTag
    if (!version) {
      throw new Error('No version found in the next release. This is unexpected')
    }

    const notes = nextRelease.notes
    if (!notes) {
      throw new Error('No release notes found in the next release. This is unexpected')
    }

    if (options.changelogFile) {
      await this.changelogGenerator.generate(options.changelogFile, notes, options.changelogTitle)
    }

    return {
      nextVersion: version,
      notes
    }
  }

  private async semanticRelease(tagFormat: string): Promise<Result> {
    const opts: Options = {
      branches: ['main', 'master'],
      dryRun: true,
      tagFormat,
      plugins
    }

    // `repositoryUrl` is used in command `git push --dry-run --no-verify ${repositoryUrl} HEAD:${branch}`
    // it has to have a token in it, otherwise `git push --dry-run` will fail
    // it works fine when `release-gen` is used as part of `agilecustoms/publish` action
    // add this tweak to support integration test in `release-gen` itself
    if (process.env.REPOSITORY_URL) {
      opts.repositoryUrl = process.env.REPOSITORY_URL
    }

    const config: Config = {
      // cwd is /home/runner/work/_actions/agilecustoms/release-gen/main/dist
      // need to be '/home/runner/work/{repo}/{repo}', like '/home/runner/work/publish/publish'
      cwd: process.env.GITHUB_WORKSPACE
    }

    const getConfigPath = 'semantic-release/lib/get-config.js'
    const getConfig = (await import(getConfigPath)).default
    const semanticRelease: (options: Options, environment?: Config) => Promise<Result> = await esmock(
      'semantic-release',
      {
        [getConfigPath]: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          default: async (context: any, cliOptions: any) => {
            const config = await getConfig(context, cliOptions)
            console.log('Victory: ' + JSON.stringify(config, null, 2))
            return config
          },
        },
      }
    )
    return await semanticRelease(opts, config)
  }
}
