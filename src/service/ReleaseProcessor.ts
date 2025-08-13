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
    const { stdout } = await exec('git rev-parse --abbrev-ref HEAD', { cwd: options.cwd })
    const currentBranch = stdout.trim()

    if (options.version) {
      return this.explicitVersion(options, currentBranch)
    }

    if (options.versionBump && !VERSION_BUMP_OPTIONS.includes(options.versionBump)) {
      throw new ReleaseError(`Invalid version-bump option: ${options.versionBump}. Valid options are: ${VERSION_BUMP_OPTIONS.join(', ')}`)
    }

    let result: SemanticReleaseResult
    try {
      result = await this.semanticRelease(options, currentBranch)
    } catch (e) {
      this.handleError(e)
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
        result = await this.semanticRelease(options, currentBranch)
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

    const branch = result.branch
    // if a channel has ${name} placeholder, the result.nextRelease.channel has processed value, so use it
    if (branch.channel && result.nextRelease.channel) {
      branch.channel = result.nextRelease.channel
    }
    // first, infer the channel. It is used later to determine tags, gitTags and also as separate output for 'git notes'
    // special rules apply for prerelease
    let channel = branch.channel
    if (!channel || channel.trim() === '') {
      const maintenance = branch.range || MINOR_MAINTENANCE_BRANCH.test(branch.name) || MAINTENANCE_BRANCH.test(branch.name)
      channel = branch.prerelease || maintenance ? branch.name : 'latest'
    }

    // second: infer gitTags - basically split the version tag and add a channel from a prev step
    const version = result.nextRelease.gitTag
    const tags = [version]
    const gitTags = [version]
    if (options.floatingTags) {
      this.addTags(tags, gitTags, version, branch)
      if ((branch.channel || branch.channel === undefined) && channel !== branch.name) {
        gitTags.push(channel)
      }

      // lastly, determine the tags
      if (branch.channel || (branch.channel === undefined && channel === 'latest')) {
        tags.push(channel)
      }
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

  private explicitVersion(options: ReleaseOptions, currentBranch: string): ReleaseDetails {
    let channel = options.releaseChannel
    if (channel === false) {
      channel = currentBranch
    } else if (!channel) {
      channel = 'latest'
    }

    const version = options.version!
    const tags = [version]
    const gitTags = [version]
    if (options.floatingTags) {
      let tag = version
      for (let lastDotIndex; (lastDotIndex = tag.lastIndexOf('.')) !== -1;) {
        tag = tag.slice(0, lastDotIndex)
        tags.push(tag)
        gitTags.push(tag)
      }

      if (options.releaseChannel !== false) {
        tags.push(channel)
        if (channel !== currentBranch) {
          gitTags.push(channel)
        }
      }
    }

    return {
      channel,
      gitTags,
      notesTmpFile: '',
      prerelease: false,
      tags,
      version
    }
  }

  private handleError(e: unknown): void {
    if (!(e instanceof Error)) {
      return
    }
    if ('code' in e) {
      // const details = 'details' in e ? e.details : e.message
      // this error originates not from semantic-release, but from deeper code. it has no 'details' property
      if (e.code === 'MODULE_NOT_FOUND') {
        throw new ReleaseError(`You're using non default preset, please specify corresponding npm package in npm-extra-deps input. Details: ${e.message}`)
      }
      // rest of errors are from semantic-release, they have 'code', 'message' and 'details' properties
      // some have useful 'message' and 'details', others don't, see `errors.js` in semantic-release code
      if (e.code === 'EGITNOPERMISSION') { // 'message' and 'details' not helpful
        throw new ReleaseError('Not enough permission to push to remote repo. When release from protected branch, '
          + 'you need PAT token issued by person with permission to bypass branch protection rules')
      }
    }
    // weirdly but error EINVALIDTAGFORMAT has no code, so had to sniff by message
    if (e.message.includes('Invalid `tagFormat` option')) {
      throw new ReleaseError('Invalid tag format (tag-format input or tagFormat in .releaserc.json)')
    }
  }

  private async semanticRelease(options: ReleaseOptions, currentBranch: string): Promise<SemanticReleaseResult> {
    const opts: Options = {
      dryRun: true
    }
    opts['currentBranch'] = currentBranch
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

  private addTags(tags: string[], gitTags: string[], version: string, branch: BranchObject): void {
    if (!branch.prerelease) {
      const minor = version.slice(0, version.lastIndexOf('.'))
      tags.push(minor)
      gitTags.push(minor)
      const range = branch.range || branch.name
      const minorMaintenance = MINOR_MAINTENANCE_BRANCH.test(range)
      if (!minorMaintenance) {
        const major = minor.slice(0, minor.lastIndexOf('.'))
        tags.push(major)
        gitTags.push(major)
      }
    }
  }
}
