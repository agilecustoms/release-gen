import type { PluginSpec } from 'semantic-release'
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

      expect(res).toEqual([
        [
          '@semantic-release/commit-analyzer',
          {
            preset: 'conventionalcommits',
          }
        ],
        [
          '@semantic-release/release-notes-generator',
          {
            preset: 'conventionalcommits',
          }
        ]
      ])
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
        [
          '@semantic-release/commit-analyzer',
          {
            preset: 'conventionalcommits',
          },
        ],
        [
          '@semantic-release/release-notes-generator',
          {
            preset: 'conventionalcommits',
          },
        ]
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
        [
          '@semantic-release/commit-analyzer',
          {
            preset: 'conventionalcommits',
          },
        ],
        [
          '@semantic-release/release-notes-generator',
          {
            preset: 'conventionalcommits',
          },
        ]
      ])
      expect(consoleWarnSpy).toHaveBeenCalledWith('Plugin "@semantic-release/unsupported-plugin" is not supported by in "release-gen" action, skipping it')
    })

    it('should set preset if not specified', () => {
      const plugins = [['@semantic-release/commit-analyzer', { }] as PluginSpec]

      const res = adapter.fixPlugins(plugins)

      expect(res).toEqual([
        [
          '@semantic-release/commit-analyzer',
          {
            preset: 'conventionalcommits',
          },
        ]
      ])
    })

    it('should error out if unsupported present specified', () => {
      const plugins = [['@semantic-release/commit-analyzer', { preset: 'angular' }] as PluginSpec]

      expect(() => adapter.fixPlugins(plugins))
        .toThrow(`Starting from v4 (Feb 1, 2026) only "conventionalcommits" preset supported. Encountered "angular"`)
    })
  })
})
