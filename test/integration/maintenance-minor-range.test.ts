import type { BranchSpec } from 'semantic-release'
import { afterEach, beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper, TIMEOUT } from './TestHelper.js'

const helper = new TestHelper('maintenance-minor-range')

describe('maintenance-minor-range', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('maintenance-minor-range', async () => {
    const branch = '1.2.x' // latest tag v1.2.1
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.2.x',
      range: '1.2.x',
    }]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v1.2.2')
    expect(release.channel).toBeUndefined()
    expect(release.gitTags).toEqual(['v1.2.2', 'v1.2'])
    expect(release.tags).toEqual(['v1.2.2', 'v1.2'])
  }, TIMEOUT)

  it('maintenance-minor-range-channel', async () => {
    const branch = '1.2.x' // latest tag v1.2.1
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.2.x',
      range: '1.2.x',
      channel: '1.2.x'
    }]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v1.2.2')
    expect(release.channel).toBe('1.2.x')
    expect(release.gitTags).toEqual(['v1.2.2', 'v1.2'])
    expect(release.tags).toEqual(['v1.2.2', 'v1.2', '1.2.x'])
  }, TIMEOUT)

  it('maintenance-minor-range-channel2', async () => {
    const branch = '1.2.x' // latest tag v1.2.1
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = ['main', {
      name: '1.2.x',
      range: '1.2.x',
      channel: 'legacy'
    }]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v1.2.2')
    expect(release.channel).toBe('legacy')
    expect(release.gitTags).toEqual(['v1.2.2', 'v1.2', 'legacy'])
    expect(release.tags).toEqual(['v1.2.2', 'v1.2', 'legacy'])
  }, TIMEOUT)
})
