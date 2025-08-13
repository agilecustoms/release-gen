import { afterEach, beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { type Release, TestHelper } from './TestHelper.js'

const helper = new TestHelper('explicit-version')

describe('explicit-version', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  describe('no floating tags', () => {
    it('channel-empty', async () => {
      const branch = 'main'
      await checkout(branch)
      await commit('msg')

      const release: Release = await runReleaseGen({ version: '1.2.4', floatingTags: false })

      expect(release.version).toBe('1.2.4')
      expect(release.channel).toBe('latest')
      expect(release.gitTags).toEqual(['1.2.4'])
      expect(release.tags).toEqual(['1.2.4'])
    })
  })

  describe('floating tags', () => {
    it('channel-branch', async () => {
      const branch = 'main'
      await checkout(branch)
      await commit('msg')

      const release: Release = await runReleaseGen({ version: 'v2.0.0', floatingTags: true, releaseChannel: 'main' })

      expect(release.version).toBe('v2.0.0')
      expect(release.channel).toBe('main')
      expect(release.gitTags).toEqual(['v2.0.0', 'v2.0', 'v2'])
      expect(release.tags).toEqual(['v2.0.0', 'v2.0', 'v2', 'main'])
    })
  })
})
