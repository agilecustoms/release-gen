import process from 'node:process'
import type { Config, NextRelease, Options } from 'semantic-release'
import type { ReleaseOptions, SemanticReleaseResult, TheNextRelease } from '../model.js'
import type { ChangelogGenerator } from './ChangelogGenerator.js'
import type { SemanticReleaseAdapter } from './SemanticReleaseAdapter.js'

export class ReleaseProcessor {
  constructor(
    private readonly semanticReleaseAdapter: SemanticReleaseAdapter,
    private readonly changelogGenerator: ChangelogGenerator
  ) {}

  public async process(options: ReleaseOptions): Promise<false | TheNextRelease> {
    const result: SemanticReleaseResult = await this.semanticRelease(options)
    if (!result) {
      return false
    }

    const nextRelease: NextRelease = result.nextRelease

    const notes = nextRelease.notes
    if (!notes) {
      throw new Error('No release notes found in the next release. This is unexpected')
    }

    if (options.changelogFile) {
      await this.changelogGenerator.generate(options.changelogFile, notes, options.changelogTitle)
    }

    return {
      ...nextRelease,
      gitTags: this.getGitTags(nextRelease.gitTag, result.prerelease),
      prerelease: result.prerelease
    }
  }

  private async semanticRelease(options: ReleaseOptions): Promise<false | SemanticReleaseResult> {
    const opts: Options = {
      dryRun: true
    }
    opts['currentBranch'] = options.branchName
    if (options.tagFormat) {
      opts.tagFormat = options.tagFormat
    }
    if (options.releaseBranches) {
      try {
        opts.branches = JSON.parse(options.releaseBranches)
      } catch (cause) {
        throw new Error(`Failed to parse releaseBranches: ${options.releaseBranches}`, { cause })
      }
    }
    if (options.releasePlugins) {
      try {
        opts.plugins = JSON.parse(options.releasePlugins)
      } catch (cause) {
        throw new Error(`Failed to parse releasePlugins: ${options.releasePlugins}`, { cause })
      }
    }

    // `repositoryUrl` is used in command `git push --dry-run --no-verify ${repositoryUrl} HEAD:${branch}`
    // it has to have a token in it, otherwise `git push --dry-run` will fail
    // it works fine when `release-gen` is used as part of `agilecustoms/release` action,
    // add this tweak to support integration tests in `release-gen` itself
    if (process.env.REPOSITORY_URL) {
      opts.repositoryUrl = process.env.REPOSITORY_URL
    }

    const config: Config = {
      cwd: options.cwd
    }

    return await this.semanticReleaseAdapter.run(opts, config)
  }

  private getGitTags(tag: string, prerelease: boolean): string[] {
    if (prerelease) {
      return [tag]
    }
    const minor = tag.slice(0, tag.lastIndexOf('.'))
    const major = minor.slice(0, minor.lastIndexOf('.'))
    return [tag, minor, major]
  }
}
