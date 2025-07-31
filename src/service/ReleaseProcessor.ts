import process from 'node:process'
import type { BranchObject, Config, Options } from 'semantic-release'
import type { ReleaseDetails, ReleaseOptions, SemanticReleaseResult } from '../model.js'
import type { ChangelogGenerator } from './ChangelogGenerator.js'
import type { SemanticReleaseAdapter } from './SemanticReleaseAdapter.js'

const MAINTENANCE_BRANCH = /\d+\.x\.x/
const MINOR_MAINTENANCE_BRANCH = /\d+\.\d+\.x/

export class ReleaseProcessor {
  constructor(
    private readonly semanticReleaseAdapter: SemanticReleaseAdapter,
    private readonly changelogGenerator: ChangelogGenerator
  ) {}

  public async process(options: ReleaseOptions): Promise<false | ReleaseDetails> {
    const result: SemanticReleaseResult = await this.semanticRelease(options)
    if (!result) {
      return false
    }

    const notes = result.nextRelease.notes
    if (!notes) {
      throw new Error('No release notes found in the next release. This is unexpected')
    }

    if (options.changelogFile) {
      await this.changelogGenerator.generate(options.changelogFile, notes, options.changelogTitle)
    }

    const version = result.nextRelease.gitTag
    const branch = result.branch
    const tags = this.getTags(version, branch)
    const gitTags = [...tags]
    // if (branch.channel) {
    //   tags.push(branch.channel)
    // if (branch.channel !== branch.name) {
    //   gitTags.push(branch.channel)
    // }
    // }

    let channel = branch.channel
    if (branch.prerelease) {
      if (!channel || channel.trim() === '') {
        channel = branch.name
      }
    } else if (channel === undefined) {
      const maintenance = branch.range || MINOR_MAINTENANCE_BRANCH.test(branch.name) || MAINTENANCE_BRANCH.test(branch.name)
      if (!maintenance) {
        channel = 'latest'
      }
    }

    if (branch.prerelease) {
      if (branch.channel) {
        tags.push(branch.channel)
      }
    } else {
      if (channel) {
        tags.push(channel)
      }
    }

    if (channel && channel !== branch.name) {
      gitTags.push(channel)
    }

    return {
      channel: channel || '',
      gitTags,
      notes: notes,
      prerelease: Boolean(branch.prerelease),
      tags,
      version
    }
  }

  private async semanticRelease(options: ReleaseOptions): Promise<SemanticReleaseResult> {
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

  private getTags(version: string, branch: BranchObject): string[] {
    const tags = [version]
    if (!branch.prerelease) {
      const minor = version.slice(0, version.lastIndexOf('.'))
      tags.push(minor)
      const range = branch.range || branch.name
      console.error('AlexC range: ', range)
      const minorMaintenance = MINOR_MAINTENANCE_BRANCH.test(range)
      if (!minorMaintenance) {
        const major = minor.slice(0, minor.lastIndexOf('.'))
        tags.push(major)
      }
    }
    return tags
  }
}
