import { beforeEach, describe, it, expect, vi } from 'vitest'
import { SemanticReleaseAdapter } from '../../src/service/SemanticReleaseAdapter.js'

describe('SemanticReleaseAdapter', () => {
  const adapter = new SemanticReleaseAdapter()

  beforeEach(() => {
    vi.clearAllMocks()
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
})
