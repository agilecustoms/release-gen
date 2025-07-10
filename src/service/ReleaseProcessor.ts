import type { Config, NextRelease, Options, Result } from 'semantic-release'
import semanticRelease from 'semantic-release'
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
const PLUGINS = [
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
      dryRun: true,
      tagFormat,
      PLUGINS
    }

    const config: Config = {
      // cwd is /home/runner/work/_actions/agilecustoms/release-gen/main/dist
      // need to '/home/runner/work/publish/publish'
    }
    console.log('config:', config)

    try {
      return await semanticRelease(opts)// , config)
    } catch (e) {
      // @ts-expect-error do not know how to overcome this TS compilation error
      if (e.command.startsWith('git fetch --tags')) {
        throw new Error('git fetch --tags failed. Run `git fetch --tags --force` manually to update the tags.', { cause: e })
      }
      throw e
    }
  }
}
