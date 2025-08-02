import type { BranchSpec } from 'semantic-release'
import { afterEach, beforeAll, beforeEach, expect, describe, it } from 'vitest'
import { TestHelper, type Release } from './TestHelper.js'

const helper = new TestHelper('main')

describe('main', () => {
  beforeAll(helper.beforeAll.bind(helper))
  beforeEach(helper.beforeEach.bind(helper))
  afterEach(helper.afterEach.bind(helper))

  const runFix = helper.runFix.bind(helper)

  it('channel-default', async () => {
    const branch = 'int-test050' // here 'int-test050' plays a role of 'main' branch

    const release: Release = await runFix(branch)

    expect(release.version).toBe('v0.5.1')
    expect(release.channel).toBe('latest')
    expect(release.gitTags).toEqual(['v0.5.1', 'v0.5', 'v0', 'latest'])
    expect(release.tags).toEqual(['v0.5.1', 'v0.5', 'v0', 'latest'])
  })

  it('channel-false', async () => {
    const branch = 'int-test050' // here 'int-test050' plays a role of 'main' branch
    const releaseBranches: BranchSpec = {
      name: branch,
      channel: false // same effect as ''
    }

    const release: Release = await runFix(branch, { releaseBranches })

    expect(release.version).toBe('v0.5.1')
    expect(release.channel).toBe('latest')
    expect(release.gitTags).toEqual(['v0.5.1', 'v0.5', 'v0'])
    expect(release.tags).toEqual(['v0.5.1', 'v0.5', 'v0'])
  })

  it('channel-branch', async () => {
    const branch = 'int-test050' // here 'int-test050' plays a role of 'main' branch
    const releaseBranches: BranchSpec = {
      name: branch,
      channel: branch
    }

    const release: Release = await runFix(branch, { releaseBranches })

    expect(release.version).toBe('v0.5.1')
    expect(release.channel).toBe(branch)
    expect(release.gitTags).toEqual(['v0.5.1', 'v0.5', 'v0'])
    expect(release.tags).toEqual(['v0.5.1', 'v0.5', 'v0', branch])
  })

  it('channel-custom', async () => {
    const branch = 'int-test050' // here 'int-test050' plays a role of 'main' branch
    const releaseBranches: BranchSpec = {
      name: branch,
      channel: 'release'
    }

    const release: Release = await runFix(branch, { releaseBranches })

    expect(release.version).toBe('v0.5.1')
    expect(release.channel).toBe('release')
    expect(release.gitTags).toEqual(['v0.5.1', 'v0.5', 'v0', 'release'])
    expect(release.tags).toEqual(['v0.5.1', 'v0.5', 'v0', 'release'])
  })
})
