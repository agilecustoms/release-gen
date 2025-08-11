import fs from 'node:fs/promises'
import process from 'node:process'
import type { BranchObject, Config, Options } from 'semantic-release'
import { type ReleaseDetails, ReleaseError, type ReleaseOptions, type SemanticReleaseResult } from '../model.js'
import { exec } from '../utils.js'
import type { ChangelogGenerator } from './ChangelogGenerator.js'
import type { GitClient } from './GitClient.js'
import type { SemanticReleaseAdapter } from './SemanticReleaseAdapter.js'

const MAINTENANCE_BRANCH = /\d+\.x\.x/
const MINOR_MAINTENANCE_BRANCH = /\d+\.\d+\.x/
const VERSION_BUMP_OPTIONS = ['default-minor', 'default-patch']

export class ReleaseProcessor {
  constructor(
    private readonly semanticReleaseAdapter: SemanticReleaseAdapter,
    private readonly changelogGenerator: ChangelogGenerator,
    private readonly gitClient: GitClient
  ) {}

  public async process(options: ReleaseOptions): Promise<ReleaseDetails> {
    if (options.versionBump && !VERSION_BUMP_OPTIONS.includes(options.versionBump)) {
      throw new ReleaseError(`Invalid version-bump option: ${options.versionBump}. Valid options are: ${VERSION_BUMP_OPTIONS.join(', ')}`)
    }

    let result: SemanticReleaseResult
    try {
      result = await this.semanticRelease(options)
    } catch (e) {
      if (e instanceof Error && 'code' in e) {
        const details = 'details' in e ? e.details : e.message
        if (e.code === 'MODULE_NOT_FOUND') {
          throw new ReleaseError(`You're using non default preset, please specify corresponding npm package in npm-extra-deps input.\n`
            + `Details: ${details}`, { cause: e })
        }
        if (e.code === 'EGITNOPERMISSION') {
          throw new ReleaseError(`Not enough permission to push to remote repo. When release from protected branch, `
            + `you need PAT token issued by person with permission to bypass branch protection rules.\n`
            + `Details: ${details}`, { cause: e })
        }
      }
      throw e
    }

    let notesTmpFile = options.notesTmpFile
    let notes: string | undefined = undefined
    if (result) {
      notes = result.nextRelease.notes
      if (!result.nextRelease.notes) {
        throw new ReleaseError('No release notes found in the next release. This is unexpected')
      }
    } else { // if no semantic commits that increase version, then semantic-release returns empty result (no error!)
      if (!options.versionBump) {
        throw new ReleaseError('Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)')
      }

      const commitType = options.versionBump === 'default-minor' ? 'feat' : 'fix'
      try {
        await this.gitClient.commit(commitType)
        result = await this.semanticRelease(options)
        if (!result) {
          throw new ReleaseError('Unable to generate new version even with "version-bump", could be present that doesn\'t respect feat: prefix')
        }
      } finally {
        await this.gitClient.revert()
      }
    }

    if (notes) {
      if (options.changelogFile) {
        await this.changelogGenerator.generate(options.changelogFile, notes, options.changelogTitle)
      }

      await fs.writeFile(notesTmpFile, notes, 'utf8')
    } else {
      notesTmpFile = ''
    }

    // first, infer the channel. It is used later to determine tags, gitTags and also as separate output for 'git notes'
    // special rules apply for prerelease
    const branch = result.branch
    let channel = branch.channel
    if (!channel || channel.trim() === '') {
      const maintenance = branch.range || MINOR_MAINTENANCE_BRANCH.test(branch.name) || MAINTENANCE_BRANCH.test(branch.name)
      channel = branch.prerelease || maintenance ? branch.name : 'latest'
    }

    // second: infer gitTags - basically split the version tag and add a channel from a prev step
    const version = result.nextRelease.gitTag
    const tags = this.getTags(version, branch)
    const gitTags = [...tags]
    if ((branch.channel || branch.channel === undefined) && channel !== branch.name) {
      gitTags.push(channel)
    }

    // lastly, determine the tags
    if (branch.channel || (branch.channel === undefined && channel === 'latest')) {
      tags.push(channel)
    }

    return {
      channel,
      gitTags,
      notesTmpFile,
      prerelease: Boolean(branch.prerelease),
      tags,
      version
    }
  }

  private async semanticRelease(options: ReleaseOptions): Promise<SemanticReleaseResult> {
    const opts: Options = {
      dryRun: true
    }
    const { stdout } = await exec('git rev-parse --abbrev-ref HEAD', { cwd: options.cwd })
    opts['currentBranch'] = stdout.trim()
    if (options.tagFormat) {
      opts.tagFormat = options.tagFormat
    }
    if (options.releaseBranches) {
      try {
        opts.branches = JSON.parse(options.releaseBranches)
      } catch (cause) {
        throw new ReleaseError(`Failed to parse releaseBranches: ${options.releaseBranches}`, { cause })
      }
    }
    if (options.releasePlugins) {
      try {
        opts.plugins = JSON.parse(options.releasePlugins)
      } catch (cause) {
        throw new ReleaseError(`Failed to parse releasePlugins: ${options.releasePlugins}`, { cause })
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
      const minorMaintenance = MINOR_MAINTENANCE_BRANCH.test(range)
      if (!minorMaintenance) {
        const major = minor.slice(0, minor.lastIndexOf('.'))
        tags.push(major)
      }
    }
    return tags
  }
}
