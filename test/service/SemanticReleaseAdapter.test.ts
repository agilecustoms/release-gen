import { beforeEach, describe, it, expect, vi } from 'vitest'
import { SemanticReleaseAdapter } from '../../src/service/SemanticReleaseAdapter.js'

describe('SemanticReleaseAdapter', () => {
  const adapter = new SemanticReleaseAdapter()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findBranch', () => {
    it('should throw error if branch not found', () => {
      const branches = ['main', 'develop']
      const branch = 'feature'

      expect(() => adapter.findBranch(branches, branch))
        .toThrow(`Branch "${branch}" not found in branches: ["main","develop"]`)
    })

    it('should find branch represented as string', () => {
      const branches = ['main', 'develop']
      const branch = 'main'

      const res = adapter.findBranch(branches, branch)

      expect(res).toEqual({ name: 'main' })
    })

    it('should find branch represented as object', () => {
      const branches = [{ name: 'main' }, { name: 'develop' }]
      const branch = 'develop'

      const res = adapter.findBranch(branches, branch)

      expect(res).toEqual({ name: 'develop' })
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
})
