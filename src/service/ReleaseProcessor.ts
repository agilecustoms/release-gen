import process from 'node:process'
import type { Config, NextRelease, Options, Result } from 'semantic-release'
import type { Release, ReleaseOptions } from '../model.js'
import type { ChangelogGenerator } from './ChangelogGenerator.js'
import type { SemanticReleaseAdapter } from './SemanticReleaseAdapter.js'

export class ReleaseProcessor {
  private semanticReleaseAdapter: SemanticReleaseAdapter
  private changelogGenerator: ChangelogGenerator

  constructor(semanticReleaseAdapter: SemanticReleaseAdapter, changelogGenerator: ChangelogGenerator) {
    this.semanticReleaseAdapter = semanticReleaseAdapter
    this.changelogGenerator = changelogGenerator
  }

  public async process(options: ReleaseOptions): Promise<Release | false> {
    const result: Result = await this.semanticRelease(options)
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

  private async semanticRelease(options: ReleaseOptions): Promise<Result> {
    const opts: Options = {
      dryRun: true,
      tagFormat: options.tagFormat
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
    // it works fine when `release-gen` is used as part of `agilecustoms/publish` action,
    // add this tweak to support integration tests in `release-gen` itself
    if (process.env.REPOSITORY_URL) {
      opts.repositoryUrl = process.env.REPOSITORY_URL
    }

    const config: Config = {
      // cwd is /home/runner/work/_actions/agilecustoms/release-gen/main/dist
      // need to be '/home/runner/work/{repo}/{repo}', like '/home/runner/work/publish/publish'
      cwd: process.env.GITHUB_WORKSPACE
    }

    return await this.semanticReleaseAdapter.run(opts, config)
  }
}
