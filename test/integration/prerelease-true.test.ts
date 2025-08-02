import type { BranchSpec } from 'semantic-release'
import { afterEach, beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper, type Release } from './TestHelper.js'

const helper = new TestHelper('prerelease-true')

describe('prerelease-true', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('channel-default', async () => {
    const branch = 'next' // latest tag v2.4.0
    checkout(branch)
    commit('fix: test\nBREAKING CHANGE: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: branch,
      prerelease: true
    }]

    const release: Release = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v3.0.0-next.1')
    expect(release.channel).toBe('next')
    expect(release.gitTags).toEqual(['v3.0.0-next.1'])
    expect(release.tags).toEqual(['v3.0.0-next.1'])
  })

  it('channel-false', async () => {
    const branch = 'next' // latest tag v2.4.0
    checkout(branch)
    commit('fix: test\nBREAKING CHANGE: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: branch,
      prerelease: true,
      channel: false
    }]

    const release: Release = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v3.0.0-next.1')
    expect(release.channel).toBe('next')
    expect(release.gitTags).toEqual(['v3.0.0-next.1'])
    expect(release.tags).toEqual(['v3.0.0-next.1'])
  })

  it('channel-next', async () => {
    const branch = 'next' // latest tag v2.4.0
    checkout(branch)
    commit('fix: test\nBREAKING CHANGE: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: branch,
      prerelease: true,
      channel: 'next'
    }]

    const release: Release = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v3.0.0-next.1')
    expect(release.channel).toBe('next')
    expect(release.gitTags).toEqual(['v3.0.0-next.1'])
    expect(release.tags).toEqual(['v3.0.0-next.1', 'next'])
  })

  it('channel-beta', async () => {
    const branch = 'next' // latest tag v2.4.0
    checkout(branch)
    commit('fix: test\nBREAKING CHANGE: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: branch,
      prerelease: true,
      channel: 'beta'
    }]

    const release: Release = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v3.0.0-next.1')
    expect(release.channel).toBe('beta')
    expect(release.gitTags).toEqual(['v3.0.0-next.1', 'beta'])
    expect(release.tags).toEqual(['v3.0.0-next.1', 'beta'])
  })
})
