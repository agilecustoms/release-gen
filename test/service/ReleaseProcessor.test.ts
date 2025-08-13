import fs from 'node:fs'
import type { BranchObject } from 'semantic-release'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import type { ReleaseDetails, ReleaseOptions } from '../../src/model.js'
import { ChangelogGenerator } from '../../src/service/ChangelogGenerator.js'
import { GitClient } from '../../src/service/GitClient.js'
import { ReleaseProcessor } from '../../src/service/ReleaseProcessor.js'
import { SemanticReleaseAdapter } from '../../src/service/SemanticReleaseAdapter.js'

const semanticReleaseAdapter = {
  run: vi.fn()
} as SemanticReleaseAdapter & { run: Mock }

const changelogGenerator = {
  generate: vi.fn()
} as ChangelogGenerator & { generate: Mock }

const gitClient = {
  commit: vi.fn(),
  revert: vi.fn()
} as GitClient & { commit: Mock, revert: Mock }

const OPTIONS = {
  notesTmpFile: '/tmp/release-gen-notes',
  tagFormat: 'v${version}'
} as ReleaseOptions

type Result = ReleaseDetails & { notes: string }

class ErrorWithCode extends Error {
  code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

describe('ReleaseProcessor', () => {
  const processor = new ReleaseProcessor(semanticReleaseAdapter, changelogGenerator, gitClient)
  async function process(options: ReleaseOptions = OPTIONS): Promise<Result> {
    const notesTmpFile = `/tmp/release-gen-notes-${Math.random().toString(36).slice(2)}`
    options.notesTmpFile = notesTmpFile
    try {
      const res = await processor.process(options)
      const notes = fs.existsSync(notesTmpFile) ? fs.readFileSync(notesTmpFile).toString() : ''
      return { ...res, notes }
    } finally {
      if (fs.existsSync(notesTmpFile)) {
        fs.rmSync(notesTmpFile)
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('errors', () => {
    it('should throw an error if versionBump is invalid', async () => {
      const options = { ...OPTIONS, versionBump: 'invalid-option' }

      await expect(process(options)).rejects.toThrow('Invalid version-bump option: invalid-option. Valid options are: default-minor, default-patch')
    })

    it('should throw clear error if semantic-release thrown error with code MODULE_NOT_FOUND', () => {
      const error = new ErrorWithCode('test', 'MODULE_NOT_FOUND')
      semanticReleaseAdapter.run.mockRejectedValue(error)

      return expect(process()).rejects.toThrow('You\'re using non default preset, please specify corresponding npm package in npm-extra-deps input. Details: test')
    })

    it('should throw clear error if semantic-release thrown error with code EGITNOPERMISSION', () => {
      const error = new ErrorWithCode('test', 'EGITNOPERMISSION')
      semanticReleaseAdapter.run.mockRejectedValue(error)

      return expect(process()).rejects.toThrow('Not enough permission to push to remote repo. When release from protected branch, you need PAT token issued by person with permission to bypass branch protection rules')
    })

    it('should throw clear error if invalid tag format', () => {
      const error = new Error('Invalid `tagFormat` option')
      semanticReleaseAdapter.run.mockRejectedValue(error)

      return expect(process()).rejects.toThrow('Invalid tag format (tag-format input or tagFormat in .releaserc.json)')
    })
  })

  it('should call semantic-release adapter', async () => {
    try {
      await process()
    } catch {}

    expect(semanticReleaseAdapter.run).toHaveBeenCalledOnce()
  })

  it('should pass release branches to semantic-release adapter', async () => {
    const options = { ...OPTIONS, releaseBranches: '["main"]' }

    try {
      await process(options)
    } catch {}

    const args = semanticReleaseAdapter.run.mock.calls[0]
    expect(args![0].branches).toEqual(['main'])
  })

  it('should throw an error if release branches cannot be parsed', async () => {
    const options = { ...OPTIONS, releaseBranches: 'invalid-json' }

    await expect(process(options)).rejects.toThrow('Failed to parse releaseBranches: invalid-json')
  })

  it('should pass release plugins to semantic-release adapter', async () => {
    const options = { ...OPTIONS, releasePlugins: '["@semantic-release/commit-analyzer"]' }

    try {
      await process(options)
    } catch {}

    const args = semanticReleaseAdapter.run.mock.calls[0]
    expect(args![0].plugins).toEqual(['@semantic-release/commit-analyzer'])
  })

  it('should throw an error if release plugins cannot be parsed', async () => {
    const options = { ...OPTIONS, releasePlugins: 'invalid-json' }

    await expect(process(options)).rejects.toThrow('Failed to parse releasePlugins: invalid-json')
  })

  it('should throw ex if semantic-release returns false', async () => {
    semanticReleaseAdapter.run.mockResolvedValue(false)

    await expect(process()).rejects.toThrow('Unable to generate new version, please check PR commits\' messages (or aggregated message if used sqush commits)')
  })

  it('should throw an error if next release has no notes', async () => {
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.0.0', notes: '' }
    })

    await expect(process()).rejects.toThrow('No release notes found in the next release. This is unexpected')
  })

  it('should generate changelog if changelogFile is provided', async () => {
    const options = { ...OPTIONS, changelogFile: 'CHANGELOG.md', changelogTitle: 'Changelog' }
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.0.0', notes: 'Release notes' },
      branch: { name: 'main' }
    })

    await process(options)

    expect(changelogGenerator.generate).toHaveBeenCalledWith('CHANGELOG.md', 'Release notes', 'Changelog')
  })

  it('should return release with nextVersion and notes', async () => {
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.0.0', notes: 'Release notes' },
      branch: { name: 'main' }
    })

    const result = await process()

    expect(result).toBeTruthy()
    if (result) {
      expect(result.version).toBe('v1.0.0')
      expect(result.notes).toBe('Release notes')
    }
  })

  describe('channel and tags inference', () => {
    async function release(version: string, branch: BranchObject): Promise<ReleaseDetails> {
      semanticReleaseAdapter.run.mockResolvedValue({
        nextRelease: { gitTag: version, notes: 'Release notes' },
        branch
      })
      const result = await process()
      expect(result).toBeTruthy()
      return result
    }

    it('minor-maintenance-default-channel', async () => {
      const branch = { name: '1.1.x' }
      const result = await release('1.1.1', branch)
      expect(result.channel).toBe('1.1.x')
      expect(result.gitTags).toEqual(['1.1.1', '1.1'])
      expect(result.tags).toEqual(['1.1.1', '1.1'])
    })

    it('minor-maintenance-branch', async () => {
      const branch = { name: '1.1.x', channel: '1.1.x' }
      const result = await release('1.1.1', branch)
      expect(result.channel).toBe('1.1.x')
      expect(result.gitTags).toEqual(['1.1.1', '1.1'])
      expect(result.tags).toEqual(['1.1.1', '1.1', '1.1.x'])
    })

    it('minor-maintenance-channel', async () => {
      const branch = { name: '1.1.x', channel: 'legacy' }
      const result = await release('1.1.1', branch)
      expect(result.channel).toBe('legacy')
      expect(result.gitTags).toEqual(['1.1.1', '1.1', 'legacy'])
      expect(result.tags).toEqual(['1.1.1', '1.1', 'legacy'])
    })

    it('maintenance-default', async () => {
      const branch = { name: '1.x.x' }
      const result = await release('1.6.0', branch)
      expect(result.channel).toBe('1.x.x')
      expect(result.gitTags).toEqual(['1.6.0', '1.6', '1'])
      expect(result.tags).toEqual(['1.6.0', '1.6', '1'])
    })

    it('maintenance-branch', async () => {
      const branch = { name: '1.x.x', channel: '1.x.x' }
      const result = await release('1.6.0', branch)
      expect(result.channel).toBe('1.x.x')
      expect(result.gitTags).toEqual(['1.6.0', '1.6', '1'])
      expect(result.tags).toEqual(['1.6.0', '1.6', '1', '1.x.x'])
    })

    it('maintenance-channel', async () => {
      const branch = { name: '1.x.x', channel: 'support' }
      const result = await release('1.6.0', branch)
      expect(result.channel).toBe('support')
      expect(result.gitTags).toEqual(['1.6.0', '1.6', '1', 'support'])
      expect(result.tags).toEqual(['1.6.0', '1.6', '1', 'support'])
    })

    it('main-default', async () => {
      const branch = { name: 'main' }
      const result = await release('2.3.0', branch)
      expect(result.channel).toBe('latest')
      expect(result.gitTags).toEqual(['2.3.0', '2.3', '2', 'latest'])
      expect(result.tags).toEqual(['2.3.0', '2.3', '2', 'latest'])
    })

    it('main-no-channel', async () => {
      const branch = { name: 'main', channel: '' }
      const result = await release('2.3.0', branch)
      expect(result.channel).toBe('latest')
      expect(result.gitTags).toEqual(['2.3.0', '2.3', '2'])
      expect(result.tags).toEqual(['2.3.0', '2.3', '2'])
    })

    it('main-branch', async () => {
      const branch = { name: 'main', channel: 'main' }
      const result = await release('2.3.0', branch)
      expect(result.channel).toBe('main')
      expect(result.gitTags).toEqual(['2.3.0', '2.3', '2'])
      expect(result.tags).toEqual(['2.3.0', '2.3', '2', 'main'])
    })

    it('main-channel', async () => {
      const branch = { name: 'main', channel: 'stable' }
      const result = await release('2.3.0', branch)
      expect(result.channel).toBe('stable')
      expect(result.gitTags).toEqual(['2.3.0', '2.3', '2', 'stable'])
      expect(result.tags).toEqual(['2.3.0', '2.3', '2', 'stable'])
    })

    it('prerelease-default', async () => {
      const branch = { name: 'beta', prerelease: true }
      const result = await release('3.0.0-beta.4', branch)
      expect(result.channel).toBe('beta')
      expect(result.gitTags).toEqual(['3.0.0-beta.4'])
      expect(result.tags).toEqual(['3.0.0-beta.4'])
    })

    it('prerelease-no-channel', async () => {
      const branch = { name: 'beta', channel: '', prerelease: true }
      const result = await release('3.0.0-beta.4', branch)
      expect(result.channel).toBe('beta')
      expect(result.gitTags).toEqual(['3.0.0-beta.4'])
      expect(result.tags).toEqual(['3.0.0-beta.4'])
    })

    it('prerelease-branch', async () => {
      const branch = { name: 'beta', channel: 'beta', prerelease: true }
      const result = await release('3.0.0-beta.4', branch)
      expect(result.channel).toBe('beta')
      expect(result.gitTags).toEqual(['3.0.0-beta.4'])
      expect(result.tags).toEqual(['3.0.0-beta.4', 'beta'])
    })

    it('prerelease-channel', async () => {
      const branch = { name: 'beta', channel: 'next', prerelease: true }
      const result = await release('3.0.0-beta.4', branch)
      expect(result.channel).toBe('next')
      expect(result.gitTags).toEqual(['3.0.0-beta.4', 'next'])
      expect(result.tags).toEqual(['3.0.0-beta.4', 'next'])
    })

    it('prerelease-channel-with-placeholder', async () => {
      const branch = { name: 'next', channel: 'release-${name}', prerelease: true }

      semanticReleaseAdapter.run.mockResolvedValue({
        nextRelease: { gitTag: '3.0.0-beta.4', notes: 'Release notes', channel: 'release-next' },
        branch
      })
      const result = await process()
      expect(result.channel).toBe('release-next')
      expect(result.gitTags).toEqual(['3.0.0-beta.4', 'release-next'])
      expect(result.tags).toEqual(['3.0.0-beta.4', 'release-next'])
    })
  })

  describe('version_bump', () => {
    it('should call semantic-release 2 times if first attempt return false', async () => {
      semanticReleaseAdapter.run.mockResolvedValue(false)

      try {
        await process({ ...OPTIONS, versionBump: 'default-minor' })
      } catch {}

      expect(gitClient.commit).toHaveBeenCalled()
      expect(semanticReleaseAdapter.run).toHaveBeenCalledTimes(2)
      expect(gitClient.revert).toHaveBeenCalled()
    })

    it('should throw an error if unable to generate minor version', async () => {
      semanticReleaseAdapter.run.mockResolvedValue(false)

      await expect(process({ ...OPTIONS, versionBump: 'default-minor' })).rejects.toThrow('Unable to generate new version even with "version-bump", could be present that doesn\'t respect feat: prefix')
    })

    it('should return empty release notes', async () => {
      semanticReleaseAdapter.run.mockResolvedValueOnce(false)
      semanticReleaseAdapter.run.mockResolvedValueOnce({
        nextRelease: { gitTag: 'v1.0.0', notes: 'Release notes2' },
        branch: { name: 'main' }
      })

      const result = await process({ ...OPTIONS, versionBump: 'default-patch' })

      expect(result.notes).toBe('')
    })
  })
})
