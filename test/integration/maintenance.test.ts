import type { BranchSpec } from 'semantic-release'
import { beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper } from './TestHelper.js'

const TIMEOUT = 120_000 // 2 min

const helper = new TestHelper('maintenance')

describe('maintenance', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('maintenance-patch', async () => {
    const branch = '1.x.x' // latest tag v1.2.0
    checkout(branch)
    commit('fix: test')
    const releaseBranches = [
      'main',
      branch
    ]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.channel).toBe(branch)
    expect(release.gitTag).toBe('v1.2.1')
    expect(release.gitTags).toEqual(['v1.2.1', 'v1.2', 'v1'])
  }, TIMEOUT)

  it('maintenance-minor', async () => {
    const branch = '1.x.x' // latest tag v1.2.0
    checkout(branch)
    commit('feat: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: '1.x.x', // if `name` was say "legacy", then `range` would matter
        range: '1.x.x',
        channel: 'legacy'
      }
    ]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.channel).toBe('legacy')
    expect(release.gitTag).toBe('v1.3.0')
    expect(release.gitTags).toEqual(['v1.3.0', 'v1.3', 'v1'])
  }, TIMEOUT)

  it('maintenance-minor-range', async () => {
    const branch = '1.x.x' // latest tag v1.2.0
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = [
      'main',
      {
        name: '1.x.x',
        range: '1.2.x',
        channel: 'legacy'
      }
    ]

    const release = await runReleaseGen(branch, { releaseBranches })

    expect(release.channel).toBe('legacy')
    expect(release.gitTag).toBe('v1.2.1')
    expect(release.gitTags).toEqual(['v1.2.1', 'v1.2'])
  }, TIMEOUT)
})
