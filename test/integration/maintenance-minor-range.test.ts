import type { BranchSpec } from 'semantic-release'
import { afterEach, beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { type Release, TestHelper } from './TestHelper.js'

const helper = new TestHelper('maintenance-minor-range')

describe('maintenance-minor-range', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('channel-default', async () => {
    await checkout('1.2.x') // latest tag v1.2.1
    await commit('fix: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.2.x',
      range: '1.2.x',
    }]

    const release: Release = await runReleaseGen({ releaseBranches })

    expect(release.version).toBe('v1.2.2')
    expect(release.channel).toBe('1.2.x')
    expect(release.gitTags).toEqual(['v1.2.2', 'v1.2'])
    expect(release.tags).toEqual(['v1.2.2', 'v1.2'])
  })

  it('channel-false', async () => {
    await checkout('1.2.x') // latest tag v1.2.1
    await commit('fix: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.2.x',
      range: '1.2.x',
      channel: false
    }]

    const release: Release = await runReleaseGen({ releaseBranches })

    expect(release.version).toBe('v1.2.2')
    expect(release.channel).toBe('1.2.x')
    expect(release.gitTags).toEqual(['v1.2.2', 'v1.2'])
    expect(release.tags).toEqual(['v1.2.2', 'v1.2'])
  })

  it('channel-branch', async () => {
    await checkout('1.2.x') // latest tag v1.2.1
    await commit('fix: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.2.x',
      range: '1.2.x',
      channel: '1.2.x'
    }]

    const release: Release = await runReleaseGen({ releaseBranches })

    expect(release.version).toBe('v1.2.2')
    expect(release.channel).toBe('1.2.x')
    expect(release.gitTags).toEqual(['v1.2.2', 'v1.2'])
    expect(release.tags).toEqual(['v1.2.2', 'v1.2', '1.2.x'])
  })

  it('channel-custom', async () => {
    await checkout('1.2.x') // latest tag v1.2.1
    await commit('fix: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.2.x',
      range: '1.2.x',
      channel: 'legacy'
    }]

    const release: Release = await runReleaseGen({ releaseBranches })

    expect(release.version).toBe('v1.2.2')
    expect(release.channel).toBe('legacy')
    expect(release.gitTags).toEqual(['v1.2.2', 'v1.2', 'legacy'])
    expect(release.tags).toEqual(['v1.2.2', 'v1.2', 'legacy'])
  })
})
