import type { BranchSpec } from 'semantic-release'
import { beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper, TIMEOUT, type TheNextRelease } from './TestHelper.js'

const helper = new TestHelper('main')

describe('main', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))

  const checkout = helper.checkout.bind(helper)
  const commit = helper.commit.bind(helper)
  const runReleaseGen = helper.runReleaseGen.bind(helper)

  it('main-default-channel', async () => {
    const branch = 'int-test050' // here 'int-test050' plays a role of 'main' branch
    checkout(branch)
    commit('fix: test')

    const release: TheNextRelease = await runReleaseGen(branch)

    expect(release.version).toBe('v0.5.1')
    expect(release.channel).toBe('latest')
    expect(release.gitTags).toEqual(['v0.5.1', 'v0.5', 'v0', 'latest'])
    expect(release.tags).toEqual(['v0.5.1', 'v0.5', 'v0', 'latest'])
  }, TIMEOUT)

  it('main-no-channel', async () => {
    const branch = 'int-test050' // here 'int-test050' plays a role of 'main' branch
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = [
      {
        name: branch,
        channel: ''
      }
    ]

    const release: TheNextRelease = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v0.5.1')
    expect(release.channel).toBeUndefined()
    expect(release.gitTags).toEqual(['v0.5.1', 'v0.5', 'v0'])
    expect(release.tags).toEqual(['v0.5.1', 'v0.5', 'v0'])
  }, TIMEOUT)

  it('main-branch-channel', async () => {
    const branch = 'int-test050' // here 'int-test050' plays a role of 'main' branch
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = [
      {
        name: branch,
        channel: branch
      }
    ]

    const release: TheNextRelease = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v0.5.1')
    expect(release.channel).toBe(branch)
    expect(release.gitTags).toEqual(['v0.5.1', 'v0.5', 'v0'])
    expect(release.tags).toEqual(['v0.5.1', 'v0.5', 'v0', branch])
  }, TIMEOUT)

  it('main-channel', async () => {
    const branch = 'int-test050' // here 'int-test050' plays a role of 'main' branch
    checkout(branch)
    commit('fix: test')
    const releaseBranches: BranchSpec[] = [
      {
        name: branch,
        channel: 'release'
      }
    ]

    const release: TheNextRelease = await runReleaseGen(branch, { releaseBranches })

    expect(release.version).toBe('v0.5.1')
    expect(release.channel).toBe('release')
    expect(release.gitTags).toEqual(['v0.5.1', 'v0.5', 'v0', 'release'])
    expect(release.tags).toEqual(['v0.5.1', 'v0.5', 'v0', 'release'])
  }, TIMEOUT)
})
