import type { BranchObject } from 'semantic-release'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import type { ReleaseDetails, ReleaseOptions } from '../../src/model.js'
import { ChangelogGenerator } from '../../src/service/ChangelogGenerator.js'
import { ReleaseProcessor } from '../../src/service/ReleaseProcessor.js'
import { SemanticReleaseAdapter } from '../../src/service/SemanticReleaseAdapter.js'

const semanticReleaseAdapter = {
  run: vi.fn()
} as SemanticReleaseAdapter & { run: Mock }

const changelogGenerator = {
  generate: vi.fn()
} as ChangelogGenerator & { generate: Mock }

const OPTIONS = {
  tagFormat: 'v${version}'
} as ReleaseOptions

describe('ReleaseProcessor', () => {
  const processor = new ReleaseProcessor(semanticReleaseAdapter, changelogGenerator)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call semantic-release adapter', async () => {
    await processor.process(OPTIONS)

    expect(semanticReleaseAdapter.run).toHaveBeenCalledOnce()
  })

  it('should pass release branches to semantic-release adapter', async () => {
    const options = { ...OPTIONS, releaseBranches: '["main"]' }

    await processor.process(options)

    const args = semanticReleaseAdapter.run.mock.calls[0]
    expect(args![0].branches).toEqual(['main'])
  })

  it('should throw an error if release branches cannot be parsed', async () => {
    const options = { ...OPTIONS, releaseBranches: 'invalid-json' }

    await expect(processor.process(options)).rejects.toThrow('Failed to parse releaseBranches: invalid-json')
  })

  it('should pass release plugins to semantic-release adapter', async () => {
    const options = { ...OPTIONS, releasePlugins: '["@semantic-release/commit-analyzer"]' }

    await processor.process(options)

    const args = semanticReleaseAdapter.run.mock.calls[0]
    expect(args![0].plugins).toEqual(['@semantic-release/commit-analyzer'])
  })

  it('should throw an error if release plugins cannot be parsed', async () => {
    const options = { ...OPTIONS, releasePlugins: 'invalid-json' }

    await expect(processor.process(options)).rejects.toThrow('Failed to parse releasePlugins: invalid-json')
  })

  it('should return false if semantic-release returns false', async () => {
    semanticReleaseAdapter.run.mockResolvedValue(false)

    const result = await processor.process(OPTIONS)

    expect(result).toBe(false)
  })

  it('should throw an error if next release has no notes', async () => {
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.0.0', notes: '' }
    })

    await expect(processor.process(OPTIONS)).rejects.toThrow('No release notes found in the next release. This is unexpected')
  })

  it('should generate changelog if changelogFile is provided', async () => {
    const options = { ...OPTIONS, changelogFile: 'CHANGELOG.md', changelogTitle: 'Changelog' }
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.0.0', notes: 'Release notes' },
      branch: { name: 'main' }
    })

    await processor.process(options)

    expect(changelogGenerator.generate).toHaveBeenCalledWith('CHANGELOG.md', 'Release notes', 'Changelog')
  })

  it('should return release with nextVersion and notes', async () => {
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.0.0', notes: 'Release notes' },
      branch: { name: 'main' }
    })

    const result = await processor.process(OPTIONS)

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
      const result = await processor.process({ branchName: '', cwd: '' })
      expect(result).toBeTruthy()
      return result as ReleaseDetails
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
  })
})
