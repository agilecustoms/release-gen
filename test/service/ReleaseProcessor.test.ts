import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Mock } from 'vitest'
import type { ReleaseOptions } from '../../src/model.js'
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
      nextRelease: { gitTag: 'v1.0.0', notes: 'Release notes' }
    })

    await processor.process(options)

    expect(changelogGenerator.generate).toHaveBeenCalledWith('CHANGELOG.md', 'Release notes', 'Changelog')
  })

  it('should return release with nextVersion and notes', async () => {
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.0.0', notes: 'Release notes' }
    })

    const result = await processor.process(OPTIONS)

    expect(result).toBeTruthy()
    if (result) {
      expect(result.gitTag).toBe('v1.0.0')
      expect(result.notes).toBe('Release notes')
    }
  })

  it('should return single git tag for prerelease', async () => {
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.0.0-alpha.1', notes: 'Release notes' },
      prerelease: true
    })

    const result = await processor.process(OPTIONS)

    expect(result).toBeTruthy()
    if (result) {
      expect(result.gitTag).toBe('v1.0.0-alpha.1')
      expect(result.gitTags).toEqual(['v1.0.0-alpha.1'])
      expect(result.prerelease).toBe(true)
    }
  })

  it('should return two tags for minor maintenance', async () => {
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.2.0', notes: 'Release notes' },
      minorMaintenance: true,
      prerelease: false
    })

    const result = await processor.process(OPTIONS)

    expect(result).toBeTruthy()
    if (result) {
      expect(result.gitTag).toBe('v1.2.0')
      expect(result.gitTags).toEqual(['v1.2.0', 'v1.2'])
      expect(result.prerelease).toBe(false)
    }
  })

  it('should return three tags for regular release', async () => {
    semanticReleaseAdapter.run.mockResolvedValue({
      nextRelease: { gitTag: 'v1.2.3', notes: 'Release notes' },
      minorMaintenance: false,
      prerelease: false
    })

    const result = await processor.process(OPTIONS)

    expect(result).toBeTruthy()
    if (result) {
      expect(result.gitTag).toBe('v1.2.3')
      expect(result.gitTags).toEqual(['v1.2.3', 'v1.2', 'v1'])
      expect(result.prerelease).toBe(false)
    }
  })
})
