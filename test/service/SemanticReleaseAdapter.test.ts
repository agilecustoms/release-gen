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
})
