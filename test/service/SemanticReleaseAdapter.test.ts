import { beforeEach, describe, it, expect, vi } from 'vitest'
import { SemanticReleaseAdapter } from '../../src/service/SemanticReleaseAdapter.js'

describe('SemanticReleaseAdapter', () => {
  const adapter = new SemanticReleaseAdapter()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getChannel', () => {
    it('maintenance-minor-default', () => {
      const channel = adapter.getChannel(['1.1.x'], '1.1.x')
      expect(channel).toBeUndefined()
    })

    it('maintenance-minor-branch', () => {
      const channel = adapter.getChannel([{ name: '1.1.x', channel: '1.1.x' }], '1.1.x')
      expect(channel).toBe('1.1.x')
    })

    it('maintenance-minor-channel', () => {
      const channel = adapter.getChannel([{ name: '1.1.x', channel: 'legacy' }], '1.1.x')
      expect(channel).toBe('legacy')
    })

    it('maintenance-default', () => {
      const channel = adapter.getChannel(['1.x.x'], '1.x.x')
      expect(channel).toBeUndefined()
    })

    it('maintenance-default2', () => {
      const channel = adapter.getChannel([{ name: 'legacy', range: '1.x.x' }], 'legacy')
      expect(channel).toBeUndefined()
    })

    it('maintenance-branch', () => {
      const channel = adapter.getChannel([{ name: '1.x.x', channel: '1.x.x' }], '1.x.x')
      expect(channel).toBe('1.x.x')
    })

    it('maintenance-channel', () => {
      const channel = adapter.getChannel([{ name: '1.x.x', channel: 'support' }], '1.x.x')
      expect(channel).toBe('support')
    })

    it('release-default', () => {
      const channel = adapter.getChannel(['main'], 'main')
      expect(channel).toBe('latest')
    })

    it('release-branch2', () => {
      const channel = adapter.getChannel([{ name: 'main' }], 'main')
      expect(channel).toBe('latest')
    })

    it('release-no-channel', () => {
      const channel = adapter.getChannel([{ name: 'main', channel: '' }], 'main')
      expect(channel).toBeUndefined()
    })

    it('release-branch', () => {
      const channel = adapter.getChannel([{ name: 'main', channel: 'main' }], 'main')
      expect(channel).toBe('main')
    })

    it('release-channel', () => {
      const channel = adapter.getChannel([{ name: 'main', channel: 'release' }], 'main')
      expect(channel).toBe('release')
    })

    it('prerelease-default', () => {
      const channel = adapter.getChannel([{ name: 'beta', prerelease: true }], 'beta')
      expect(channel).toBe('beta')
    })

    it('prerelease-no-channel', () => {
      const channel = adapter.getChannel([{ name: 'beta', prerelease: true, channel: '' }], 'beta')
      expect(channel).toBe('beta')
    })

    it('prerelease-branch', () => {
      const channel = adapter.getChannel([{ name: 'beta', prerelease: true, channel: 'beta' }], 'beta')
      expect(channel).toBe('beta')
    })

    it('prerelease-channel', () => {
      const channel = adapter.getChannel([{ name: 'beta', prerelease: true, channel: 'next' }], 'beta')
      expect(channel).toBe('next')
    })
  })

  describe('isPrerelease', () => {
    it('should return false if branch not found', () => {
      const branches = [
        { name: 'support', prerelease: false },
        'main',
        'next'
      ]
      const res = adapter.isPrerelease(branches, 'new-branch')
      expect(res).toBe(false)
    })

    it('should return false if branch found but not prerelease', () => {
      const branches = [
        { name: 'support', prerelease: false },
        'main',
        'next'
      ]
      const res = adapter.isPrerelease(branches, 'support')
      expect(res).toBe(false)
    })

    it('should return false if branch found, but it is just a string', () => {
      const branches = ['main']
      const res = adapter.isPrerelease(branches, 'main')
      expect(res).toBe(false)
    })

    it('should return true if branch found and it is prerelease', () => {
      const branches = [
        { name: 'support', prerelease: true },
        'main',
        'next'
      ]
      const res = adapter.isPrerelease(branches, 'support')
      expect(res).toBe(true)
    })
  })

  describe('isMinorMaintenance', () => {
    it('should return false if branch not found', () => {
      const branches = [
        { name: 'support', range: '1.x.x' },
        'main',
        'next'
      ]
      const res = adapter.isMinorMaintenance(branches, 'new-branch')
      expect(res).toBe(false)
    })

    it('should return false if branch found, but it is just a string', () => {
      const branches = ['main']
      const res = adapter.isMinorMaintenance(branches, 'main')
      expect(res).toBe(false)
    })

    it('should return false if branch found but not maintenance', () => {
      const branches = [
        { name: 'main' }
      ]
      const res = adapter.isMinorMaintenance(branches, 'main')
      expect(res).toBe(false)
    })

    it('should return false if branch is major maintenance', () => {
      const branches = [
        'main',
        '1.x.x'
      ]
      const res = adapter.isMinorMaintenance(branches, '1.x.x')
      expect(res).toBe(false)
    })

    it('should return false if branch is major maintenance w/ range', () => {
      const branches = [
        'main',
        {
          name: 'support',
          range: '1.x.x',
        }
      ]
      const res = adapter.isMinorMaintenance(branches, 'support')
      expect(res).toBe(false)
    })

    it('should return true if branch is minor maintenance', () => {
      const branches = [
        'main',
        '1.2.x'
      ]
      const res = adapter.isMinorMaintenance(branches, '1.2.x')
      expect(res).toBe(true)
    })

    it('should return true if branch is minor maintenance w/ range', () => {
      const branches = [
        'main',
        {
          name: 'support',
          range: '1.2.x',
        }
      ]
      const res = adapter.isMinorMaintenance(branches, 'support')
      expect(res).toBe(true)
    })
  })

  describe('fixPlugins', () => {
    it('should keep mandatory plugins', () => {
      const plugins = ['@semantic-release/commit-analyzer', '@semantic-release/release-notes-generator']

      const res = adapter.fixPlugins(plugins)

      expect(res).toEqual(plugins)
    })

    it('should discard unsupported default plugins', () => {
      const plugins = [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/npm',
        '@semantic-release/github'
      ]

      const res = adapter.fixPlugins(plugins)

      expect(res).toEqual([
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator'
      ])
    })

    it('should discard and warn about unsupported plugins', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
      })
      const plugins = [
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator',
        '@semantic-release/unsupported-plugin'
      ]

      const res = adapter.fixPlugins(plugins)

      expect(res).toEqual([
        '@semantic-release/commit-analyzer',
        '@semantic-release/release-notes-generator'
      ])
      expect(consoleWarnSpy).toHaveBeenCalledWith('Plugin "@semantic-release/unsupported-plugin" is not supported by in "release-gen" action, skipping it')
    })
  })

  describe('getGitTags', () => {
    it('should return single git tag for prerelease', async () => {
      const prerelease = true
      const minorMaintenance = false
      const tags = adapter.getGitTags('v1.0.0-alpha.1', prerelease, minorMaintenance)
      expect(tags).toEqual(['v1.0.0-alpha.1'])
    })

    it('should return two git tags for minor maintenance', async () => {
      const prerelease = false
      const minorMaintenance = true
      const tags = adapter.getGitTags('v1.2.1', prerelease, minorMaintenance)
      expect(tags).toEqual(['v1.2.1', 'v1.2'])
    })

    it('should return three git tags for regular release', async () => {
      const prerelease = false
      const minorMaintenance = false
      const tags = adapter.getGitTags('v1.2.3', prerelease, minorMaintenance)
      expect(tags).toEqual(['v1.2.3', 'v1.2', 'v1'])
    })
  })
})
